# Instamart Customer Intelligence & Support Copilot

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![SQLite3](https://img.shields.io/badge/Database-SQLite3-003B57.svg)](https://www.sqlite.org/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, full-stack Machine Learning and Agentic AI Copilot designed for an on-demand quick-commerce delivery platform (Instamart-style). This capstone project integrates automated data audit and cleaning pipelines, relational SQLite analytics, RFM customer segmentation with K-Means and PCA, leakage-free customer lapse prediction, privacy-first support ticket triage with PII guardrails, TF-IDF Retrieval-Augmented Generation (RAG) over company policy documents, and a bounded ReAct autonomous refund agent backed by SQLite and transaction ledger auditing.

---

## Table of Contents
1. [Project Overview & Architecture](#project-overview--architecture)
2. [Repository Structure](#repository-structure)
3. [Branch Organization](#branch-organization)
4. [Methodology by Component](#methodology-by-component)
   - [Part A: Data Preparation, Audit & SQLite Persistence](#part-a-data-preparation-audit--sqlite-persistence)
   - [Part B: Customer Segmentation & Churn Analysis](#part-b-customer-segmentation--churn-analysis)
   - [Part C: Privacy Guardrails & Support Ticket Triage](#part-c-privacy-guardrails--support-ticket-triage)
   - [Part D: Policy RAG Assistant & Bounded ReAct Refund Agent](#part-d-policy-rag-assistant--bounded-react-refund-agent)
5. [FastAPI Backend & React Frontend Interface](#fastapi-backend--react-frontend-interface)
6. [Empirical Results & Benchmark Findings](#empirical-results--benchmark-findings)
7. [Quickstart & Execution Guide](#quickstart--execution-guide)
8. [Submission & Verification Checklist](#submission--verification-checklist)

---

## Project Overview & Architecture

Modern quick-commerce requires ultra-fast operations while maintaining strict data governance, financial bounding, and customer retention strategies. This project delivers an offline, fully reproducible AI copilot that solves four operational challenges:

```
+-------------------------------------------------------------------------------------------------------+
|                                    Instamart Support Copilot Architecture                            |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [Part A: Data Foundation]                                                                           |
|  generate_data.py  ──>  data/raw/*.csv  ──>  src/data_pipeline.py  ──>  data/instamart.db (SQLite)    |
|                                                                                                       |
|  [Part B: Customer Intelligence]                                                                      |
|  data/instamart.db ──> RFM Features ──> K-Means Clustering (K=4) + PCA ──> outputs/customer_segments |
|                    ──> Temporal Split (< Sep 2025) ──> Random Forest Lapse Model ──> lapse_model.joblib|
|                                                                                                       |
|  [Part C: Privacy Guardrails & Triage]                                                               |
|  Customer Ticket ──> Token Ceiling + PII Masking ([EMAIL], [PHONE], [ORD]) ──> Retry / Classification|
|                  ──> Output JSON Schema Validation ──> Departmental Routing (Security/Premium/Support)|
|                                                                                                       |
|  [Part D: RAG Policy & Autonomous Refund Agent]                                                      |
|  Policies (*.txt) ──> Word Chunking (40w, 10w overlap) ──> TF-IDF Retriever ──> Grounded QA          |
|  Refund Query     ──> ReAct Tool Loop (get_order, search_policy, calculate_refund, issue_refund)      |
|                   ──> State Checkpoint (state/*.json) + Ledger (outputs/refund_ledger.jsonl)         |
|                                                                                                       |
|  [Full-Stack Layer]                                                                                   |
|  FastAPI Backend (backend/api.py :8000) <═══ REST API / CORS ═══> React 18 + Vite UI (frontend/ :5173)|
+-------------------------------------------------------------------------------------------------------+
```

---

## Repository Structure

```text
instamart_customer_copilot_teaching_kit/
├── .gitignore                   # Excludes virtual environments, caches, DB, node_modules, and state
├── generate_data.py             # Deterministic synthetic data generator (seed 42)
├── GITHUB_RESOURCES.md          # Pedagogical curriculum and live-coding reference links
├── mock_llm.py                  # Offline deterministic mock LLM (chat classification, RAG, ReAct agent)
├── README.md                    # Comprehensive project documentation (this document)
├── requirements.txt             # Pinned core Python dependencies
├── run_project.py               # Top-level CLI orchestrator executing Parts A through D
├── SETUP_REQUIREMENTS.md        # Comprehensive environment audit and clean-machine installation guide
├── backend/                     # FastAPI REST API Service
│   ├── api.py                   # REST endpoints connecting React frontend to Python pipelines
│   └── requirements-api.txt     # Backend dependencies (fastapi, uvicorn)
├── frontend/                    # Modern React 18 + Vite Web Interface
│   ├── package.json             # NPM dependencies (React 18, Recharts, Lucide Icons)
│   ├── vite.config.js           # Vite dev server configuration with API proxy to port 8000
│   ├── index.html               # Frontend HTML root
│   └── src/
│       ├── App.jsx              # Tabbed UI (Overview, Segments, Guardrails, Policy RAG, Agent, SQL)
│       ├── main.jsx             # React DOM entrypoint
│       └── styles.css           # Custom styling and responsive layout
├── notebooks/
│   └── Customer_Intelligence_Support_Copilot.ipynb  # Interactive classroom notebook
├── sql/
│   └── queries.sql              # 7 SQL reference queries on data/instamart.db
├── src/                         # Core Machine Learning & Pipeline Modules
│   ├── __init__.py              # Python package marker
│   ├── customer_models.py       # RFM segmentation (K-Means, PCA) & leakage-aware lapse model
│   ├── data_pipeline.py         # Audit, clean, validate, and load SQLite database
│   ├── policy_rag.py            # Text chunking, TF-IDF vectorization, retrieval & evaluation
│   ├── refund_agent.py          # Bounded ReAct refund agent, SQLite tools, and JSONL ledger
│   └── triage.py                # Regex PII redaction, token guardrails, and queue routing
└── [Generated at Runtime]
    ├── data/
    │   ├── raw/                 # Generated raw CSVs & policy files
    │   ├── clean/               # Cleaned trusted CSVs
    │   ├── policies/            # Company policy text files
    │   └── instamart.db         # Persistent SQLite analytical database
    ├── outputs/                 # Artifacts: customer_segments.csv, lapse_model.joblib, etc.
    └── state/                   # Agent state checkpoints (*.json)
```

---

## Branch Organization

In accordance with capstone submission standards, the repository maintains dedicated branches representing each milestone:

| Branch Name | Primary Milestone Focus | Key Modules / Artifacts |
| :--- | :--- | :--- |
| **`main`** | Complete Unified Production System | Full-stack solution: Parts A–D, FastAPI backend, React UI, tests, documentation |
| **`part-a-data-prep`** | Data Generation, Audit, Cleaning & SQLite | `generate_data.py`, `src/data_pipeline.py`, `sql/queries.sql`, `data/instamart.db` |
| **`part-b-segmentation`** | Customer RFM, K-Means Clustering & Lapse Model | `src/customer_models.py`, `outputs/customer_segments.csv`, `outputs/lapse_model.joblib` |
| **`part-c-guardrails`** | PII Redaction, Token Guardrails & Ticket Triage | `src/triage.py`, `mock_llm.py`, `outputs/triage_results.csv` |
| **`part-d-rag-agent`** | Policy RAG, ReAct Refund Agent & Full-Stack UI | `src/policy_rag.py`, `src/refund_agent.py`, `backend/`, `frontend/`, `run_project.py` |

---

## Methodology by Component

### Part A: Data Preparation, Audit & SQLite Persistence
- **Raw Data Generation:** Deterministic generation (`random.Random(42)`) creating:
  - `customers.csv` (1,200 rows): Demographics, signup dates, mangled casing, and missing values.
  - `products.csv` (40 rows): Product catalogue across 5 categories with INR pricing.
  - `orders.csv` (13,084 raw rows): Poisson order rate simulation with deliberate real-world anomalies.
  - `tickets.csv` (164 rows): Real-world customer complaint templates with embedded PII.
- **Data Audit & Invariant Assertions:**
  - Detected 119 exact duplicates and 656 pending orders. Resolved order state duplication by sorting on timestamp and keeping the latest final status.
  - Imputed 120 missing/invalid order amounts using catalogue price $\times$ quantity $\times (1 - \text{discount})$.
  - Imputed completed order delivery times with product category medians; preserved null delivery times on cancelled orders.
  - Standardized customer city names across 6 target metros and gender categories into `male`, `female`, and `unknown`.
  - Imputed customer age outliers ($<10$ or $>100$) using city median ages.
- **Relational Load & SQL Queries:** Clean tables persisted into `data/instamart.db`. Formatted 7 benchmark SQL queries (`sql/queries.sql`) covering aggregations, joins, subqueries, CTEs, and ranking window functions (`RANK()`, `DENSE_RANK()`, `ROW_NUMBER()`, cumulative daily revenue sums).

### Part B: Customer Segmentation & Churn Analysis
- **RFM Feature Extraction:** Calculated snapshot Recency (days elapsed from last completed order to 2025-10-01), Frequency (count of completed orders), and Monetary spend (sum of completed order value).
- **Standardization & Clustering:** Standardized features with `StandardScaler`. Fitted K-Means across $K \in [2, 8]$, logging inertia and silhouette scores. Selected **$K=4$** based on peak silhouette score (0.526).
- **Segment Profiling:**
  - `0` - **Regular** (436 customers): Recency ~28.9 days, Frequency ~3.8 orders, Spend ~₹1,058.
  - `1` - **Premium** (138 customers): Recency ~24.1 days, Frequency ~6.8 orders, Spend ~₹7,130.
  - `2` - **Frequent** (419 customers): Recency ~8.8 days, Frequency ~19.4 orders, Spend ~₹3,410.
  - `3` - **At Risk** (182 customers): Recency ~109.0 days, Frequency ~2.2 orders, Spend ~₹686.
- **PCA Decomposition:** Demonstrated that 2 principal components capture **85.23%** of total RFM feature variance.
- **Leakage-Aware Lapse Model:**
  - Feature window strictly before `2025-09-01`.
  - Label window evaluates September 2025: Lapsed ($y=1$) if zero completed orders in September (38.3% lapse rate).
  - Preprocessing pipeline (`ColumnTransformer`) fitted exclusively on training rows.
  - 5-fold Stratified GridSearchCV comparing Logistic Regression and Random Forest Classifier (`outputs/lapse_model.joblib`).
  - Generated targeted intervention list for top at-risk premium customers (`outputs/retention_list.csv`).

### Part C: Privacy Guardrails & Support Ticket Triage
- **Token Guardrails:** Rejects empty/whitespace-only tickets and halts tickets exceeding token ceilings before reaching the language model.
- **PII Scrubbing:** Three-stage regex redaction masking:
  - Email addresses $\to$ `[EMAIL]`
  - Indian 10-digit mobile numbers $\to$ `[PHONE]`
  - Order numbers $\to$ `[ORDER_ID]`
  - Confirmed zero residual PII leakage with post-redaction assertion checks.
- **Transient Fault Tolerance:** Exponential backoff retry handler with random jitter to gracefully manage simulated 503 transient errors.
- **Classification & Validation:** Evaluated few-shot prompting with strict JSON parsing and deterministic keyword fallback.
- **Policy Routing:**
  - Guardrail flags / exhausted budget $\to$ `human_review` (NORMAL priority).
  - Fraud or unauthorized transaction $\to$ `security_team` (HIGH priority, overrides customer tier).
  - Premium customer tier $\to$ `premium_desk` (HIGH priority).
  - General customer inquiry $\to$ `support_queue` (NORMAL priority).

### Part D: Policy RAG Assistant & Bounded ReAct Refund Agent
- **Chunking Strategy:** Fixed-size sliding window (40 words per chunk, 10-word overlap) across 5 company policies (`refund_policy.txt`, `delivery_policy.txt`, `payment_policy.txt`, `privacy_policy.txt`, `escalation_policy.txt`), generating 15 semantic chunks.
- **Vector Space Retrieval:** In-memory Scikit-learn `TfidfVectorizer` with cosine similarity ranking.
- **Evaluation Benchmark:** Evaluated against 14 benchmark questions (`data/raw/policy_eval.csv`):
  - **100%** relevant document retrieval (12/12 policy questions).
  - **100%** fact extraction accuracy (12/12 policy questions).
  - **100%** correct fallback on out-of-scope questions (2/2 ungrounded queries).
- **Autonomous Bounded ReAct Agent:**
  - Implements 5 bounded tools: `get_order`, `search_policy`, `calculate_refund`, `issue_refund`, and `escalate_to_human`.
  - Strict business constraints: Orders delivered in $\le 45$ minutes are denied refunds; completed orders delivered in $> 45$ minutes receive a full refund; refunds $\le 1000$ INR are automatically issued; refunds $> 1000$ INR escalate to a human lead.
  - Guardrails: Maximum 6 iterations, 6,000 token limit, 10-second wall-clock timeout with graceful fallback.
  - Persists intermediate execution states to `state/<run_id>.json` and appends immutable transactions to `outputs/refund_ledger.jsonl`.

---

## FastAPI Backend & React Frontend Interface

The system includes a production-style decoupled full-stack architecture:

### 1. FastAPI REST API Service (`backend/api.py`)
- **Port:** `8000`
- **Key Endpoints:**
  - `GET /api/overview`: Health status and database table counts.
  - `GET /api/tables` & `POST /api/sql`: Live read-only SQL explorer.
  - `GET /api/segments` & `GET /api/lapse`: Model metrics, silhouette analysis, and cluster tables.
  - `POST /api/triage/check` & `POST /api/triage/run`: Interactive PII mask inspector and batch triage runner.
  - `POST /api/policy/ask` & `GET /api/policy/eval`: Policy RAG Q&A and evaluation table.
  - `POST /api/refund` & `GET /api/refund/ledger`: Live ReAct agent execution and audit ledger viewer.

### 2. React 18 Web Dashboard (`frontend/`)
- Built with **React 18**, **Vite**, **Recharts**, and **Lucide Icons**.
- **Interactive Views:**
  1. *Overview Dashboard*: System readiness checks, database table row counts.
  2. *Customer Segments*: Dynamic line charts for K-Means inertia and silhouette scores, segment profiles, and lapse model evaluation.
  3. *Privacy Guardrails*: Live ticket input tester showing masked PII chips, token usage counters, and zero/few-shot batch triage tables.
  4. *Policy Assistant*: RAG search interface displaying answers, source document badges, and retrieved context chunks with similarity scores.
  5. *Refund Agent*: Step-by-step visual trace of agent thought loops, tool invocations, inputs/outputs, final verdict cards, and live audit ledger.
  6. *SQL Explorer*: Interactive query editor pre-populated with example queries from `sql/queries.sql`.

---

## Empirical Results & Benchmark Findings

### 1. K-Means Diagnostics ($K \in [2, 8]$)

| Clusters ($K$) | Inertia | Silhouette Score | Evaluation |
| :---: | :---: | :---: | :--- |
| 2 | 1,820.76 | 0.465 | Under-segmented |
| 3 | 1,268.23 | 0.445 | Sub-optimal boundaries |
| **4** | **743.07** | **0.526** | **Optimal Elbow & Peak Silhouette** |
| 5 | 617.37 | 0.480 | Cluster fragmentation |
| 6 | 503.17 | 0.482 | Diminishing returns |
| 7 | 408.46 | 0.416 | Over-segmented |
| 8 | 366.50 | 0.412 | Poor cluster separation |

### 2. Customer Lapse Prediction Benchmark

Test Set Base Rate: **38.36%** (89 / 232 test customers lapsed).

| Model | Hyperparameters | 5-Fold CV F1 | Test Precision | Test Recall | Test F1 Score |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Baseline (Majority Class) | – | – | 0.000 | 0.000 | 0.000 |
| Logistic Regression | $C = 100$ | 0.6506 | 0.6444 | 0.6517 | **0.6480** |
| **Random Forest** | `max_depth=8`, `min_samples_leaf=10` | **0.6866** | 0.6333 | 0.6404 | **0.6369** |

#### Top-K Ranking & Lift Metrics:

| Model | Precision@10 | Lift@10 | Precision@25 | Lift@25 | Precision@50 | Lift@50 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | **0.9000** (9/10) | **2.35x** | **0.7600** (19/25) | **1.98x** | **0.6400** (32/50) | **1.67x** |
| **Random Forest** | **0.7000** (7/10) | **1.82x** | **0.6800** (17/25) | **1.77x** | **0.6800** (34/50) | **1.77x** |

> **Retention List Construction:** Top 10 high-value customers from the `Premium` segment (Cluster 1) ranked in descending order of predicted lapse probability $P(\text{lapse}=1 \mid X)$ using the tuned Random Forest model (`outputs/retention_list.csv`).

### 3. Support Ticket Triage Distribution & Accuracy (164 Tickets)

#### Status Distribution (Zero-Shot vs Few-Shot):
| Pipeline Status | Zero-Shot Count | Few-Shot Count | Description |
| :--- | :---: | :---: | :--- |
| `classified_json` | 135 | 135 | Successfully classified via LLM JSON output |
| `classified_keyword` | 12 | 12 | Regex/keyword fallback after invalid LLM response |
| `flagged_invalid_output` | 9 | 9 | Exhausted retry budget; routed to human review |
| `flagged_long` | 4 | 4 | Exceeded 400 token ceiling; routed to human review |
| `skipped_empty` | 4 | 4 | Empty or whitespace-only input |
| **Total Processed** | **164** | **164** | **278 PII redactions applied** |

#### Classification Accuracy Comparison:
| Evaluation Subset | Zero-Shot Accuracy | Few-Shot Accuracy | Absolute Improvement |
| :--- | :---: | :---: | :---: |
| **All Tickets (164)** | 76.83% | **89.63%** | **+12.80%** |
| **Valid Labeled Tickets (160)** | 78.75% | **91.88%** | **+13.13%** |

### 4. Policy RAG Evaluation & Chunking Comparison (14 Questions)

| Benchmark Metric | Target Standard | Achieved Score | Status |
| :--- | :---: | :---: | :---: |
| Expected Document Retrieval Rate | $\ge 90\%$ | **100.0% (12/12)** | PASSED |
| Expected Fact Extraction Rate | $\ge 90\%$ | **100.0% (12/12)** | PASSED |
| Out-of-Scope Fallback Handling | $100\%$ | **100.0% (2/2)** | PASSED |

#### Chunking Strategy Parameter Comparison (`compare_chunking()`):
| Chunk Size (words) | Overlap (words) | Chunk Count | Retrieval Rate | Fact Extraction Rate |
| :---: | :---: | :---: | :---: | :---: |
| 20 | 5 | 31 | 1.000 | 0.833 |
| **40** | **10** | **15** | **1.000** | **1.000** |
| 80 | 20 | 8 | 1.000 | 1.000 |
| 120 | 30 | 5 | 1.000 | 1.000 |

---

## Quickstart & Execution Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm (for running the React frontend)
- Git

### 1. Environment Setup

```bash
# Clone repository
git clone <repo-url>
cd instamart_customer_copilot_teaching_kit

# Create and activate Python virtual environment
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

# Install core dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Run Data Generation & Full Pipeline

```bash
# Step 1: Generate synthetic raw data and policy documents
python generate_data.py

# Step 2: Execute all pipeline phases (Parts A through D)
python run_project.py
```

### 3. Launch FastAPI Backend Service

```bash
# Run backend from the repository root
python -m uvicorn backend.api:app --reload --port 8000
```
*API docs available at: `http://localhost:8000/docs`*

### 4. Launch React Frontend UI

In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Open your browser at: `http://localhost:5173`*

### 5. Running the Jupyter Notebook

```bash
# Launch interactive instructional notebook
jupyter notebook notebooks/Customer_Intelligence_Support_Copilot.ipynb
```

---

## Submission & Verification Checklist

- [x] **Part A (Data Preparation & SQLite):** Raw synthetic data generated, audited, cleaned, assertions validated, and stored in `data/instamart.db`. 7 SQL queries verified.
- [x] **Part B (Customer Segmentation & Churn):** RFM calculated, standardized, K-Means fitted for $K \in [2, 8]$, $K=4$ proven optimal via silhouette curve, PCA variance computed, leakage-free lapse model trained and saved to `outputs/lapse_model.joblib`.
- [x] **Part C (Guardrails & Triage):** Empty tickets skipped, overlong tickets blocked, PII (email, phone, order ID) masked with zero leakage, few-shot prompt triage executed, business routing rules verified.
- [x] **Part D (Policy RAG & Refund Agent):** Policy text chunked with sliding window, TF-IDF retriever built, grounded Q&A evaluated at 100% accuracy, bounded ReAct refund agent tested across auto-refund, escalation, and denied scenarios.
- [x] **Full-Stack Integration:** FastAPI endpoints operational, React 18 UI built with Vite, Recharts, and Lucide Icons.
- [x] **Clean Repository & Branches:** Git branches configured for `part-a-data-prep`, `part-b-segmentation`, `part-c-guardrails`, `part-d-rag-agent`, and `main`. Unnecessary files (`node_modules`, caches, `.env`) safely excluded in `.gitignore`.
- [x] **Documentation:** Thorough, reproducible `README.md` and environment audit guide (`SETUP_REQUIREMENTS.md`).
