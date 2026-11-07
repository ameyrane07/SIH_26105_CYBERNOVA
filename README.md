# CYBERNOVA — AI-Powered Continuous Cyber Risk Quantification & Investment Optimization Platform

**Smart India Hackathon 2026**  
**Problem Statement ID:** 26105  
**Theme:** Blockchain and Cybersecurity  
**Category:** Software  
**Team:** CYBERNOVA  

---

## 1. Executive Summary & Objective

Modern enterprises struggle to articulate cyber risk to boardrooms and regulators using subjective qualitative labels ("Low", "Medium", "High"). These ratings fail to provide the quantitative financial context CFOs and risk committees need to assess if capital allocation is effective or legally defensible. Furthermore, point-in-time annual audits leave organizations blind to technical drift between review cycles.

**CYBERNOVA** delivers continuous, actuarial-grade Cyber Risk Quantification (CRQ). The platform ingests enterprise telemetry, maps lateral movement exposure, converts technical vulnerabilities into financial Annualized Loss Expectancy (ALE) and Value-at-Risk (VaR) under the Open FAIR framework, and applies Mixed-Integer Linear Programming (MILP) to solve the 0/1 knapsack optimization problem—guaranteeing every rupee invested maximizes provable risk reduction under statutory compliance mandates (RBI CSCRF & DPDP Act 2023).

---

## 2. Platform Architecture & Features

### Core Actuarial & Optimization Engine (Production Ready)

* **Open FAIR Standard Actuarial Modeling:** Translates raw CVSS v3/v4 telemetry, exploit availability, asset criticalities, and control coverage into per-asset Annualized Loss Expectancy ($\text{ALE} = \text{Threat Event Frequency} \times \text{Vulnerability} \times \text{Loss Magnitude}$).
* **Loss Breakdown Decomposition:** Isolates loss exposure across three primary cost centers:
  * Primary operational business interruption & downtime cost.
  * Statutory regulatory fines (RBI CSCRF Annex-1, DPDP Act 2023 Section 8).
  * Secondary incident response, customer notification, and digital forensics.
* **10,000-Iteration Monte Carlo VaR Simulation:** Runs stochastic iterations (Poisson arrival frequency $\times$ Beta-PERT severity distribution) to compute empirical loss exceedance curves, determining 95% and 99% Value-at-Risk ($\text{VaR}$).
* **Google OR-Tools Capital Allocation (0/1 Knapsack):** Solves capital budget optimization via Mixed-Integer Linear Programming, outputting mathematically optimal remediation sets that maximize cumulative ALE saved under a finite capital ceiling.
* **Gordon-Loeb Investment Frontiers:** Automatically sweeps budgets from ₹0 to the entire remediation backlog, visualizing the diminishing-returns curve and the point of economic optimality.
* **Attack Topology & Blast Radius Engine:** Models enterprise network segmentation (Edge/DMZ, Application Tier, Database Vaults, IAM) using NetworkX graph traversal with Neo4j persistence drivers, identifying lateral pivot chains and crown-jewel chokepoints.
* **Dual-Tier AI Decision Support:**
  * **Primary (Edge Inference):** Local quantized execution via Ollama (`llama3.2:3b`), keeping sensitive asset exposures on-premises with zero telemetry leakage.
  * **Secondary (Cloud Resiliency):** Google Gemini 3.8-Flash fallback for high-throughput board brief generation.
* **Regulatory Compliance Auditing:** Real-time tracking of unfunded Tier-1 core assets against RBI CSCRF Annex-1 safeguards and Section 8 DPDP statutory liabilities.
* **Enterprise Reporting Suite:** In-memory client-side generation of executive `.csv` ledgers and multi-tab `.xlsx` workbooks containing allocation matrices, residual exposure, and audit trails.

---

## 3. Technology Stack

| Architectural Layer | Technology | Implementation Details |
| :--- | :--- | :--- |
| **Frontend Platform** | Next.js 15 (React 19, TypeScript) | App Router, SSR-safe hydration, Tailwind CSS, Recharts analytics, SheetJS |
| **Edge API Gateway** | Node.js Runtime | Next.js reverse-proxy routing `/api/*` workloads to Python compute engines |
| **Backend & Compute** | FastAPI (Python 3.12+) | Asynchronous ASGI actuarial microservice running on Uvicorn |
| **Mathematical Solvers** | Google OR-Tools & SciPy | Mixed-Integer Linear Programming (MILP) solving constrained 0/1 knapsacks |
| **Stochastic Simulation** | NumPy & pandas | 10,000-sample Poisson / Beta-PERT Monte Carlo distribution engine |
| **Graph Topology** | NetworkX & Neo4j | Multi-tier lateral movement traversals and crown-jewel path persistence |
| **Data Layer** | PostgreSQL / TimescaleDB & SQLite | Resilient dual-driver setup (TimescaleDB in production, SQLite in local dev) |
| **Task Queues** | Celery + Redis | Asynchronous job dispatching for heavy multi-asset Monte Carlo batches |
| **Generative Intelligence** | Ollama (`llama3.2:3b`) & Gemini 3.8 | Local on-premise SLM inference backed by resilient cloud fallback |
| **Deployment & IaC** | Docker & Docker Compose | Multi-stage image packaging for single-command enterprise deployments |

