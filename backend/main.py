import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from fastapi import FastAPI, UploadFile, File, Form, Request, Body, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import pandas as pd
import numpy as np
import io
from typing import Optional, Dict, Any, List

from database import get_db, engine, Base
from models import Scan, Asset, AssetSnapshot, NetworkEdge
from engine.ingestion import parse_and_model_risk, parse_uploaded_dataset
from engine.optimizer import run_knapsack_optimizer
from engine.simulator import run_monte_carlo_var
from engine.compliance import evaluate_compliance_readiness
from engine.topology import AttackTopologyEngine
from nl_query import answer_risk_query
from auth import verify_api_key

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CyberNova Enterprise Risk Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

topology_engine = AttackTopologyEngine()

LATEST_DATA: Dict[str, Any] = {
    "df_modeled": None,
    "last_result": None,
    "last_topology": None
}

def generate_curve_points(df_modeled: pd.DataFrame, steps: int = 10):
    total_cost = float(df_modeled["Mitigation_Cost_INR"].sum())
    step_size = max(total_cost / max(steps, 1), 10000.0)
    
    points = []
    current_budget = 0.0
    while current_budget <= total_cost + step_size:
        _, spent, saved, residual = run_knapsack_optimizer(df_modeled, current_budget)
        points.append({
            "budget": float(current_budget),
            "spent": float(spent),
            "risk_reduced": float(saved),
            "risk_reduction": float(saved),
            "saved": float(saved),
            "residual": float(residual),
            "residual_risk": float(residual)
        })
        current_budget += step_size
    return points

@app.get("/")
def health_check():
    return {
        "status": "online", 
        "system": "CyberNova Continuous Cyber Risk Quantification Platform",
        "version": "2.0.0"
    }

@app.post("/api/optimize")
async def optimize_portfolio(
    file: UploadFile = File(...),
    cmdb_file: Optional[UploadFile] = File(None),
    budget: float = Form(...),
    delay_days: int = Form(0),
    mfa_boost: bool = Form(False),
    use_ml_scoring: bool = Form(False),
    edr_rate: float = Form(0.85),
    pam_active: bool = Form(False),
    backups_active: bool = Form(False),
    ingestion_mode: str = Form("unified"),
    _: str = Depends(verify_api_key)
):
    content = await file.read()
    df_raw = parse_uploaded_dataset(content, file.filename or "upload.csv")
    
    # Handle Enterprise Split Mode (Vulnerability Scan + CMDB Register)
    if ingestion_mode == "split" and cmdb_file is not None:
        cmdb_content = await cmdb_file.read()
        df_cmdb = parse_uploaded_dataset(cmdb_content, cmdb_file.filename or "cmdb.csv")
        
        join_key = "Asset" if "Asset" in df_raw.columns and "Asset" in df_cmdb.columns else "Asset_ID"
        if join_key in df_raw.columns and join_key in df_cmdb.columns:
            df_raw = pd.merge(df_raw, df_cmdb, on=join_key, how="inner", suffixes=('', '_cmdb'))
            for col in ["Asset_Value_INR", "Mitigation_Cost_INR", "Business_Criticality"]:
                if f"{col}_cmdb" in df_raw.columns:
                    df_raw[col] = df_raw[f"{col}_cmdb"].combine_first(df_raw[col])
                    df_raw.drop(columns=[f"{col}_cmdb"], inplace=True)

    # Dynamic Control Posture Synthesis
    if "Control_Efficacy" in df_raw.columns:
        base_efficacy = df_raw["Control_Efficacy"].astype(float)
        scaled_efficacy = base_efficacy * (0.6 + 0.4 * (edr_rate / 1.0))
        if pam_active:
            scaled_efficacy += 0.08
        if backups_active:
            scaled_efficacy += 0.06
        df_raw["Control_Efficacy"] = np.clip(scaled_efficacy, 0.10, 0.98)

    # 1. Ingestion & baseline loss modeling
    df_modeled = parse_and_model_risk(
        df_raw, 
        delay_days=delay_days,
        mfa_boost=mfa_boost,
        use_ml_scoring=use_ml_scoring
    )
    LATEST_DATA["df_modeled"] = df_modeled.copy()
    
    # 2. Knapsack capital allocation optimization (Google OR-Tools)
    df_res, spent, saved, residual = run_knapsack_optimizer(df_modeled, budget)

    # 3. OpenFAIR Granular Loss Magnitude Breakdown
    records = df_res.to_dict(orient="records")
    for r in records:
        val = float(r.get("Asset_Value_INR", 1000000))
        tier = str(r.get("Business_Criticality", "Tier-2"))
        
        downtime_hours = 36 if tier == "Tier-1" else (18 if tier == "Tier-2" else 8)
        hourly_rate = val * 0.00035
        downtime_loss = round(downtime_hours * hourly_rate, 2)
        
        if tier == "Tier-1":
            regulatory_fines = round(val * 0.35, 2)
        elif tier == "Tier-2":
            regulatory_fines = round(val * 0.18, 2)
        else:
            regulatory_fines = round(val * 0.05, 2)
            
        incident_response = round(val * 0.12, 2)

        r["loss_decomposition"] = {
            "downtime_loss": downtime_loss,
            "downtime_hours": downtime_hours,
            "regulatory_fines": regulatory_fines,
            "incident_response": incident_response,
            "total_estimated_impact": round(downtime_loss + regulatory_fines + incident_response, 2)
        }
    
    # 4. OpenFAIR Monte Carlo simulation
    simulation_results = run_monte_carlo_var(df_res)
    
    # 5. Regulatory compliance audit readiness
    compliance_results = evaluate_compliance_readiness(df_res)

    # 6. Frontier curve calculation (Gordon-Loeb)
    curve_points = generate_curve_points(df_modeled, steps=10)

    # 7. Attack Topology Calculation (NetworkX)
    try:
        topology_results = topology_engine.build_enterprise_topology(records)
        LATEST_DATA["last_topology"] = topology_results
    except Exception as top_err:
        print(f"[TOPOLOGY ENGINE ERROR]: {top_err}")
        topology_results = {"nodes": [], "edges": [], "critical_chokepoints": []}
    
    # 8. Safe database persistence for Continuous Trend Analysis
    db: Session = next(get_db())
    try:
        rbi_score = int(compliance_results.get("readiness_score", 0))
        new_scan = Scan(
            tenant_id="default_org",
            timestamp=datetime.now(timezone.utc),
            budget=float(budget),
            delay_days=int(delay_days),
            mfa_boost=bool(mfa_boost),
            edr_active=True,
            pam_active=bool(pam_active),
            spent=float(spent),
            saved=float(saved),
            residual=float(residual),
            expected_loss=float(simulation_results.get("expected_loss", 0.0)),
            var_95=float(simulation_results.get("var_95", 0.0)),
            var_99=float(simulation_results.get("var_99", 0.0)),
            compliance_score=rbi_score,
            compliance_rbi=rbi_score,
            compliance_dpdp=max(0, min(100, int(rbi_score * 0.95))),
            compliance_sebi=max(0, min(100, int(rbi_score * 0.90)))
        )
        db.add(new_scan)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[DB LOG ERROR]: {e}")
    finally:
        db.close()

    result = {
        "spent": float(spent),
        "saved": float(saved),
        "residual": float(residual),
        "allocations": records,
        "simulation": simulation_results,
        "compliance": compliance_results,
        "topology": topology_results,
        "curve": curve_points,
        "investment_curve": curve_points,
        "points": curve_points
    }
    LATEST_DATA["last_result"] = result
    return result

