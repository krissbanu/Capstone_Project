import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, Users, ShieldCheck, BookOpen, ReceiptText, Database,
  Play, Loader2, CheckCircle2, CircleAlert,
} from "lucide-react";

/* ------------------------------------------------------------ api helper */
async function api(path, body) {
  const res = await fetch("/api" + path, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || res.statusText);
  return data;
}

/* a tiny hook: call fn(), track loading / error / data */
function useCall() {
  const [state, set] = useState({ loading: false, error: "", data: null });
  const run = async (fn) => {
    set({ loading: true, error: "", data: null });
    try { set({ loading: false, error: "", data: await fn() }); }
    catch (e) { set({ loading: false, error: e.message, data: null }); }
  };
  return [state, run];
}

/* ------------------------------------------------------------ small parts */
const fmt = (v) => {
  if (v === null || v === undefined) return "–";
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(3);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

function Panel({ title, note, actions, children }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {note && <p className="note">{note}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

function RunButton({ onClick, loading, children, quiet }) {
  return (
    <button className={quiet ? "btn quiet" : "btn"} onClick={onClick} disabled={loading}>
      {loading ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
      {children}
    </button>
  );
}

function ErrorNote({ message }) {
  if (!message) return null;
  return <div className="error"><CircleAlert size={18} /><span>{message}</span></div>;
}

function DataTable({ rows, columns, max = 100 }) {
  if (!rows || !rows.length) return <p className="empty">No rows to show.</p>;
  const cols = columns || Object.keys(rows[0]);
  const isArr = Array.isArray(rows[0]);
  return (
    <div className="tablewrap">
      <table>
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, max).map((r, i) => (
            <tr key={i}>{cols.map((c, j) => <td key={c + j}>{fmt(isArr ? r[j] : r[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* shows whatever shape the project code returns */
function Generic({ data }) {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data) && data.length && typeof data[0] === "object") return <DataTable rows={data} />;
  if (typeof data === "object") {
    return (
      <dl className="kv">
        {Object.entries(data).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{typeof v === "object" ? <pre>{JSON.stringify(v, null, 2)}</pre> : fmt(v)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p className="answer">{String(data)}</p>;
}

/* ------------------------------------------------------------ Overview */
function Overview() {
  const [s, run] = useCall();
  useEffect(() => { run(() => api("/overview")); }, []);
  const d = s.data;
  const ready = d ? d.checks.filter((c) => c.ok).length : 0;
  return (
    <>
      <div className="hero">
        <h1>Support Copilot</h1>
        <p>
          Check that your data and models are ready, then try each part from the menu.
          {d && <strong> {ready} of {d.checks.length} checks passed.</strong>}
        </p>
      </div>
      <ErrorNote message={s.error} />
      {d && (
        <div className="two">
          <Panel title="Pipeline status" note="Missing items show the command that creates them.">
            <ul className="checks">
              {d.checks.map((c) => (
                <li key={c.name} className={c.ok ? "ok" : "bad"}>
                  {c.ok ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
                  <span>{c.name}</span>
                  {!c.ok && <code>{c.hint}</code>}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Database tables" note="Read directly from data/instamart.db.">
            {d.tables.length
              ? <DataTable rows={d.tables} />
              : <p className="empty">The database has not been created yet.</p>}
          </Panel>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------ Segments */
const keyOf = (row, re) => Object.keys(row || {}).find((k) => re.test(k));

function KChart({ rows, re, label, color }) {
  const xk = keyOf(rows[0], /^k$|cluster/i);
  const yk = keyOf(rows[0], re);
  if (!xk || !yk) return null;
  return (
    <div className="chart">
      <h3>{label}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#dfe6df" vertical={false} />
          <XAxis dataKey={xk} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={52} domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey={yk} stroke={color} strokeWidth={2.5} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Segments() {
  const [seg, runSeg] = useCall();
  const [lap, runLap] = useCall();
  useEffect(() => { runSeg(() => api("/segments")); }, []);
  const d = seg.data;
  const diag = d?.diagnostics || [];
  const silKey = diag.length ? keyOf(diag[0], /sil/i) : null;
  const kKey = diag.length ? keyOf(diag[0], /^k$|cluster/i) : null;
  const best = silKey && kKey ? diag.reduce((a, b) => (b[silKey] > a[silKey] ? b : a)) : null;
  return (
    <>
      <div className="hero small">
        <h1>Customer segments</h1>
        <p>Customers grouped by recency, frequency and spend, using K-Means on standardized RFM values.</p>
      </div>
      {seg.loading && <p className="empty"><Loader2 size={16} className="spin" /> Fitting K-Means for K = 2 to 8…</p>}
      <ErrorNote message={seg.error} />
      {d && (
        <>
          <Panel
            title="Choosing the number of clusters"
            note="Inertia drops as K grows. The best K is the one with the highest silhouette score."
            actions={best && <span className="badge good">Best K = {best[kKey]} · silhouette {best[silKey].toFixed(3)}</span>}
          >
            {diag.length > 0 && (
              <div className="two">
                <KChart rows={diag} re={/inert/i} label="Inertia by K" color="#0f5b46" />
                <KChart rows={diag} re={/sil/i} label="Silhouette by K" color="#d98a00" />
              </div>
            )}
            <DataTable rows={diag} />
          </Panel>
          <div className="two">
            <Panel title="Segment profiles" note="Average RFM values for each segment.">
              <DataTable rows={d.profile} />
            </Panel>
            <Panel title="Customers per segment">
              <DataTable rows={d.counts} />
            </Panel>
          </div>
        </>
      )}
      <Panel
        title="Lapse (churn) model"
        note="Trains on orders before September 2025 and predicts who lapses in September. This can take a minute."
        actions={<RunButton onClick={() => runLap(() => api("/lapse"))} loading={lap.loading}>Train and evaluate</RunButton>}
      >
        <ErrorNote message={lap.error} />
        {lap.data && <Generic data={lap.data.result} />}
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------ Guardrails */
const PRESETS = [
  { label: "Empty ticket", text: "   " },
  { label: "Personal data", text: "Hi, my order ORD-100008 arrived late. Call me on 9876543210 or mail priya.sharma@example.com for the refund." },
  { label: "Very long ticket", text: "The delivery was late and the packaging was damaged. ".repeat(60) },
  { label: "Normal ticket", text: "My milk packet was leaking when it arrived. Please help." },
];

function Highlighted({ text }) {
  const parts = text.split(/(\[[A-Z_ ]+\]|<[A-Z_ ]+>)/g);
  return <p className="masked">{parts.map((p, i) => (/^(\[|<)[A-Z_ ]+(\]|>)$/.test(p) ? <mark key={i}>{p}</mark> : p))}</p>;
}

function Guardrails() {
  const [text, setText] = useState(PRESETS[1].text);
  const [chk, runChk] = useCall();
  const [batch, runBatch] = useCall();
  const [mode, setMode] = useState("few");
  const c = chk.data;
  return (
    <>
      <div className="hero small">
        <h1>Guardrails</h1>
        <p>Every ticket is checked before it can reach the model: empty tickets are skipped, long ones are blocked, and personal data is masked.</p>
      </div>
      <Panel title="Try a ticket" actions={<RunButton onClick={() => runChk(() => api("/triage/check", { text }))} loading={chk.loading}>Check ticket</RunButton>}>
        <div className="chips">
          {PRESETS.map((p) => <button key={p.label} className="chip" onClick={() => setText(p.text)}>{p.label}</button>)}
        </div>
        <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a customer ticket…" />
        <ErrorNote message={chk.error} />
        {c && (
          <div className="result">
            <div className="row">
              <span className={`badge ${c.status === "passed" ? "good" : c.status === "blocked" ? "bad" : "warn"}`}>
                {c.status === "passed" ? "Passed" : c.status === "blocked" ? "Blocked" : "Skipped"}
              </span>
              <span className="muted">{c.tokens} tokens of {c.limit} allowed</span>
            </div>
            {c.reason && <p>{c.reason}</p>}
            {c.masked !== undefined && (
              <>
                <h3>What the model receives</h3>
                <Highlighted text={c.masked} />
                <div className="row">
                  {Object.entries(c.found).map(([k, v]) => <span key={k} className="badge">{v} {k.replace("_", " ")} masked</span>)}
                  <span className={`badge ${c.leaked ? "bad" : "good"}`}>{c.leaked ? "Personal data still present" : "No personal data left"}</span>
                </div>
                <p className="muted">Masking by {c.masker}.</p>
              </>
            )}
          </div>
        )}
      </Panel>
      <Panel
        title="Zero-shot and few-shot triage"
        note="Runs the whole ticket file through the classifier with and without worked examples in the prompt."
        actions={
          <div className="row">
            <div className="seg">
              {["zero", "few"].map((m) => (
                <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m === "zero" ? "Zero-shot" : "Few-shot"}</button>
              ))}
            </div>
            <RunButton onClick={() => runBatch(() => api("/triage/run", { mode }))} loading={batch.loading}>Run</RunButton>
          </div>
        }
      >
        <ErrorNote message={batch.error} />
        {batch.data && (
          <>
            <Generic data={batch.data.summary} />
            <h3>First {Math.min(60, batch.data.total)} of {batch.data.total} tickets</h3>
            <DataTable rows={batch.data.rows} />
          </>
        )}
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------ Policy RAG */
const QUESTIONS = [
  "What delivery time makes a completed order eligible for a full refund?",
  "How are damaged items handled?",
  "When is a refund escalated to a human?",
];

function PolicyView({ res }) {
  if (!res || typeof res !== "object") return <Generic data={res} />;
  return (
    <div className="receipt">
      {res.answer && (
        <div className="verdict" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
          <span>Assistant answer</span>
          <p>{res.answer}</p>
        </div>
      )}
      {res.sources && res.sources.length > 0 && (
        <div className="row" style={{ marginTop: "14px" }}>
          <span className="muted" style={{ fontSize: "12.5px" }}>Sources:</span>
          {res.sources.map((s) => (
            <span key={s} className="badge good">{s}</span>
          ))}
        </div>
      )}
      {res.retrieved && res.retrieved.length > 0 && (
        <div style={{ marginTop: "18px" }}>
          <h3 style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>Retrieved Context Chunks</h3>
          <DataTable rows={res.retrieved} />
        </div>
      )}
    </div>
  );
}

function Policy() {
  const [q, setQ] = useState(QUESTIONS[0]);
  const [ans, runAns] = useCall();
  const [ev, runEv] = useCall();
  const [chk, runChk] = useCall();
  const ask = () => runAns(() => api("/policy/ask", { question: q }));
  return (
    <>
      <div className="hero small">
        <h1>Policy assistant</h1>
        <p>Ask a question and the assistant answers from the company policy documents, using TF-IDF retrieval over text chunks.</p>
      </div>
      <Panel title="Ask a question" actions={<RunButton onClick={ask} loading={ans.loading}>Ask</RunButton>}>
        <div className="chips">{QUESTIONS.map((x) => <button key={x} className="chip" onClick={() => setQ(x)}>{x}</button>)}</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
        <ErrorNote message={ans.error} />
        {ans.data && <div className="result"><PolicyView res={ans.data.result} /></div>}
      </Panel>
      <Panel
        title="Retrieval accuracy"
        note="Scores the retriever against the evaluation questions in data/raw/policy_eval.csv."
        actions={<RunButton quiet onClick={() => runEv(() => api("/policy/eval"))} loading={ev.loading}>Evaluate</RunButton>}
      >
        <ErrorNote message={ev.error} />
        {ev.data && <Generic data={ev.data.result} />}
      </Panel>
      <Panel
        title="Chunking strategy comparison"
        note="Compares retrieval and fact extraction rates across sliding window chunk sizes and overlaps."
        actions={<RunButton quiet onClick={() => runChk(() => api("/policy/chunking"))} loading={chk.loading}>Compare chunking</RunButton>}
      >
        <ErrorNote message={chk.error} />
        {chk.data && <DataTable rows={chk.data.result} />}
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------ Refund agent */
const stepKeys = ["trace", "steps", "history", "events", "messages", "tool_calls"];
const finalKeys = ["final", "answer", "final_answer", "decision", "outcome", "result", "message"];

function Step({ s, i }) {
  const isObj = s && typeof s === "object";
  const name = isObj ? (s.tool || s.action || s.name || s.role || `step ${i + 1}`) : `step ${i + 1}`;
  const rest = isObj ? Object.fromEntries(Object.entries(s).filter(([k]) => !["tool", "action", "name", "role"].includes(k))) : s;
  return (
    <li>
      <span className="dot" />
      <div>
        <div className="tool">{String(name)}</div>
        <pre>{typeof rest === "string" ? rest : JSON.stringify(rest, null, 2)}</pre>
      </div>
    </li>
  );
}

function RefundView({ res }) {
  if (res === null || res === undefined) return null;
  if (typeof res !== "object") return <p className="answer">{String(res)}</p>;
  const sk = stepKeys.find((k) => Array.isArray(res[k]));
  const fk = finalKeys.find((k) => typeof res[k] === "string");
  const scalars = Object.entries(res).filter(([k, v]) => k !== fk && v !== null && typeof v !== "object");
  return (
    <div className="receipt">
      <div className="receipt-top">
        <h3>Agent run</h3>
        <div className="row">{scalars.map(([k, v]) => <span key={k} className="badge">{k}: {fmt(v)}</span>)}</div>
      </div>
      {sk && <ol className="trace">{res[sk].map((s, i) => <Step key={i} s={s} i={i} />)}</ol>}
      {fk && <div className="verdict"><span>{fk}</span><p>{res[fk]}</p></div>}
      {!sk && !fk && <Generic data={res} />}
    </div>
  );
}

function Refund() {
  const [msg, setMsg] = useState("Please refund order ORD-100008");
  const [run, doRun] = useCall();
  const [led, doLed] = useCall();
  const go = async () => { await doRun(() => api("/refund", { message: msg })); doLed(() => api("/refund/ledger")); };
  useEffect(() => { doLed(() => api("/refund/ledger")); }, []);
  return (
    <>
      <div className="hero small">
        <h1>Refund agent</h1>
        <p>The agent looks up the order, checks policy, and works out the refund. Amounts up to ₹1,000 are issued automatically; larger ones go to a person.</p>
      </div>
      <Panel title="Refund request" actions={<RunButton onClick={go} loading={run.loading}>Run agent</RunButton>}>
        <div className="chips">
          {["Please refund order ORD-100008", "My order ORD-100020 was very late, can I get a refund?"].map((x) => (
            <button key={x} className="chip" onClick={() => setMsg(x)}>{x}</button>
          ))}
        </div>
        <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <ErrorNote message={run.error} />
        {run.data && <RefundView res={run.data.result} />}
      </Panel>
      <Panel title="Refund ledger" note="Latest entries from outputs/refund_ledger.jsonl.">
        {led.data && led.data.length ? <DataTable rows={led.data} /> : <p className="empty">No refunds recorded yet. Run the agent above.</p>}
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------ SQL explorer */
function SqlExplorer() {
  const [tables, runTables] = useCall();
  const [examples, runEx] = useCall();
  const [q, setQ] = useState("SELECT city, COUNT(*) AS customers\nFROM customers\nGROUP BY city\nORDER BY customers DESC;");
  const [res, runQ] = useCall();
  useEffect(() => { runTables(() => api("/tables")); runEx(() => api("/sql/examples")); }, []);
  const exec = () => runQ(() => api("/sql", { query: q }));
  return (
    <>
      <div className="hero small">
        <h1>SQL explorer</h1>
        <p>Query the cleaned database directly. It runs through Python's built-in SQLite, so nothing extra needs installing, and it is read-only.</p>
      </div>
      <div className="sqlgrid">
        <Panel title="Tables">
          <ErrorNote message={tables.error} />
          <ul className="tables">
            {(tables.data || []).map((t) => (
              <li key={t.name}>
                <button onClick={() => setQ(`SELECT * FROM ${t.name} LIMIT 20;`)}>{t.name}</button>
                <small>{t.columns.join(", ")}</small>
              </li>
            ))}
          </ul>
        </Panel>
        <div>
          <Panel title="Query" actions={<RunButton onClick={exec} loading={res.loading}>Run query</RunButton>}>
            {examples.data && examples.data.length > 0 && (
              <select onChange={(e) => e.target.value !== "" && setQ(examples.data[e.target.value].sql)} defaultValue="">
                <option value="" disabled>Load an example from sql/queries.sql…</option>
                {examples.data.map((x, i) => <option key={i} value={i}>{x.title}</option>)}
              </select>
            )}
            <textarea className="code" rows={7} value={q} onChange={(e) => setQ(e.target.value)} spellCheck={false} />
            <ErrorNote message={res.error} />
          </Panel>
          {res.data && (
            <Panel title={`Result · ${res.data.rows.length} rows`} note={res.data.truncated ? "Showing the first 500 rows." : undefined}>
              <DataTable rows={res.data.rows} columns={res.data.columns} max={500} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ shell */
const NAV = [
  ["overview", "Overview", LayoutDashboard, Overview],
  ["segments", "Segments", Users, Segments],
  ["guardrails", "Guardrails", ShieldCheck, Guardrails],
  ["policy", "Policy assistant", BookOpen, Policy],
  ["refund", "Refund agent", ReceiptText, Refund],
  ["sql", "SQL explorer", Database, SqlExplorer],
];

export default function App() {
  const [tab, setTab] = useState(() => location.hash.slice(1) || "overview");
  useEffect(() => { location.hash = tab; }, [tab]);
  const View = (NAV.find((n) => n[0] === tab) || NAV[0])[3];
  return (
    <div className="shell">
      <nav className="side">
        <div className="brand"><span className="mark" />Support Copilot</div>
        {NAV.map(([id, label, Icon]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <Icon size={18} />{label}
          </button>
        ))}
      </nav>
      <main><View /></main>
    </div>
  );
}
