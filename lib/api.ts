import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface BacktestParams {
  strategy_id?: string;
  w_mom: number;
  w_accel: number;
  w_quality: number;
  w_vol: number;
  long_n: number;
  short_n: number;
  long_pct: number;
  short_pct: number;
  turnover_penalty: number;
  cost_bps: number;
  start_date: string;
  end_date: string;
  initial_capital: number;
  compare_id?: string;
}

export interface KPI {
  label: string;
  value: string;
  color: string;
  vs_text: string;
  tooltip: string;
}

export interface GateCheck {
  name: string;
  passed: boolean;
}

export interface ChartSeries {
  dates: string[];
  values: number[];
  name: string;
}

export interface BacktestResult {
  status: string;
  kpis: KPI[];
  gates: GateCheck[];
  gates_passed: number;
  gates_total: number;
  equity: {
    strategy: ChartSeries;
    spy: ChartSeries;
    drawdown: ChartSeries;
    compare: ChartSeries | null;
  };
  heatmap: { years: string[]; months: string[]; values: (number | null)[][] };
  distribution: { bins: number[]; var_95: number; cvar_95: number; mean: number };
  rolling_sharpe: { strategy: ChartSeries; compare: ChartSeries | null };
  yearly: { years: string[]; strategy: number[]; benchmark: number[]; compare: number[] | null; compare_name: string };
  factor: { names: string[]; betas: number[]; alpha: number; r2: number };
  stats: { metric: string; value: string; compare_value: string }[];
  compare_name: string;
}

export interface Strategy {
  id: string;
  cat: string;
  icon: string;
  name: string;
  desc: string;
  ic: string;
  hold: string;
  tags: string[];
  needs_data?: boolean;
  w_mom?: number;
  w_accel?: number;
  w_quality?: number;
  w_vol?: number;
  long_n?: number;
  short_n?: number;
  long_pct?: number;
  short_pct?: number;
}

export async function login(username: string, password: string) {
  const res = await api.post("/auth/login", { username, password });
  localStorage.setItem("token", res.data.token);
  localStorage.setItem("user", res.data.username);
  return res.data;
}

export async function getStrategies(): Promise<{ strategies: Strategy[]; cat_colors: Record<string, string> }> {
  const res = await api.get("/strategies/list");
  return res.data;
}

export async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
  const res = await api.post("/backtest/run", params);
  return res.data;
}

export async function getDataRange(): Promise<{ min: string; max: string; today: string }> {
  const res = await api.get("/backtest/data-range");
  return res.data;
}

// ── Advanced analysis types ─────────────────────────────────────────

export interface WalkForwardWindow {
  window: number;
  is_period: string;
  oos_period: string;
  best_params: { w_mom: number; w_accel: number; w_quality: number; w_vol: number };
  is_sharpe: number;
  is_cagr: number;
  oos_sharpe: number;
  oos_cagr: number;
  oos_mdd: number;
  oos_sortino: number;
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  oos_equity: { dates: string[]; values: number[] };
  summary: {
    total_windows: number;
    avg_is_sharpe: number;
    avg_oos_sharpe: number;
    decay: number;
    decay_ratio: number;
    best_window: number;
    worst_window: number;
  };
  error?: string;
}

export interface OptimizeEntry {
  w_mom: number; w_accel: number; w_quality: number; w_vol: number;
  sharpe: number; sortino: number; cagr: number; mdd: number;
  calmar: number; win_rate: number; alpha: number; score: number;
}

export interface OptimizeResult {
  best: OptimizeEntry | null;
  top_10: OptimizeEntry[];
  total_evaluated: number;
  heatmap: { w_mom: number; w_accel: number; score: number }[];
}

export interface StressScenario {
  id: string; name: string; period: string; available: boolean;
  months?: number; strat_return?: number; spy_return?: number;
  excess?: number; mdd?: number;
  equity?: { dates: string[]; strategy: number[]; spy: number[] };
}

export interface StressTestResult {
  scenarios: StressScenario[];
  error?: string;
}

export interface SensitivityPoint {
  value: number; sharpe: number; sortino: number; cagr: number;
  mdd: number; calmar: number; alpha: number;
}

export interface SensitivityResult {
  param_name: string;
  results: SensitivityPoint[];
}

// ── Advanced analysis API calls ─────────────────────────────────────
// Direct to backend (bypass Next.js rewrite proxy which has ~30s timeout)

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const advancedApi = axios.create({ baseURL: `${backendUrl}/api`, timeout: 300000 });

advancedApi.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function runWalkForward(params: Record<string, unknown>): Promise<WalkForwardResult> {
  const res = await advancedApi.post("/advanced/walk-forward", params);
  return res.data;
}