---

## 4. System Pipeline & Data Flow

```text
  Enterprise CMDB / Vulnerability Scans (CSV / Excel)
                         │
                         ▼
             [ Node.js API Gateway ]
          (Next.js App Router / Port 3000)
                         │
                         ▼
        [ FastAPI Risk Compute Service ] (Port 8000)
                         │
    ┌────────────────────┼─────────────────────┐
    ▼                    ▼                     ▼
[ Actuarial Engine ]  [ Topology Engine ]  [ Task Broker ]
   (OpenFAIR ALE)      (NetworkX / Neo4j)  (Celery + Redis)
    │                    │                     │
    ├────────────────────┘                     ▼
    ▼                                 [ Monte Carlo VaR ]
[ OR-Tools MILP Knapsack ]           (10,000 Iterations)
    │                                          │
    └────────────────────┬─────────────────────┘
                         ▼
            [ Compliance & Audit Layer ]
             (RBI CSCRF & DPDP Act 2023)
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[ TimescaleDB / SQLite ]        [ Local LLM Service ]
 (Telemetry & Historical)     (Ollama: Llama-3.2 3B)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
    [ Next.js 15 Executive C-Suite Dashboard ]
  (Risk Frontiers, Attack Graphs & Board Briefs)

```

---

## 5. Local Setup & Execution Guide

The platform is designed with a **Resilient Fallback Architecture**: it runs instantly in local development on native SQLite and in-memory NetworkX engines without demanding external infrastructure, while remaining fully wired to scale to TimescaleDB, Neo4j, Redis, and Celery in production.

### Prerequisites

* **Node.js:** v18.17+ or v20+
* **Python:** 3.10 to 3.12
* **Ollama (Optional for offline AI):** Configured with `ollama pull llama3.2:3b`

---

### Step 1: Backend Setup

1. Open a terminal and navigate to the backend directory:
```bash
cd backend

```


2. Create and activate a virtual environment:
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

```


3. Install dependencies:
```bash
python -m pip install -r requirements.txt

```


4. Configure your environment file (`backend/.env`):
```env
DATABASE_URL=sqlite:///./cybernova.db
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
GEMINI_API_KEY=your_gemini_api_key_here

```


5. Start the backend service:
```bash
python -m uvicorn main:app --reload --port 8000

```


*The backend will automatically initialize `cybernova.db` and report active driver connections.*

---

### Step 2: Frontend Setup

1. Open a second terminal and navigate to the frontend directory:
```bash
cd frontend

```


2. Install frontend packages:
```bash
npm install

```


3. Launch the development server:
```bash
npm run dev

```


4. Access the dashboard at **`http://localhost:3000`**.
*All `/api/*` network requests are automatically reverse-proxied by Next.js to FastAPI on port 8000.*

---

## 6. Enterprise Container Deployment (Single-Command)

CYBERNOVA includes container manifests matching Slide 3 specifications for enterprise production environments:

```bash
# From the project root directory
docker compose up --build

```

This launches the full stack:

* **`cybernova_timescaledb`** — Port `5432` (Relational schemas & telemetry history)
* **`cybernova_neo4j`** — Ports `7474`, `7687` (Lateral movement attack graphs)
* **`cybernova_redis`** — Port `6379` (In-memory message broker)
* **`cybernova_celery`** — Background worker handling Monte Carlo runs
* **`cybernova_backend`** — Port `8000` (FastAPI actuarial engine)
* **`cybernova_frontend`** — Port `3000` (Next.js 15 App Router production server)

---

## 7. Compliance Verification & Test Data

A production-representative scan containing 15 multi-tier BFSI assets is provided at `backend/sample_scan.csv`.

* **Tier-1 Critical Infrastructure:** Swift Gateways, Core Banking DBs, and Production Kubernetes Clusters.
* **Tier-2 Business Operations:** Customer NetBanking Portals and Payment APIs.
* **Tier-3 Internal Services:** Employee HR Portals and Staging CI/CD pipelines.

Uploading this dataset validates the end-to-end pipeline: triggering attack topology generation, 10,000-run Monte Carlo simulations, budget constraint optimization, RBI CSCRF statutory compliance alerts, and natural language executive briefings.

```

```
