"""FastAPI bridge between the React UI and the capstone project code.

Run from the PROJECT ROOT:
    uvicorn backend.api:app --reload --port 8000

SQLite note: everything here uses Python's built-in `sqlite3` module.
No SQLite CLI, driver, or server needs to be installed.
"""
import json
import math
import os
import re
import sqlite3
import sys
import uuid
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)  # project code uses relative paths such as data/raw
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = ROOT / "data" / "instamart.db"

app = FastAPI(title="Instamart Support Copilot API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- helpers
def clean(o):
    """Make any pandas / numpy / python object JSON-safe."""
    if isinstance(o, pd.DataFrame):
        return json.loads(o.to_json(orient="records"))
    if isinstance(o, pd.Series):
        return json.loads(o.to_json())
    if isinstance(o, np.ndarray):
        return clean(o.tolist())
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple, set)):
        return [clean(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (float, np.floating)):
        f = float(o)
        return None if math.isnan(f) or math.isinf(f) else f
    if isinstance(o, (str, bool, int)) or o is None:
        return o
    return str(o)


def guard(fn):
    """Run fn and turn any failure into a readable HTTP error."""
    try:
        return fn()
    except HTTPException:
        raise
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(
            500,
            f"{type(e).__name__}: {e}. Run `python generate_data.py` and "
            "`python run_project.py` from the project root first.",
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"{type(e).__name__}: {e}")


def db():
    if not DB_PATH.exists():
        raise HTTPException(
            404, "data/instamart.db not found. Run `python run_project.py` first."
        )
    # read-only connection: the UI can never modify the database
    con = sqlite3.connect(DB_PATH.resolve().as_uri() + "?mode=ro", uri=True)
    return con


def table_names(con):
    rows = con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    return [r[0] for r in rows]


# ---------------------------------------------------------------- overview
@app.get("/api/overview")
def overview():
    def go():
        checks = [
            ("Raw data", (ROOT / "data/raw/orders.csv").exists(), "python generate_data.py"),
            ("Policy documents", any((ROOT / "data/policies").glob("*.txt")) if (ROOT / "data/policies").exists() else False, "python generate_data.py"),
            ("Clean data", (ROOT / "data/clean").exists() and any((ROOT / "data/clean").glob("*.csv")), "python run_project.py"),
            ("SQLite database", DB_PATH.exists(), "python run_project.py"),
            ("Customer segments", (ROOT / "outputs/customer_segments.csv").exists(), "python run_project.py"),
            ("Lapse model", (ROOT / "outputs/lapse_model.joblib").exists(), "python run_project.py"),
        ]
        tables = []
        if DB_PATH.exists():
            con = db()
            try:
                for t in table_names(con):
                    n = con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
                    tables.append({"name": t, "rows": n})
            finally:
                con.close()
        return {
            "checks": [{"name": n, "ok": ok, "hint": h} for n, ok, h in checks],
            "tables": tables,
        }

    return guard(go)


# ---------------------------------------------------------------- SQL explorer
@app.get("/api/tables")
def tables():
    def go():
        con = db()
        try:
            out = []
            for t in table_names(con):
                cols = [c[1] for c in con.execute(f'PRAGMA table_info("{t}")').fetchall()]
                out.append({"name": t, "columns": cols})
            return out
        finally:
            con.close()

    return guard(go)


@app.get("/api/sql/examples")
def sql_examples():
    p = ROOT / "sql" / "queries.sql"
    if not p.exists():
        return []
    out = []
    for i, chunk in enumerate(p.read_text(encoding="utf-8").split(";"), 1):
        lines = chunk.strip().splitlines()
        if not any(l.strip() and not l.strip().startswith("--") for l in lines):
            continue
        title = next(
            (l.strip().lstrip("-").strip() for l in lines if l.strip().startswith("--")),
            f"Query {i}",
        )
        out.append({"title": title[:70] or f"Query {i}", "sql": "\n".join(lines).strip()})
    return out


class SqlReq(BaseModel):
    query: str


@app.post("/api/sql")
def run_sql(req: SqlReq):
    def go():
        q = re.sub(r"--[^\n]*", "", req.query).strip().rstrip(";").strip()
        if not q:
            raise HTTPException(400, "Type a query first.")
        if ";" in q:
            raise HTTPException(400, "Run one statement at a time.")
        if not re.match(r"(?is)^(select|with)\b", q):
            raise HTTPException(400, "Only SELECT queries are allowed here.")
        con = db()
        try:
            try:
                cur = con.execute(q)
            except sqlite3.Error as e:
                raise HTTPException(400, f"SQL error: {e}")
            cols = [d[0] for d in cur.description or []]
            rows = cur.fetchmany(501)
            truncated = len(rows) > 500
            return {"columns": cols, "rows": clean([list(r) for r in rows[:500]]), "truncated": truncated}
        finally:
            con.close()

    return guard(go)


# ---------------------------------------------------------------- Part B
@lru_cache(maxsize=1)
def _segments():
    from src.customer_models import rfm_and_segments

    return rfm_and_segments()


@app.get("/api/segments")
def segments():
    def go():
        rfm, diag, prof, pca = _segments()
        counts = []
        if isinstance(rfm, pd.DataFrame):
            col = "segment_name" if "segment_name" in rfm.columns else next((c for c in rfm.columns if "segment" in str(c).lower()), None)
            if col:
                counts = [{"segment": str(k), "customers": int(v)} for k, v in rfm[col].value_counts().items()]
        return {
            "diagnostics": clean(diag),
            "profile": clean(prof),
            "counts": counts,
            "pca": clean(pca),
        }

    return guard(go)


@lru_cache(maxsize=1)
def _lapse():
    from src.customer_models import build_lapse_model

    return build_lapse_model()


@app.get("/api/lapse")
def lapse():
    return guard(lambda: {"result": clean(_lapse())})


# ---------------------------------------------------------------- Part C
class TextReq(BaseModel):
    text: str = ""


EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)")
ORDER = re.compile(r"\bORD-\d+\b", re.I)


