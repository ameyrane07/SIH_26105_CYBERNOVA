import pandas as pd

FRAMEWORK_MAPPINGS = {
    "RBI_CSF": {
        "Tier-1": ["Annex-1 (Customer Data Protection)", "Annex-2 (Continuous Monitoring)"],
        "Tier-2": ["Annex-3 (Access Governance)"],
        "Tier-3": ["Annex-4 (Baseline Controls)"]
    },
    "CERT_IN": {
        "Critical": "Mandatory 6-Hour Incident Notification Clause",
        "Standard": "System Logs Retention (180 Days)"
    },
    "ISO_27001": ["A.12.6.1 (Technical Vulnerability Management)", "A.9.2 (User Access Provisioning)"]
}

def evaluate_compliance_readiness(df: pd.DataFrame):
    unfunded = df[~df["Funded_By_Budget"]] if "Funded_By_Budget" in df.columns else df
    high_criticality_gaps = unfunded[unfunded["Business_Criticality"] == "Tier-1"]
    
    compliance_score = max(10, 100 - (len(high_criticality_gaps) * 18))
    
    flagged_violations = []
    for _, row in high_criticality_gaps.iterrows():
        flagged_violations.append({
            "asset": row["Asset"],
            "clause": FRAMEWORK_MAPPINGS["RBI_CSF"]["Tier-1"][0],
            "framework": "RBI Cyber Security Framework"
        })
        
    return {
        "readiness_score": compliance_score,
        "violations": flagged_violations
    }