@app.post("/api/topology")
@app.get("/api/topology")
def get_attack_topology(payload: Optional[Dict[str, Any]] = None, _: str = Depends(verify_api_key)):
    """
    Computes enterprise network graph, blast radius exposures,
    and lateral pivot paths across the current asset dataset.
    """
    assets = None
    if payload and "assets" in payload:
        assets = payload["assets"]
    elif LATEST_DATA["last_result"] and "allocations" in LATEST_DATA["last_result"]:
        assets = LATEST_DATA["last_result"]["allocations"]

    if not assets:
        if LATEST_DATA["last_topology"]:
            return LATEST_DATA["last_topology"]
        return {"nodes": [], "edges": [], "total_nodes": 0, "total_edges": 0, "critical_chokepoints": []}

    topology_data = topology_engine.build_enterprise_topology(assets)
    LATEST_DATA["last_topology"] = topology_data
    return topology_data

@app.get("/api/scans/history")
def get_scan_history(limit: int = 15, _: str = Depends(verify_api_key)):
    db: Session = next(get_db())
    try:
        scans = db.query(Scan).order_by(Scan.id.desc()).limit(limit).all()
        history = []
        for s in reversed(scans):
            ts = getattr(s, "timestamp", None)
            ts_str = ts.strftime("%d %b %H:%M") if hasattr(ts, "strftime") else f"Run #{s.id}"
            
            history.append({
                "id": s.id,
                "timestamp": ts_str,
                "budget": float(getattr(s, "budget", 0.0)),
                "spent": float(getattr(s, "spent", 0.0)),
                "ale_saved": float(getattr(s, "saved", 0.0)),
                "residual_risk": float(getattr(s, "residual", 0.0)),
                "var_95": float(getattr(s, "var_95", 0.0)),
                "compliance_score": float(getattr(s, "compliance_score", 0.0))
            })
        return {"history": history}
    finally:
        db.close()

@app.api_route("/api/investment-curve", methods=["GET", "POST"])
@app.api_route("/api/curve", methods=["GET", "POST"])
async def get_investment_curve(request: Request, _: str = Depends(verify_api_key)):
    df_modeled = LATEST_DATA["df_modeled"]
    if df_modeled is None and LATEST_DATA["last_result"]:
        df_modeled = pd.DataFrame(LATEST_DATA["last_result"]["allocations"])
    
    if df_modeled is None:
        return {"curve": [], "investment_curve": [], "points": []}

    points = generate_curve_points(df_modeled, steps=10)
    return {"curve": points, "investment_curve": points, "points": points}

@app.post("/api/query")
@app.post("/api/nl-query")
@app.post("/api/chat")
async def handle_risk_query(payload: Dict[str, Any] = Body(...), _: str = Depends(verify_api_key)):
    user_query = payload.get("query") or payload.get("question") or payload.get("prompt") or ""
    context = payload.get("context") or LATEST_DATA["last_result"] or {}
    
    result = answer_risk_query(user_query, context)
    ans = result.get("answer") if isinstance(result, dict) else str(result)
    
    return {
        "answer": ans,
        "response": ans,
        "result": ans,
        "query_result": ans
    }