def _triage_module():
    try:
        import src.triage as t

        return t
    except Exception:  # noqa: BLE001
        return None


def _mask(text: str):
    """Use src.triage's redactor when one is found, else the same rules locally."""
    mod = _triage_module()
    if mod:
        for name in ("redact", "redact_pii", "mask_pii", "mask", "scrub"):
            fn = getattr(mod, name, None)
            if callable(fn):
                try:
                    out = fn(text)
                    if isinstance(out, str):
                        return out, f"src.triage.{name}"
                except Exception:  # noqa: BLE001
                    pass
    out = EMAIL.sub("[EMAIL]", text)
    out = ORDER.sub("[ORDER_ID]", out)
    out = PHONE.sub("[PHONE]", out)
    return out, "backend fallback"


@app.post("/api/triage/check")
def triage_check(req: TextReq):
    def go():
        text = req.text or ""
        mod = _triage_module()
        limit, limit_src = 200, "default"
        if mod:
            for name in ("MAX_TOKENS", "TOKEN_LIMIT", "MAX_INPUT_TOKENS"):
                if isinstance(getattr(mod, name, None), int):
                    limit, limit_src = getattr(mod, name), f"src.triage.{name}"
        tokens = len(re.findall(r"\w+|[^\w\s]", text))
        if not text.strip():
            return {"status": "skipped", "reason": "Empty or whitespace-only ticket. Nothing is sent to the model.", "tokens": 0, "limit": limit}
        if tokens > limit:
            return {"status": "blocked", "reason": f"Ticket has about {tokens} tokens, over the {limit} limit. It never reaches the model.", "tokens": tokens, "limit": limit}
        masked, source = _mask(text)
        found = {
            "email": len(EMAIL.findall(text)),
            "phone": len(PHONE.findall(text)),
            "order_id": len(ORDER.findall(text)),
        }
        leaked = bool(EMAIL.search(masked) or PHONE.search(masked) or ORDER.search(masked))
        return {
            "status": "passed", "masked": masked, "found": found, "leaked": leaked,
            "tokens": tokens, "limit": limit, "limit_source": limit_src, "masker": source,
        }

    return guard(go)


class ModeReq(BaseModel):
    mode: str = "few"


@lru_cache(maxsize=4)
def _triage_run(mode: str):
    mod = _triage_module()
    if mod is None:
        raise HTTPException(500, "Could not import src/triage.py")
    arg = getattr(mod, "FEW" if mode == "few" else "ZERO", None)
    if arg is None:
        raise HTTPException(400, f"src/triage.py has no {'FEW' if mode == 'few' else 'ZERO'} constant.")
    return mod.run_pipeline(arg)


@app.post("/api/triage/run")
def triage_run(req: ModeReq):
    def go():
        results, summary = _triage_run(req.mode)
        return {"summary": clean(summary), "rows": clean(results.head(60)), "total": int(len(results))}

    return guard(go)


# ---------------------------------------------------------------- Part D
@lru_cache(maxsize=1)
def _rag():
    from src.policy_rag import PolicyRAG

    return PolicyRAG()


class QuestionReq(BaseModel):
    question: str


@app.post("/api/policy/ask")
def policy_ask(req: QuestionReq):
    if not req.question.strip():
        raise HTTPException(400, "Ask a question first.")
    return guard(lambda: {"result": clean(_rag().answer(req.question))})


@app.get("/api/policy/eval")
def policy_eval():
    def go():
        from src.policy_rag import evaluate

        return {"result": clean(evaluate(_rag()))}

    return guard(go)


@app.get("/api/policy/chunking")
def policy_chunking():
    def go():
        from src.policy_rag import compare_chunking

        return {"result": clean(compare_chunking())}

    return guard(go)


class RefundReq(BaseModel):
    message: str
    scenario_id: str | None = None


@app.post("/api/refund")
def refund(req: RefundReq):
    if not req.message.strip():
        raise HTTPException(400, "Describe the refund request first.")

    def go():
        from src.refund_agent import run_agent

        sid = req.scenario_id or f"ui-{uuid.uuid4().hex[:6]}"
        return {"scenario_id": sid, "result": clean(run_agent(req.message, scenario_id=sid))}

    return guard(go)


@app.get("/api/refund/ledger")
def ledger():
    p = ROOT / "outputs" / "refund_ledger.jsonl"
    if not p.exists():
        return []
    rows = []
    for line in p.read_text(encoding="utf-8").splitlines()[-20:]:
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return clean(rows[::-1])
