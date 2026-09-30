import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  UploadCloud, 
  IndianRupee, 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  Award, 
  BarChart3, 
  Bot, 
  Send, 
  History, 
  Download, 
  Sliders, 
  Info, 
  X, 
  FileText, 
  Clock, 
  Scale, 
  ShieldAlert, 
  Database, 
  LogOut, 
  FileSpreadsheet, 
  AlertOctagon, 
  CheckCircle2, 
  FileWarning 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import LoginPage from './LoginPage';

const API_KEY = "cybernova-dev-key";

interface LossDecomposition {
  downtime_loss: number;
  downtime_hours: number;
  regulatory_fines: number;
  incident_response: number;
  total_estimated_impact: number;
}

interface AllocationItem {
  Asset: string;
  CVSS_Score: number;
  Asset_Value_INR: number;
  Mitigation_Cost_INR: number;
  ALE_Saved: number;
  Funded_By_Budget: boolean;
  ROSI_Pct: number;
  Business_Criticality?: string;
  loss_decomposition?: LossDecomposition;
}

interface CurvePoint {
  budget: number;
  spent: number;
  risk_reduced: number;
  residual_risk: number;
}

interface HistoryPoint {
  id: number;
  timestamp: string;
  budget: number;
  spent: number;
  ale_saved: number;
  residual_risk: number;
  var_95: number;
  compliance_score: number;
}

interface ApiResponse {
  spent: number;
  saved: number;
  residual: number;
  allocations: AllocationItem[];
  simulation: {
    expected_loss: number;
    var_95: number;
    var_99: number;
  };
  compliance: {
    readiness_score: number;
    violations: Array<{ asset: string; clause: string; framework: string }>;
  };
  curve?: CurvePoint[];
}

interface UserSession {
  user: string;
  role: string;
  sessionToken: string;
}

