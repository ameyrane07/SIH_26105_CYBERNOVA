import os
import re
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def is_greeting(text: str) -> bool:
    """Detects any form of greeting, pleasantry, or identity question."""
    if not text:
        return True
    
    # Clean text: remove punctuation, lowercase, collapse repeated letters ('hiiii' -> 'hi', 'heyy' -> 'hey')
    cleaned = re.sub(r'[^a-zA-Z\s]', ' ', text.lower())
    cleaned = re.sub(r'(.)\1{2,}', r'\1', cleaned).strip()  # 'hiii' -> 'h' or 'hi'
    words = cleaned.split()

    # Raw check on original words as well
    raw_words = [w.strip("?!.,:;") for w in text.lower().split()]

    greeting_words = {"hi", "hii", "hiii", "hello", "hey", "heyy", "greetings", "yo", "sup", "namaste", "hola"}
    identity_phrases = ["who are you", "who r u", "what is your name", "what can you do", "introduce yourself", "help"]

    # Check for direct greeting words
    if any(w in greeting_words for w in words) or any(w in greeting_words for w in raw_words):
        # Only treat as greeting if no specific risk question is asked
        risk_terms = {"risk", "var", "ale", "budget", "asset", "tier", "vulnerability", "loss", "delay"}
        if not any(k in words for k in risk_terms) and not any(k in raw_words for k in risk_terms):
            return True

    # Check for identity questions
    for phrase in identity_phrases:
        if phrase in cleaned or phrase in text.lower():
            return True

    return False


GREETING_RESPONSE = (
    "Hello! I am CyberNova, your AI-powered Cyber Risk Quantification & Capital Optimization Assistant. "
    "I translate technical vulnerability scan data into monetary business metrics (Annualized Loss Expectancy and "
    "Value at Risk) and solve for optimal remediation budgets using Google OR-Tools. "
    "You can ask me about your highest-risk assets, portfolio 95% VaR, or budget allocation!"
)


def build_system_context(context: dict) -> str:
    """Builds structured executive context for the LLM based on simulation and knapsack outputs."""
    if not context:
        return "No assessment data loaded. Ask the user to upload a scan first."

    spent = context.get("spent", 0)
    saved = context.get("saved", 0)
    residual = context.get("residual", 0)
    sim = context.get("simulation", {})
    comp = context.get("compliance", {})
    allocations = context.get("allocations", [])

    sorted_assets = sorted(allocations, key=lambda x: x.get("ALE_Saved", 0), reverse=True)
    top_3_str = []
    for a in sorted_assets[:3]:
        top_3_str.append(
            f"'{a.get('Asset')}' (CVSS: {a.get('CVSS_Score')}, Criticality: {a.get('Business_Criticality', 'Tier-1')}, "
            f"ALE Mitigated: ₹{a.get('ALE_Saved', 0):,.2f})"
        )

    funded = [a["Asset"] for a in allocations if a.get("Funded_By_Budget")]
    deferred = [a["Asset"] for a in allocations if not a.get("Funded_By_Budget")]

    return (
        f"QUANTIFIED RISK TELEMETRY:\n"
        f"- Capital Allocated (Budget Spent): ₹{spent:,.2f}\n"
        f"- Total Losses Mitigated (ALE Saved): ₹{saved:,.2f}\n"
        f"- Residual Risk Exposure: ₹{residual:,.2f}\n"
        f"- 95% Value at Risk (VaR): ₹{sim.get('var_95', 0):,.2f}\n"
        f"- 99% Value at Risk (VaR): ₹{sim.get('var_99', 0):,.2f}\n"
        f"- Compliance Readiness Score: {comp.get('readiness_score', 0)}/100\n"
        f"- Top Risk Assets: {'; '.join(top_3_str)}\n"
        f"- Funded Assets: {', '.join(funded[:4]) if funded else 'None'}\n"
        f"- Deferred Assets: {', '.join(deferred[:4]) if deferred else 'None'}\n"
    )