export async function runOptimize(params: Record<string, unknown>): Promise<OptimizeResult> {
  const res = await advancedApi.post("/advanced/optimize", params);
  return res.data;
}

export async function runStressTest(params: Record<string, unknown>): Promise<StressTestResult> {
  const res = await advancedApi.post("/advanced/stress-test", params);
  return res.data;
}

export async function runSensitivity(params: Record<string, unknown>): Promise<SensitivityResult> {
  const res = await advancedApi.post("/advanced/sensitivity", params);
  return res.data;
}

// ── Factor Library types & API ───────────────────────────────────────

export interface Factor {
  id: string; name: string; category: string; source: string;
  sharpe: number; alpha: number; r2: number; mdd: number;
  oos_sharpe: number; decay: number; crowding: string;
  trend: string; status: string; description: string;
}

export interface CorrelationMatrix {
  labels: string[];
  values: number[][];
}

export interface FactorsData {
  factors: Factor[];
  correlation: CorrelationMatrix;
}

export async function getFactors(): Promise<FactorsData> {
  const res = await api.get("/factors/library");
  return res.data;
}

// ── Research Library types & API ─────────────────────────────────────

export interface ResearchTopic {
  id: string; title: string; category: string; icon: string;
  abstract: string; status: string; tags: string[];
  findings: string[]; methodology: string; data_sources: string[];
}

export interface ResearchData {
  topics: ResearchTopic[];
}

export async function getResearch(): Promise<ResearchData> {
  const res = await api.get("/research/library");
  return res.data;
}

// ── Audit Dashboard types & API ──────────────────────────────────────

export interface AuditStrategy {
  name: string; rating: string; gates: number;
  sharpe: number; is_sharpe: number; oos_sharpe: number;
  decay: number; mdd: number; calmar: number;
  alpha: number; r2: number; sortino: number;
}

export interface AuditCheck {
  id: string; name: string; status: string; detail: string;
}

export interface AuditData {
  date: string;
  strategies: AuditStrategy[];
  phase3_checks: AuditCheck[];
  phase4_checks: AuditCheck[];
  cost_model: { model: string; commission: number; spread: number; impact: number; borrow: number; sec_fee: number };
  summary: { total: number; a: number; b: number; c: number; d: number };
}

export async function getAudit(): Promise<AuditData> {
  const res = await api.get("/audit/summary");
  return res.data;
}

// ── Code IDE types & API ─────────────────────────────────────────────

export interface CodeTemplate {
  id: string; name: string; description: string; code: string;
}

export interface CodeRunResult {
  status?: string;
  mode?: string;
  elapsed?: number;
  error?: string;
  traceback?: string;
  stdout?: string;
  metrics?: Record<string, number>;
  is_metrics?: Record<string, number>;
  oos_metrics?: Record<string, number>;
  sharpe_decay?: number;
  gates?: { name: string; passed: boolean; value: number }[];
  gates_passed?: number;
  calmar?: number;
  dsr_z?: number;
  attribution?: { alpha: number; r2: number; betas: Record<string, number> };
  tail?: Record<string, number>;
  equity?: { dates: string[]; values: number[] };
  heatmap?: { year: number; month: number; return: number }[];
  signal_shape?: number[];
  signal_coverage?: number;
  research?: { title?: string; description?: string; results?: Record<string, unknown>[] };
}

export interface SourceFile {
  path: string; name: string; category: string;
}

export async function getTemplates(): Promise<{ templates: CodeTemplate[] }> {
  const res = await api.get("/code/templates");
  return res.data;
}

export async function runCode(code: string, mode: string, params?: Record<string, unknown>): Promise<CodeRunResult> {
  const res = await advancedApi.post("/code/run", { code, mode, params });
  return res.data;
}

export async function getSourceFiles(): Promise<{ files: SourceFile[] }> {
  const res = await api.get("/code/files");
  return res.data;
}

export async function getSourceCode(sourceId: string): Promise<{ id: string; code?: string; error?: string }> {
  const res = await api.get(`/code/source/${sourceId}`);
  return res.data;
}

// ── Open Source Credits types & API ──────────────────────────────────

export interface CreditProject {
  name: string;
  author: string;
  github: string;
  stars: string;
  license: string;
  description: string;
  usage: string;
  tags: string[];
}

export interface CreditCategory {
  id: string;
  title: string;
  icon: string;
  projects: CreditProject[];
}

export interface CreditsData {
  categories: CreditCategory[];
  total_projects: number;
  summary: Record<string, number>;
}

export async function getCredits(): Promise<CreditsData> {
  const res = await api.get("/credits/credits");
  return res.data;
}

export default api;