const formatINR = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('cybernova_auth') === 'true';
  });
  const [, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = sessionStorage.getItem('cybernova_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData: UserSession) => {
    sessionStorage.setItem('cybernova_auth', 'true');
    sessionStorage.setItem('cybernova_user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('cybernova_auth');
    sessionStorage.removeItem('cybernova_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const [budget, setBudget] = useState<number>(600000);
  const [delayDays, setDelayDays] = useState<number>(0);
  const [mfaBoost, setMfaBoost] = useState<boolean>(false);
  const [useMlScoring, setUseMlScoring] = useState<boolean>(true);
  
  const [ingestionMode, setIngestionMode] = useState<string>("unified");
  const [file, setFile] = useState<File | null>(null);
  const [cmdbFile, setCmdbFile] = useState<File | null>(null);

  const [edrRate, setEdrRate] = useState<number>(85);
  const [pamActive, setPamActive] = useState<boolean>(false);
  const [backupsActive, setBackupsActive] = useState<boolean>(false);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);

  const [selectedAsset, setSelectedAsset] = useState<AllocationItem | null>(null);
  const [activePage, setActivePage] = useState<"overview" | "trends" | "query">("overview");

  const [query, setQuery] = useState<string>("What is our highest financial cyber risk?");
  const [queryResult, setQueryResult] = useState<string>("");
  const [queryLoading, setQueryLoading] = useState<boolean>(false);

  const sampleQueries = [
    "What is our highest financial cyber risk?",
    "Which assets have the highest ALE?",
    "Which assets are Tier-1 risks?",
    "What vulnerabilities contribute most to risk?",
    "What is our current budget and risk reduction?",
    "What is our current Value at Risk?",
    "What happens if remediation is delayed by 30 days?"
  ];

  const fetchScanHistory = async () => {
    try {
      const res = await fetch("/api/scans/history", {
        headers: { "X-API-Key": API_KEY },
      });
      const json = await res.json();
      if (json.history && json.history.length > 0) {
        setHistoryData(json.history);
      }
    } catch (err) {
      console.error("Could not load scan history:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchScanHistory();
    }
  }, [isAuthenticated]);

  const handleExecuteEngine = async () => {
    if (!file) {
      alert("Please upload an asset dataset CSV or Excel file first.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (ingestionMode === "split" && cmdbFile) {
      formData.append("cmdb_file", cmdbFile);
    }
    formData.append("ingestion_mode", ingestionMode);
    formData.append("budget", budget.toString());
    formData.append("delay_days", delayDays.toString());
    formData.append("mfa_boost", mfaBoost.toString());
    formData.append("use_ml_scoring", useMlScoring.toString());
    formData.append("edr_rate", (edrRate / 100).toString());
    formData.append("pam_active", pamActive.toString());
    formData.append("backups_active", backupsActive.toString());

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "X-API-Key": API_KEY },
        body: formData,
      });
      const resData = await response.json();
      setData(resData);
      await fetchScanHistory();
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend on port 8000. Ensure Uvicorn is active.");
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuery = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q) return;
    setQueryLoading(true);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({ query: q, context: data })
      });
      const resData = await response.json();
      setQueryResult(resData.answer || resData.response || "No response received.");
    } catch (err) {
      setQueryResult("Error connecting to intelligence endpoint.");
    } finally {
      setQueryLoading(false);
    }
  };

  const handleExportReportCSV = () => {
    if (!data) {
      alert("Please run an assessment first to generate an executive report.");
      return;
    }

    const headers = [
      "Asset Name",
      "CVSS Score",
      "Asset Value (INR)",
      "Mitigation Cost (INR)",
      "ALE Saved (INR)",
      "ROSI (%)",
      "Remediation Status",
      "Est. Downtime Loss (INR)",
      "Regulatory Liability (INR)",
      "Incident Response (INR)"
    ];

    const rows = data.allocations.map((item) => [
      `"${item.Asset.replace(/"/g, '""')}"`,
      item.CVSS_Score,
      item.Asset_Value_INR,
      item.Mitigation_Cost_INR,
      item.ALE_Saved,
      item.ROSI_Pct.toFixed(2),
      item.Funded_By_Budget ? "FUNDED" : "DEFERRED",
      item.loss_decomposition?.downtime_loss || 0,
      item.loss_decomposition?.regulatory_fines || 0,
      item.loss_decomposition?.incident_response || 0
    ]);

    const csvContent = [
      "=== CYBERNOVA EXECUTIVE RISK QUANTIFICATION BRIEF ===",
      `Generated At,${new Date().toLocaleString()}`,
      `Security Budget (INR),${budget}`,
      `Capital Allocated (INR),${data.spent}`,
      `ALE Saved / Loss Reduced (INR),${data.saved}`,
      `Residual Risk Exposure (INR),${data.residual}`,
      `95% Value at Risk (VaR INR),${data.simulation.var_95}`,
      `Compliance Readiness Score,${data.compliance.readiness_score}/100`,
      `Ingestion Mode,${ingestionMode}`,
      `EDR Agent Coverage,${edrRate}%`,
      `PAM Enforced,${pamActive}`,
      `Air-gapped Backups,${backupsActive}`,
      "",
      "=== PORTFOLIO ASSET REMEDIATION MANDATES ===",
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Executive_Risk_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportReportExcel = () => {
    if (!data || !data.allocations || data.allocations.length === 0) {
      alert("Please run an assessment first to generate an executive report.");
      return;
    }

    const summaryData = [
      { Metric: "Security Budget (INR)", Value: budget },
      { Metric: "Capital Allocated (INR)", Value: data.spent },
      { Metric: "ALE Saved / Loss Reduced (INR)", Value: data.saved },
      { Metric: "Residual Risk Exposure (INR)", Value: data.residual },
      { Metric: "95% Value at Risk (VaR INR)", Value: data.simulation.var_95 },
      { Metric: "Compliance Readiness Score", Value: `${data.compliance.readiness_score}/100` },
      { Metric: "Ingestion Pipeline", Value: ingestionMode },
      { Metric: "EDR Agent Coverage", Value: `${edrRate}%` },
      { Metric: "PAM Active", Value: pamActive ? "Yes" : "No" },
      { Metric: "Air-Gapped Backups", Value: backupsActive ? "Yes" : "No" },
      { Metric: "Generated At", Value: new Date().toLocaleString() }
    ];

    const allocationsData = data.allocations.map((item) => ({
      "Asset Name": item.Asset,
      "CVSS Score": item.CVSS_Score,
      "Asset Value (INR)": item.Asset_Value_INR,
      "Mitigation Cost (INR)": item.Mitigation_Cost_INR,
      "ALE Saved (INR)": item.ALE_Saved,
      "ROSI (%)": `${item.ROSI_Pct.toFixed(2)}%`,
      "Remediation Status": item.Funded_By_Budget ? "FUNDED" : "DEFERRED",
      "Est. Downtime Loss (INR)": item.loss_decomposition?.downtime_loss || 0,
      "Regulatory Liability (INR)": item.loss_decomposition?.regulatory_fines || 0,
      "Incident Response (INR)": item.loss_decomposition?.incident_response || 0,
      "Total Estimated Impact (INR)": item.loss_decomposition?.total_estimated_impact || 0
    }));

    const workbook = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsAllocations = XLSX.utils.json_to_sheet(allocationsData);

    XLSX.utils.book_append_sheet(workbook, wsSummary, "Executive Summary");
    XLSX.utils.book_append_sheet(workbook, wsAllocations, "Asset Allocations");

    XLSX.writeFile(workbook, `Executive_Risk_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  const fundedAssets = data?.allocations.filter(a => a.Funded_By_Budget) || [];
  const deferredAssets = data?.allocations.filter(a => !a.Funded_By_Budget) || [];
  const firstDeferred = deferredAssets[0];
  const unspentCapital = data ? budget - data.spent : 0;

  const tier1Assets = data?.allocations.filter(a => a.Business_Criticality === "Tier-1") || [];
  const unfundedTier1Assets = tier1Assets.filter(a => !a.Funded_By_Budget);
  const fundedTier1Assets = tier1Assets.filter(a => a.Funded_By_Budget);
  const tier1CapitalDeficit = unfundedTier1Assets.reduce((acc, curr) => acc + curr.Mitigation_Cost_INR, 0);
  const tier1UnhedgedExposure = unfundedTier1Assets.reduce((acc, curr) => acc + (curr.loss_decomposition?.total_estimated_impact || curr.Asset_Value_INR * 0.25), 0);

  const budgetPercent = Math.min(100, Math.max(0, ((budget - 50000) / (3500000 - 50000)) * 100));
  const delayPercent = Math.min(100, Math.max(0, (delayDays / 90) * 100));
  const edrPercent = Math.min(100, Math.max(0, ((edrRate - 40) / (100 - 40)) * 100));

  return (
    <div className="flex min-h-screen bg-[#070b12] text-slate-100 font-sans relative">
      <aside className="w-80 border-r border-slate-800/80 bg-[#0c121e] p-6 flex flex-col justify-between overflow-y-auto max-h-screen">
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <ShieldCheck className="text-emerald-400 shrink-0" size={32} />
            <h1 className="font-extrabold tracking-tight text-white text-lg leading-none">
              CYBERNOVA
            </h1>
          </div>

          {/* 1. Ingestion Mode Selector */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                1. Ingestion Pipeline
              </label>
              <select
                value={ingestionMode}
                onChange={(e) => setIngestionMode(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-cyan-400 text-[11px] rounded px-2 py-0.5 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="unified">Unified CSV / Excel</option>
                <option value="split">Enterprise CMDB Split</option>
              </select>
            </div>

            <div className="relative border border-dashed border-slate-700 hover:border-emerald-500 rounded-lg p-3 text-center cursor-pointer transition bg-slate-900/40 mb-2 group">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="mx-auto text-blue-400 mb-1 group-hover:scale-110 transition-transform" size={20} />
              <span className="text-[11px] font-semibold text-slate-200 block truncate">
                {file ? file.name : "Upload File"}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports .csv and .xlsx"}
              </span>
            </div>

            {ingestionMode === "split" && (
              <div className="relative border border-dashed border-cyan-700/60 hover:border-cyan-500 rounded-lg p-2.5 text-center cursor-pointer transition bg-cyan-950/10">
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls" 
                  onChange={(e) => setCmdbFile(e.target.files?.[0] || null)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Database className="mx-auto text-cyan-400 mb-1" size={18} />
                <span className="text-[11px] text-cyan-300 block truncate font-mono">
                  {cmdbFile ? cmdbFile.name : "ServiceNow_CMDB.xlsx"}
                </span>
              </div>
            )}
          </div>

          {/* 2. Slider Bar for Capital Budget */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                2. Capital Budget
              </label>
              <span className="font-mono text-emerald-400 text-xs font-bold">
                {formatINR(budget)}
              </span>
            </div>
            <input 
              type="range" 
              min={50000} 
              max={3500000} 
              step={25000} 
              value={budget} 
              onChange={(e) => setBudget(Number(e.target.value))} 
              style={{
                background: `linear-gradient(to right, #10b981 ${budgetPercent}%, #1e293b ${budgetPercent}%)`
              }}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300"
            />
          </div>

          {/* 3. Slider Bar for Remediation Delay */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                3. Remediation Delay
              </label>
              <span className="font-mono text-amber-400 text-xs font-bold">
                {delayDays} days
              </span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={90} 
              step={1} 
              value={delayDays} 
              onChange={(e) => setDelayDays(Number(e.target.value))} 
              style={{
                background: `linear-gradient(to right, #f59e0b ${delayPercent}%, #1e293b ${delayPercent}%)`
              }}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
            />
          </div>

          {/* 4. DYNAMIC CONTROL POSTURE */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              <Sliders size={14} />
              <span>4. Dynamic Control Posture</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-slate-300 font-medium">EDR Deployment</span>
                <span className="font-mono text-cyan-300 text-[11px] font-bold">{edrRate}%</span>
              </div>
              <input 
                type="range" 
                min={40} 
                max={100} 
                step={5} 
                value={edrRate} 
                onChange={(e) => setEdrRate(Number(e.target.value))} 
                style={{
                  background: `linear-gradient(to right, #06b6d4 ${edrPercent}%, #1e293b ${edrPercent}%)`
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input 
                type="checkbox" 
                checked={pamActive} 
                onChange={(e) => setPamActive(e.target.checked)} 
                className="rounded accent-cyan-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-200">PAM (Privileged Access)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input 
                type="checkbox" 
                checked={backupsActive} 
                onChange={(e) => setBackupsActive(e.target.checked)} 
                className="rounded accent-cyan-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-200">Air-Gapped Daily Backups</span>
            </label>
          </div>

          {/* 5. What-If & Scoring Options */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-300">
              <input 
                type="checkbox" 
                checked={mfaBoost} 
                onChange={(e) => setMfaBoost(e.target.checked)} 
                className="mt-0.5 rounded accent-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-300">What-If: Universal MFA Enforcement</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-300">
              <input 
                type="checkbox" 
                checked={useMlScoring} 
                onChange={(e) => setUseMlScoring(e.target.checked)} 
                className="mt-0.5 rounded accent-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-300">Use AI/ML Risk Scoring</span>
            </label>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={handleExecuteEngine}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              {loading ? <Activity className="animate-spin" size={16} /> : <BarChart3 size={16} />}
              <span>{loading ? "Running Engine..." : "Execute Risk Engine"}</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleExportReportCSV}
                disabled={!data}
                className="w-full py-2 px-2 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-medium text-xs rounded-lg transition flex items-center justify-center gap-1 cursor-pointer border border-slate-700 shadow-sm"
                title="Export executive brief in CSV format"
              >
                <Download size={13} className="text-sky-400 shrink-0" />
                <span className="truncate text-[11px]">Export .CSV</span>
              </button>

              <button
                onClick={handleExportReportExcel}
                disabled={!data}
                className="w-full py-2 px-2 bg-emerald-950/30 hover:bg-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-300 font-medium text-xs rounded-lg transition flex items-center justify-center gap-1 cursor-pointer border border-emerald-500/30 shadow-sm"
                title="Export complete workbook in Excel (.xlsx) format"
              >
                <FileSpreadsheet size={13} className="text-emerald-400 shrink-0" />
                <span className="truncate text-[11px]">Export .XLSX</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <header className="flex justify-between items-center pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Cyber Risk Dashboard</h2>
            <p className="text-xs text-slate-400">Continuous quantitative loss analysis &amp; investment optimization</p>
          </div>
          
          <div className="flex items-center gap-3 flex-nowrap shrink-0">
            {data && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap leading-none">
                <Award size={14} className="shrink-0" />
                <span>Compliance Readiness: {data.compliance.readiness_score}/100</span>
              </div>
            )}

            {data && useMlScoring && (
              <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap leading-none">
                <Bot size={14} className="shrink-0" />
                <span>AI/ML Scoring</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold whitespace-nowrap leading-none transition-all cursor-pointer"
              title="Sign out of executive session"
            >
              <LogOut size={13} className="shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0c121e] border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold uppercase mb-1">
              <IndianRupee size={13} /> Capital Allocated
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              ₹{data ? data.spent.toLocaleString() : "0"}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">From requested budget: ₹{budget.toLocaleString()}</p>
          </div>

          <div className="bg-[#0c121e] border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-semibold uppercase mb-1">
              <TrendingUp size={13} /> Risk Reduced (ALE)
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              ₹{data ? data.saved.toLocaleString() : "0"}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Loss mitigation value</p>
          </div>

          <div className="bg-[#0c121e] border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-rose-400 text-[11px] font-semibold uppercase mb-1">
              <AlertTriangle size={13} /> Residual Risk Exposure
            </div>
            <div className="text-2xl font-bold text-rose-400 font-mono">
              ₹{data ? data.residual.toLocaleString() : "0"}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Remaining liability</p>
          </div>

          <div className="bg-[#0c121e] border border-slate-800/80 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-semibold uppercase mb-1">
              <Activity size={13} /> Value at Risk (95% VaR)
            </div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">
              ₹{data ? data.simulation.var_95.toLocaleString() : "0"}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">10,000 Monte Carlo runs</p>
          </div>
        </div>

        <nav className="flex gap-2 border-b border-slate-800/80 pb-3">
          <button
            onClick={() => setActivePage("overview")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
              activePage === "overview"
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 size={14} /> Overview &amp; Optimization
          </button>
          <button
            onClick={() => setActivePage("trends")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
              activePage === "trends"
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <History size={14} /> Trends &amp; Compliance
          </button>
          <button
            onClick={() => setActivePage("query")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
              activePage === "query"
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot size={14} /> AI Risk Query
          </button>
        </nav>

        {activePage === "overview" && (
        <section className="bg-[#0c121e] border border-slate-800/80 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-white text-sm">Investment vs. Risk Reduction Curve</h3>
              <p className="text-xs text-slate-400">Diminishing returns analysis (Gordon-Loeb theorem &amp; MILP frontier)</p>
            </div>
            {data?.curve && data.curve.length > 0 && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                10 Frontier Points Computed
              </span>
            )}
          </div>

          <div className="w-full h-[280px]">
            {data && data.curve && data.curve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.curve} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorResidual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="budget" 
                    tickFormatter={formatINR} 
                    stroke="#64748b" 
                    fontSize={11}
                  />
                  <YAxis 
                    tickFormatter={formatINR} 
                    stroke="#64748b" 
                    fontSize={11}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, ""]}
                    labelFormatter={(label) => `Capital: ₹${Number(label).toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Area 
                    type="monotone" 
                    dataKey="risk_reduced" 
                    name="ALE Saved (Risk Mitigated)" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSaved)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="residual_risk" 
                    name="Residual Risk Exposure" 
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorResidual)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500">
                <BarChart3 className="mb-2 opacity-40" size={28} />
                <p className="text-xs">Execute Risk Engine to plot the diminishing returns investment curve.</p>
              </div>
            )}
          </div>
        </section>
        )}

        {activePage === "trends" && (
        <div className="space-y-6">
          <section className="bg-[#0c121e] border border-slate-800/80 rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <History className="text-cyan-400" size={18} />
                <div>
                  <h3 className="font-bold text-white text-sm">Continuous Risk Trend &amp; Exposure Velocity</h3>
                  <p className="text-xs text-slate-400">Scan-by-scan residual exposure drift &amp; risk mitigation tracking</p>
                </div>
              </div>
              {historyData.length > 0 && (
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {historyData.length} Snapshots Tracked
                </span>
              )}
            </div>

            <div className="w-full h-[260px]">
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#64748b" 
                      fontSize={10}
                    />
                    <YAxis 
                      tickFormatter={formatINR} 
                      stroke="#64748b" 
                      fontSize={11}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Line 
                      type="monotone" 
                      dataKey="residual_risk" 
                      name="Residual Exposure" 
                      stroke="#f43f5e" 
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#f43f5e" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ale_saved" 
                      name="Risk Mitigated" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="var_95" 
                      name="95% VaR" 
                      stroke="#38bdf8" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500">
                  <History className="mb-2 opacity-40" size={28} />
                  <p className="text-xs">Run assessments to plot historical risk trend velocity.</p>
                </div>
              )}
            </div>
          </section>

          <section className="bg-[#0c121e] border border-slate-800/80 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">Statutory Regulatory &amp; Tier-1 Capital Audit</h3>
                  <p className="text-xs text-slate-400">Audit inspection of mission-critical (Tier-1) infrastructure omitted due to budget exhaustion</p>
                </div>
              </div>

              {data && (
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tier-1 Capital Deficit</span>
                    <span className="font-mono text-sm font-bold text-rose-400">₹{tier1CapitalDeficit.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tier-1 Funded Ratio</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {tier1Assets.length > 0 ? `${fundedTier1Assets.length}/${tier1Assets.length} (${Math.round((fundedTier1Assets.length / tier1Assets.length) * 100)}%)` : "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {unfundedTier1Assets.length > 0 ? (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3">
                <AlertOctagon className="text-rose-400 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-rose-200">
                    Non-Compliance Breach Warning: {unfundedTier1Assets.length} Tier-1 Core Financial Asset{unfundedTier1Assets.length > 1 ? 's' : ''} Deferred
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    The current budget of <strong className="text-white">₹{budget.toLocaleString()}</strong> leaves an unhedged operational liability of <strong className="text-rose-400 font-mono">₹{tier1UnhedgedExposure.toLocaleString()}</strong> on primary banking/payment clusters. Under <strong>RBI Cyber Security Framework (CSCRF)</strong> and <strong>DPDP Act Section 8</strong>, Tier-1 system vulnerabilities require mandatory remediation within 24-48 hours regardless of discretionary budget constraints.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
                <div className="text-xs text-emerald-200">
                  <strong>Full Tier-1 Compliance Maintained:</strong> All mission-critical banking and payment core assets have received capital funding under the allocated portfolio budget.
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Tier-1 Asset Identifier</th>
                    <th className="py-2.5 px-4">CVSS Severity</th>
                    <th className="py-2.5 px-4">Mitigation Deficit (Capital Needed)</th>
                    <th className="py-2.5 px-4">Unhedged Liability (FAIR Loss)</th>
                    <th className="py-2.5 px-4">Audit Violation Trigger</th>
                    <th className="py-2.5 px-4">Remediation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {tier1Assets.length > 0 ? (
                    tier1Assets.map((asset, idx) => (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-800/40 transition ${!asset.Funded_By_Budget ? "bg-rose-950/10" : ""}`}
                      >
                        <td className="py-2.5 px-4 font-sans font-medium text-white flex items-center gap-2">
                          {!asset.Funded_By_Budget ? (
                            <FileWarning size={14} className="text-rose-400 shrink-0" />
                          ) : (
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          )}
                          <span>{asset.Asset}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">{asset.CVSS_Score}</td>
                        <td className="py-2.5 px-4 text-slate-200">₹{asset.Mitigation_Cost_INR.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-rose-400 font-semibold">
                          ₹{(asset.loss_decomposition?.total_estimated_impact || asset.Asset_Value_INR * 0.25).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-[11px] text-slate-300">
                          {!asset.Funded_By_Budget ? (
                            <span className="text-rose-300 font-medium">RBI CSCRF Annex-1 / DPDP Act S.8</span>
                          ) : (
                            <span className="text-emerald-400 font-medium">Compliant (Controls Allocated)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-sans">
                          {asset.Funded_By_Budget ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap leading-none">
                              FUNDED
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-semibold text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/40 whitespace-nowrap leading-none">
                              DEFERRED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500 font-sans">
                        Upload dataset and run engine to inspect Tier-1 compliance audit allocations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        )}

        {activePage === "query" && (
        <section className="bg-[#0c121e] border border-slate-800/80 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="text-emerald-400" size={18} />
            <h3 className="font-bold text-white text-sm">AI Risk Query</h3>
          </div>
          <p className="text-xs text-slate-400">Ask questions about the latest quantified cyber-risk assessment</p>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Ask questions about financial exposure..." 
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button 
              onClick={() => handleAskQuery()} 
              disabled={queryLoading} 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {queryLoading ? <Activity className="animate-spin" size={14} /> : <Send size={14} />}
              <span>Ask</span>
            </button>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
              Example Queries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleQueries.map((sq, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    setQuery(sq);
                    handleAskQuery(sq);
                  }} 
                  className="text-[11px] bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 px-2.5 py-1 rounded-full cursor-pointer transition"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>

          {queryResult && (
            <div className="mt-3 p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs leading-relaxed text-slate-200">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                Query Result
              </span>
              {queryResult}
            </div>
          )}
        </section>
        )}

        {activePage === "overview" && (
        <section className="bg-[#0c121e] border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm">Optimal Remediation Allocations (MILP Knapsack Solution)</h3>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Click any row to inspect OpenFAIR loss decomposition
              </span>
            </div>
            {data && (
              <span className="text-xs text-slate-400">
                <span className="text-emerald-400 font-bold">{fundedAssets.length} Funded</span> / <span className="text-rose-400 font-bold">{deferredAssets.length} Deferred</span>
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Asset</th>
                  <th className="py-2.5 px-4">CVSS</th>
                  <th className="py-2.5 px-4">Asset Value</th>
                  <th className="py-2.5 px-4">Mitigation Cost</th>
                  <th className="py-2.5 px-4">ALE Saved</th>
                  <th className="py-2.5 px-4">ROSI</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-center">OpenFAIR Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data ? (
                  <>
                    {fundedAssets.map((row, idx) => (
                      <tr 
                        key={`funded-${idx}`} 
                        className="hover:bg-slate-800/40 transition bg-emerald-950/5 cursor-pointer"
                        onClick={() => setSelectedAsset(row)}
                      >
                        <td className="py-2.5 px-4 font-medium text-white">{row.Asset}</td>
                        <td className="py-2.5 px-4 font-mono">{row.CVSS_Score}</td>
                        <td className="py-2.5 px-4 font-mono">₹{row.Asset_Value_INR.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-200">₹{row.Mitigation_Cost_INR.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono text-emerald-400 font-semibold">₹{row.ALE_Saved.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono text-emerald-300">{row.ROSI_Pct.toFixed(1)}%</td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap leading-none">
                            FUNDED
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button className="p-1 hover:bg-slate-700/60 text-cyan-400 rounded transition" title="Inspect Loss">
                            <Info size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {deferredAssets.length > 0 && (
                      <tr className="bg-amber-500/10 border-y-2 border-amber-500/30">
                        <td colSpan={8} className="py-2.5 px-4 text-amber-300 font-semibold text-[11px]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={14} className="text-amber-400" />
                              <span>
                                CAPITAL EXHAUSTION CUTOFF: ₹{data.spent.toLocaleString()} allocated of ₹{budget.toLocaleString()} budget (₹{unspentCapital.toLocaleString()} unallocated remainder)
                              </span>
                            </div>
                            {firstDeferred && (
                              <span className="text-[10px] text-amber-400/90 font-mono">
                                Next Candidate requires ₹{firstDeferred.Mitigation_Cost_INR.toLocaleString()} (Deferred)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {deferredAssets.map((row, idx) => (
                      <tr 
                        key={`deferred-${idx}`} 
                        className="hover:bg-slate-800/40 transition opacity-80 cursor-pointer"
                        onClick={() => setSelectedAsset(row)}
                      >
                        <td className="py-2.5 px-4 font-medium text-slate-300">{row.Asset}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">{row.CVSS_Score}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">₹{row.Asset_Value_INR.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">₹{row.Mitigation_Cost_INR.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">₹{row.ALE_Saved.toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">{row.ROSI_Pct.toFixed(1)}%</td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-semibold text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/40 whitespace-nowrap leading-none">
                            DEFERRED
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 rounded transition" title="Inspect Loss">
                            <Info size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-slate-500">
                      Upload asset dataset and run engine to view allocations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}
      </main>

      {selectedAsset && selectedAsset.loss_decomposition && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{selectedAsset.Asset}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-slate-400">CVSS {selectedAsset.CVSS_Score}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-cyan-400 font-medium">OpenFAIR Loss Magnitude Decomposition</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAsset(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-300 leading-relaxed">
                Under <strong>OpenFAIR Standard O-RT</strong>, total breach liability is decomposed into operational downtime, statutory regulatory penalties, and forensics:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase mb-1.5">
                    <Clock size={14} /> Downtime Loss
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    ₹{selectedAsset.loss_decomposition.downtime_loss.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">~{selectedAsset.loss_decomposition.downtime_hours} hrs service outage</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold uppercase mb-1.5">
                    <Scale size={14} /> Statutory Fines
                  </div>
                  <div className="text-lg font-bold text-rose-400 font-mono">
                    ₹{selectedAsset.loss_decomposition.regulatory_fines.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">DPDP Act 2023 &amp; RBI CSCRF proxy</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold uppercase mb-1.5">
                    <FileText size={14} /> Incident Response
                  </div>
                  <div className="text-lg font-bold text-cyan-400 font-mono">
                    ₹{selectedAsset.loss_decomposition.incident_response.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Digital forensics &amp; legal retainer</p>
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Quantified Primary &amp; Secondary Loss</span>
                  <span className="text-xs text-emerald-300">Sum of direct business impact vectors</span>
                </div>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  ₹{selectedAsset.loss_decomposition.total_estimated_impact.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[11px] text-slate-500 font-mono">Asset Value: ₹{selectedAsset.Asset_Value_INR.toLocaleString()}</span>
              <button 
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}