def deterministic_fallback(query: str, context: dict) -> str:
    """Rule-based deterministic engine that answers exact mathematical queries when offline."""
    # 1. Catch greetings first
    if is_greeting(query):
        return GREETING_RESPONSE

    if not context:
        return "Assessment telemetry is not yet loaded. Please upload a scan dataset to generate risk metrics."

    q = query.lower().strip()
    spent = context.get("spent", 0)
    saved = context.get("saved", 0)
    residual = context.get("residual", 0)
    sim = context.get("simulation", {})
    allocations = context.get("allocations", [])

    # 2. Value at Risk queries
    if "var" in q or "value at risk" in q:
        v95 = sim.get("var_95", 0)
        v99 = sim.get("var_99", 0)
        return (
            f"Based on 10,000 Monte Carlo simulation runs, your 95% Value at Risk (VaR) is "
            f"₹{v95:,.2f}, with a 99% tail VaR exposure of ₹{v99:,.2f}."
        )

    # 3. Budget & Spend queries
    if "budget" in q or "allocated" in q or "spend" in q or "spent" in q:
        return (
            f"The 0/1 Knapsack optimizer allocated ₹{spent:,.2f} of your security budget, "
            f"achieving ₹{saved:,.2f} in mitigated Annualized Loss Expectancy (ALE)."
        )

    # 4. Top/Highest Risk Vulnerabilities & Assets
    if any(k in q for k in ["highest", "critical", "vulnerabilit", "tier-1", "biggest", "top", "contribute"]):
        if allocations:
            sorted_allocs = sorted(allocations, key=lambda x: x.get("ALE_Saved", 0), reverse=True)
            top = sorted_allocs[0]
            second = sorted_allocs[1] if len(sorted_allocs) > 1 else None
            msg = (
                f"The highest financial risk driver is '{top.get('Asset')}' with CVSS {top.get('CVSS_Score')}, "
                f"accounting for ₹{top.get('ALE_Saved', 0):,.2f} in mitigatable loss."
            )
            if second:
                msg += f" This is followed by '{second.get('Asset')}' (CVSS {second.get('CVSS_Score')}) at ₹{second.get('ALE_Saved', 0):,.2f}."
            return msg

    # 5. Delay simulation queries
    if "delay" in q or "30 days" in q or "defer" in q:
        return (
            "A 30-day remediation delay compounds threat exploitability velocity, increasing "
            "loss event frequency (LEF) and raising expected residual exposure by an estimated 15% to 25%."
        )

    # 6. Compliance queries
    if "compliance" in q or "rbi" in q or "cscrf" in q or "dpdp" in q:
        comp = context.get("compliance", {})
        return (
            f"Your compliance readiness score is {comp.get('readiness_score', 0)}/100 under RBI CSCRF guidelines. "
            f"Ensure all Tier-1 infrastructure assets are funded to avoid regulatory non-conformity."
        )

    return (
        f"Your current portfolio residual exposure is ₹{residual:,.2f}, with ₹{saved:,.2f} in loss prevented "
        f"across {len(allocations)} analyzed assets."
    )


def answer_risk_query(user_query: str, context: dict = None) -> str:
    """Triple-layered query pipeline: Local Ollama -> Google Gemini -> Deterministic Fallback."""

    # -----------------------------------------------------------------
    # GUARD 1: Pure greetings & small talk bypass the LLM/telemetry completely
    # -----------------------------------------------------------------
    if is_greeting(user_query):
        return GREETING_RESPONSE

    # -----------------------------------------------------------------
    # RISK QUESTIONS: Build context and prompt the LLM
    # -----------------------------------------------------------------
    system_ctx = build_system_context(context)
    prompt = (
        f"You are the CyberNova Executive Risk AI.\n\n"
        f"{system_ctx}\n\n"
        f"User Question: {user_query}\n\n"
        f"CRITICAL RULES:\n"
        f"1. Start DIRECTLY with the answer. Do NOT introduce yourself or say 'Hello' or 'I am CyberNova'.\n"
        f"2. Be concise: answer in 2 or 3 complete sentences.\n"
        f"3. Always cite the exact rupee amounts (₹) from the telemetry above.\n"
        f"4. Never leave a sentence incomplete or cut off mid-thought."
    )

    # LAYER 1: Local Ollama Inference (llama3.2:3b)
    try:
        ollama_payload = {
            "model": "llama3.2:3b",
            "prompt": prompt,
            "stream": False,
            "keep_alive": "5m",
            "options": {
                "num_predict": 250,
                "temperature": 0.2
            }
        }
        resp = requests.post("http://localhost:11434/api/generate", json=ollama_payload, timeout=25)
        if resp.status_code == 200:
            result = resp.json().get("response", "").strip()
            if result:
                return result
    except Exception as e:
        print(f"[Ollama Status]: Local inference unavailable, switching to Cloud ({e})")

    # LAYER 2: Google Gemini Cloud API
    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            print(f"[Gemini Cloud Error]: {e}")

    # LAYER 3: Deterministic Mathematical Rule Engine
    return deterministic_fallback(user_query, context)


# Alias export
query_risk_intelligence = answer_risk_query