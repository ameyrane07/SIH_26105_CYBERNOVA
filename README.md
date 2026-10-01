# CYBERNOVA — AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform

**Smart India Hackathon 2026**

**Problem Statement ID:** 26105

**Theme:** Blockchain and Cybersecurity

**Category:** Software

**Team:** CYBERNOVA

---

### 1. Objective

Enterprises today communicate cyber risk using subjective ratings — "Low," "Medium," "High" — that give boards, CFOs, and regulators no real financial context to judge whether security spending is adequate or well allocated. Most risk assessments are also periodic and manual, leaving organizations blind to their real-time exposure between review cycles.

CYBERNOVA replaces this with a platform that continuously converts technical vulnerability data into monetary risk — Annualized Loss Expectancy (ALE) and Value-at-Risk (VaR) — and mathematically optimizes security investment decisions under a real budget constraint, so every rupee spent goes where it provably reduces the most risk.

---

### 2. Features

#### Built and working (verified end-to-end)

* **Risk Quantification Engine** — converts CVSS severity, exploit availability, business criticality, and existing control effectiveness into per-asset Annualized Loss Expectancy, aligned with the Open FAIR actuarial standard.
* **AI/ML Risk Scoring (Zero-DLL Architecture)** — a real trained Logistic Regression model trained via gradient descent on empirical/synthetic security telemetry. To prevent native C-extension (`.pyd`/`.dll`) crashes caused by Windows Defender Application Control (WDAC/AppLocker) policies, the model parameters (weights, intercept, and normalization scalers) are exported to a structured JSON artifact (`model_weights.json`) and evaluated using a pure-Python sigmoid inference engine. It offers a learned likelihood estimate alongside the deterministic actuarial formula, toggleable per request with identical probability precision.
* **OpenFAIR Loss Decomposition** — breaks down each asset's estimated breach liability into downtime loss, statutory regulatory fines (DPDP Act / RBI CSCRF), and incident response cost.
* **Investment Optimization Module** — a true Mixed-Integer Linear Program (Google OR-Tools, 0/1 knapsack) that selects the exact combination of mitigations maximizing risk reduction under a hard budget constraint, with ROSI computed per option.
* **Investment vs. Risk Reduction Curve** — sweeps budget from ₹0 to the full remediation backlog, visualizing diminishing returns (Gordon-Loeb curve).
* **Monte Carlo VaR Simulation** — 10,000 simulated years (Poisson event frequency, Beta-PERT loss severity) producing Value-at-Risk at the 95th and 99th percentiles.
* **What-If Scenario Testing** — remediation-delay simulation, MFA/access-control hardening toggle, and configurable EDR/PAM/backup posture controls.
* **Continuous Risk Trend Tracking** — persistent database layer (SQLAlchemy with pure-Python C-extension bypass flags) storing every scan's results, visualized as a scan-by-scan exposure trend chart.
* **AI Decision Support — Natural Language Query** — a three-tier query system: local LLM inference (Ollama, `llama3.2:3b`) first, Google Gemini cloud fallback second, and a deterministic rule-based fallback third — hardened with an intelligent greeting filter so casual small-talk receives a natural introduction while technical questions return concise, direct financial metrics without truncation.
* **Compliance Readiness Scoring** — flags unfunded Tier-1 critical assets against the RBI Cyber Security Framework (CSCRF Annex-1) and computes a live readiness score.
* **Authentication & Access Control** — API key required on every functional endpoint; CORS restricted to the application's own frontend origin.
* **Multi-page Dashboard** — Overview & Optimization, Trends & Compliance, and AI Risk Query, each a focused view over the same live dataset.
* **Flexible Data Ingestion & Export** — accepts both CSV and Excel (`.xlsx`/`.xls`) vulnerability scan uploads, with automatic format detection (by file extension and file signature), delimiter auto-detection for CSVs, and automatic recovery from common paste/export formatting issues. Results can be exported back out as either a CSV or a multi-sheet Excel workbook (Executive Summary + Asset Allocations).

#### Planned next (roadmap, not yet built)

* Multi-source ingestion (SIEM / IAM / EDR feeds) beyond CSV/manual entry
* Full framework mapping (ISO/IEC 27001, NIST CSF, CIS Controls, SEBI CSCRF) — RBI mapping is live; the others are scoped but not wired in
* Account-based multi-tenancy (per-organization data isolation, real OAuth sign-in) — a login page exists as a first step toward this
* Distributed simulation workers (Celery + Redis) and a graph-based attack-path model (Neo4j / GNNs) for larger-scale deployments

---

