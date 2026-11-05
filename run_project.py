"""Run all project stages in sequence. Use this after installing requirements."""
import sys
from pathlib import Path
import pandas as pd
from src.data_pipeline import audit, clean_data, validate
from src.customer_models import rfm_and_segments, build_lapse_model
from src.triage import run_pipeline, FEW, ZERO
from src.policy_rag import PolicyRAG, evaluate, compare_chunking
from src.refund_agent import run_agent

def main():
    fresh = "--fresh" in sys.argv

    print("\n=== PART A: AUDIT / CLEAN / VALIDATE ===")
    audit(); clean_data(); validate()

    print("\n=== PART B: SEGMENTS & LAPSE MODEL ===")
    rfm, diagnostics, profile, pca = rfm_and_segments()
    print("K-means diagnostics:\n", diagnostics.to_string(index=False))
    print("Segment profile:\n", profile.to_string(index=False))
    print("PCA explained variance:", pca)

    seg_map = dict(zip(profile["segment_id"], profile["segment_name"]))
    print("Segment mapping (segment_id -> segment_name):", seg_map)

    lapse_res = build_lapse_model()
    print("\nLapse model summary (Base rate: {:.2%}):".format(lapse_res.get("base_rate", 0.3836)))
    for model_name, m_info in lapse_res["models"].items():
        print(f"  Model: {model_name.upper()} | Best Params: {m_info['best_params']} | CV F1: {m_info['cv_f1']:.4f} | Test F1: {m_info['f1']:.4f}")
        ranking = m_info.get("ranking", {})
        if ranking:
            print(f"    Precision@10: {ranking.get('precision@10')} (Lift: {ranking.get('lift@10')}x) | "
                  f"Precision@25: {ranking.get('precision@25')} (Lift: {ranking.get('lift@25')}x) | "
                  f"Precision@50: {ranking.get('precision@50')} (Lift: {ranking.get('lift@50')}x)")

    print("\n=== PART C: PRIVACY GUARDRAILS & TRIAGE ===")
    t_raw = pd.read_csv(Path(__file__).resolve().parent / "data/raw/tickets.csv", keep_default_na=False)
    has_labels = "true_category" in t_raw.columns

    df_few, summary_few = run_pipeline(prompt=FEW, token_budget=100000)
    df_zero, summary_zero = run_pipeline(prompt=ZERO, token_budget=100000)

    all_statuses = sorted(set(summary_few["status_counts"].keys()) | set(summary_zero["status_counts"].keys()))
    comp_rows = []
    for st in all_statuses:
        comp_rows.append({
            "status": st,
            "zero_shot_count": summary_zero["status_counts"].get(st, 0),
            "few_shot_count": summary_few["status_counts"].get(st, 0),
        })
    df_status_comp = pd.DataFrame(comp_rows)
    print("\nTriage status_counts (Zero-Shot vs Few-Shot):")
    print(df_status_comp.to_string(index=False))

    if has_labels:
        df_zero["true_category"] = t_raw["true_category"]
        df_few["true_category"] = t_raw["true_category"]
        acc_zero_all = (df_zero["category"] == df_zero["true_category"]).mean()
        acc_few_all = (df_few["category"] == df_few["true_category"]).mean()
        valid = t_raw["true_category"] != "none"
        acc_zero_labeled = (df_zero.loc[valid, "category"] == df_zero.loc[valid, "true_category"]).mean()
        acc_few_labeled = (df_few.loc[valid, "category"] == df_few.loc[valid, "true_category"]).mean()
        acc_df = pd.DataFrame([
            {"subset": "All tickets (164)", "zero_shot_accuracy": f"{acc_zero_all:.2%}", "few_shot_accuracy": f"{acc_few_all:.2%}"},
            {"subset": "Valid labeled tickets (160)", "zero_shot_accuracy": f"{acc_zero_labeled:.2%}", "few_shot_accuracy": f"{acc_few_labeled:.2%}"},
        ])
        print("\nTriage accuracy comparison (Zero-Shot vs Few-Shot):")
        print(acc_df.to_string(index=False))

    print("\n=== PART D: POLICY RAG & REFUND AGENT ===")
    rag = PolicyRAG()
    print("chunks:", len(rag.chunks))
    print(evaluate(rag).to_string(index=False))
    print("\nChunking strategy comparison:\n", compare_chunking().to_string(index=False))

    if fresh:
        root_dir = Path(__file__).resolve().parent
        ledger = root_dir / "outputs" / "refund_ledger.jsonl"
        if ledger.exists():
            ledger.unlink()
            print("\n[--fresh] Removed existing outputs/refund_ledger.jsonl")
        state_dir = root_dir / "state"
        if state_dir.exists():
            count = 0
            for f in state_dir.glob("*.json"):
                f.unlink()
                count += 1
            print(f"[--fresh] Cleared {count} checkpoint files in state/")

    print("\nRunning Refund Agent Scenarios:")
    print("1. Eligible auto-refund (ORD-100048):", run_agent("Please refund order ORD-100048", scenario_id="cli-auto"))
    print("2. Idempotent re-refund (ORD-100048):", run_agent("Please refund order ORD-100048", scenario_id="cli-idempotent"))
    print("3. High-value escalation (ORD-100145):", run_agent("Please refund order ORD-100145", scenario_id="cli-escalate"))
    print("4. Idempotent escalation (ORD-100145):", run_agent("Please refund order ORD-100145", scenario_id="cli-escalate-idempotent"))
    print("5. Ineligible on-time delivery (ORD-100008):", run_agent("Please refund order ORD-100008", scenario_id="cli-denied"))

    print("\nProject pipeline finished. Review outputs/ and data/instamart.db.")

if __name__ == "__main__":
    main()