### 3. Technology Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Recharts, lucide-react, SheetJS (xlsx) |
| **Backend** | FastAPI (Python 3.12+), Uvicorn |
| **Data Handling** | pandas, NumPy, openpyxl (Excel read support) |
| **Optimization** | Google OR-Tools (MILP / 0/1 knapsack) |
| **Machine Learning** | Pure-Python Logistic Regression Inference Engine (backed by offline-trained `model_weights.json` parameter artifacts; eliminates compiled binary `.pyd` dependencies) |
| **Simulation** | Monte Carlo (Poisson + Beta-PERT distributions, NumPy) |
| **Database** | SQLAlchemy (SQLite locally; PostgreSQL-compatible; configured with pure-Python C-extension bypass flags) |
| **AI Decision Support** | Ollama (local LLM inference, `llama3.2:3b`) → Google Gemini (cloud fallback) → deterministic rule-based fallback |
| **Auth** | API key middleware, restricted CORS |

**Why this stack:** For the prototype stage, we prioritized proving the core financial-risk model and optimization logic were mathematically sound and enterprise-deployable before investing in heavier infrastructure. By decoupling the machine learning model training from runtime inference and exporting parameters into JSON, we completely eliminated binary execution blocks enforced by Windows Defender Application Control (WDAC/AppLocker) policies on corporate endpoints. FastAPI and Python keep the API layer and the actuarial computation in one unified environment with zero serialization overhead. Heavier infrastructure named in our original architecture proposal (dedicated API gateway, Celery/Redis job queues, Neo4j graph modeling) remains our target for a larger-scale deployment, but was deliberately deferred in favor of functional stability and depth achievable within the hackathon timeline.

---

### 4. System Architecture

```text
CSV / Excel Upload or CMDB Telemetry
        │
        ▼
Risk Quantification Engine  ──► Annualized Loss Expectancy (Deterministic or Pure-Python ML Scored)
        │
        ▼
Investment Optimization Module (OR-Tools MILP)  ──► Funded / Deferred allocation, ROSI %
        │
        ▼
Monte Carlo VaR Engine  ──► 95% & 99% Value-at-Risk, Tail Loss Distribution
        │
        ▼
Compliance Engine  ──► RBI CSCRF readiness score & Tier-1 deficit alerts
        │
        ▼
Database (SQLAlchemy)  ──► Persisted assets + scan history
        │
        ▼
Dashboard (React) ── Overview & Optimization | Trends & Compliance | AI Risk Query

```

The AI Risk Query panel sits alongside this pipeline, answering natural-language questions grounded in the same computed data (ALE, VaR, funded/deferred status, compliance score) via the three-tier cascade with automated greeting filtering.

---

### 5. Setup Instructions

#### Prerequisites

* Python 3.10+ (Recommended: Installed in a system directory like `C:\Python312` or `/usr/local/bin` to satisfy Windows WDAC policies)
* Node.js 18+ (required to run the Vite/React frontend build tooling)
* (Optional) Ollama installed locally with `llama3.2:3b` for offline LLM inference
* (Optional) A Google Gemini API key for cloud LLM fallback

#### Backend

```bash
cd backend
pip install -r requirements.txt

```

*(Optional: To retrain or recalibrate the ML model weights from `sample_scan.csv`, run: `python ml/train_model.py`)*

#### Environment variables (.env)

Create a file named `.env` inside the `backend/` folder — this file is not committed to the repository (it's excluded via `backend/.gitignore`), so each person running the project locally must create their own copy.

Copy the template below into `backend/.env`:

```env
DISABLE_SQLALCHEMY_CEXT=1
GEMINI_API_KEY=your_key_here

```

* `DISABLE_SQLALCHEMY_CEXT=1` ensures SQLAlchemy runs using pure Python, preventing native Cython `.pyd` blocks under strict Windows execution policies.
* Replace `your_key_here` with a real Google Gemini API key, obtained from Google AI Studio. If left blank, the system seamlessly falls back to local Ollama or the offline deterministic rule engine.

Run the server:

```bash
uvicorn main:app --reload --port 8000

```

A local SQLite database (`cybernova.db`) is created automatically on first run.

#### Frontend

```bash
cd frontend
npm install
npm run dev

```

The dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend on port 8000.

#### Authentication

All functional API endpoints require an `X-API-Key` header. The default development key (`cybernova-dev-key`) is pre-configured in the frontend to match the backend's default.

#### Sample Data

A sample vulnerability scan (`backend/sample_scan.csv`) with 15 realistic BFSI-sector assets is included for testing.

---

### 6. Current Implementation Status

This prototype implements the Risk Quantification Engine, Investment Optimization Module, and AI Decision Support Layer named in the problem statement, end-to-end and tested against a realistic sample dataset. Compliance mapping is live for the RBI Cyber Security Framework (CSCRF Annex-1), with other named frameworks (ISO 27001, NIST CSF, CIS Controls, SEBI CSCRF) scoped for the next phase. Multi-source streaming ingestion, full multi-tenant account isolation, and distributed/graph-based infrastructure remain roadmap items.

Every feature listed as "built and working" has been verified directly against the running application, including zero-DLL ML likelihood scoring, Windows WDAC compatibility, error handling for malformed scan formats, and synchronized execution of the knapsack optimizer, Monte Carlo simulator, database persistence, and resilient AI query pipeline.
