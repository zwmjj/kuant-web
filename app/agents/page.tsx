"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";
import { backendPath } from "@/lib/backend";

/* ─── 类型定义 ─── */

// Agent 定义
interface AgentDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// Agent 运行时状态
type AgentStatus = "idle" | "running" | "offline";

interface AgentState {
  id: string;
  status: AgentStatus;
  lastRunAt: string | null;   // ISO timestamp
  lastDuration: number | null; // seconds
}

// 任务
interface Task {
  task_id: string;
  agent: string;
  prompt: string;
  status: "running" | "completed" | "failed";
  started: string;   // ISO
  duration: number | null; // seconds
  output: string | null;
}

// 活动日志条目
interface LogEntry {
  id: string;
  time: string;
  agent: string;
  event: "started" | "completed" | "failed";
  duration: number | null;
}

/* ─── Agent 元数据 ─── */
const AGENTS: AgentDef[] = [
  { id: "data-agent",     name: "Data Agent",     icon: "📊", description: "Data collection and cleaning — market, fundamental and alternative data" },
  { id: "signal-agent",   name: "Signal Agent",   icon: "📈", description: "Factor computation and signal generation — multi-factor scoring and ranking" },
  { id: "strategy-agent", name: "Strategy Agent",  icon: "🎯", description: "Strategy backtesting and optimization — portfolio construction and risk control" },
  { id: "api-agent",      name: "API Agent",      icon: "🔌", description: "External API integration — broker order routing and data-source plumbing" },
  { id: "web-agent",      name: "Web Agent",      icon: "🖥️", description: "Frontend automation — report generation and page deployment" },
  { id: "ml-agent",       name: "ML Agent",       icon: "🤖", description: "ML model training — feature engineering and prediction" },
];

/* ─── 模拟数据生成 ─── */

// 生成模拟任务历史
function generateMockTasks(): Task[] {
  const statuses: Task["status"][] = ["completed", "completed", "failed", "completed", "running", "completed"];
  const prompts = [
    "Fetch 5 years of AAPL daily bars",
    "Compute the IC of the momentum factor",
    "Run the multi-factor strategy backtest, 2020-2025",
    "Connect to Alpaca for live market data",
    "Generate this week's strategy report",
    "Train the GBDT return-prediction model",
    "Fetch factor data for the full China A-share market",
    "Compute the signal heatmap",
  ];
  const tasks: Task[] = [];
  const now = Date.now();
  for (let i = 0; i < 8; i++) {
    const agentDef = AGENTS[i % AGENTS.length];
    const status = statuses[i % statuses.length];
    const started = new Date(now - (8 - i) * 600_000).toISOString();
    const duration = status === "running" ? null : Math.floor(5 + Math.random() * 120);
    tasks.push({
      task_id: `task-${String(i + 1).padStart(3, "0")}`,
      agent: agentDef.id,
      prompt: prompts[i % prompts.length],
      status,
      started,
      duration,
      output: status === "completed"
        ? `Completed. Processed ${Math.floor(100 + Math.random() * 9900)} records in ${duration}s with no errors. (Demo output.)`
        : status === "failed"
          ? "Error: connection timed out; check the network and retry.\nTraceback: TimeoutError at line 42 (demo output.)"
          : null,
    });
  }
  return tasks;
}

// 生成模拟活动日志
function generateMockLogs(): LogEntry[] {
  const events: LogEntry["event"][] = ["started", "completed", "started", "failed", "completed", "started", "completed", "completed"];
  const logs: LogEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < 12; i++) {
    const agentDef = AGENTS[i % AGENTS.length];
    const event = events[i % events.length];
    logs.push({
      id: `log-${i}`,
      time: new Date(now - (12 - i) * 300_000).toISOString(),
      agent: agentDef.name,
      event,
      duration: event === "completed" ? Math.floor(3 + Math.random() * 60) : null,
    });
  }
  return logs;
}

// 根据任务推算 agent 状态
function deriveAgentStates(tasks: Task[]): AgentState[] {
  return AGENTS.map((a) => {
    const agentTasks = tasks.filter((t) => t.agent === a.id);
    const running = agentTasks.some((t) => t.status === "running");
    const lastCompleted = agentTasks
      .filter((t) => t.status !== "running")
      .sort((x, y) => new Date(y.started).getTime() - new Date(x.started).getTime())[0];
    // 模拟：部分 agent 离线
    const isOffline = a.id === "ml-agent" && !running;
    return {
      id: a.id,
      status: running ? "running" : isOffline ? "offline" : "idle",
      lastRunAt: lastCompleted?.started ?? null,
      lastDuration: lastCompleted?.duration ?? null,
    } as AgentState;
  });
}

/* ─── 工具函数 ─── */

// 格式化时间为 HH:MM:SS
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// 格式化耗时
function fmtDuration(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// 截断字符串
function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

// 状态颜色映射
const STATUS_COLOR: Record<string, string> = {
  running: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

const STATUS_BG: Record<string, string> = {
  running: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

const EVENT_COLOR: Record<string, string> = {
  started: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

/* ─── Backend API base ─── */
const API_BASE = backendPath("/api/agents");

/* ─── 页面组件 ─── */
export default function AgentsPage() {
  const router = useRouter();

  // 数据状态
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [agentStates, setAgentStates] = useState<AgentState[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAgent, setModalAgent] = useState<string>(AGENTS[0].id);       // single-select agent
  const [modalPrompt, setModalPrompt] = useState("");
  const [parallelMode, setParallelMode] = useState(false);                  // parallel mode
  const [parallelAgents, setParallelAgents] = useState<Record<string, { checked: boolean; prompt: string }>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.id, { checked: false, prompt: "" }]))
  );

  // 活动日志自动滚动
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auth gate, then seed the demo dataset
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }

    // Seed the demo dataset
    const mockTasks = generateMockTasks();
    setTasks(mockTasks);
    setLogs(generateMockLogs());
    setAgentStates(deriveAgentStates(mockTasks));
  }, [router]);

  // Keep the log scrolled to the newest entry
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Poll the backend every 3s; fall back to local demo state when it is unreachable
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE}/tasks`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => {
          const list: Task[] = Array.isArray(data) ? data : Array.isArray(data?.tasks) ? data.tasks : [];
          setTasks(list);
          setAgentStates(deriveAgentStates(list));
        })
        .catch(() => {
          // 后端未启动，模拟运行中任务完成
          setTasks((prev) => {
            if (!Array.isArray(prev)) return prev;
            const newLogs: LogEntry[] = [];
            const updated = prev.map((t) => {
              if (t.status !== "running") return t;
              const elapsed = (Date.now() - new Date(t.started).getTime()) / 1000;
              if (elapsed > 30) {
                newLogs.push({
                  id: `log-auto-${Date.now()}-${t.task_id}`,
                  time: new Date().toISOString(),
                  agent: AGENTS.find((a) => a.id === t.agent)?.name || t.agent,
                  event: "completed",
                  duration: Math.floor(elapsed),
                });
                return { ...t, status: "completed" as const, duration: Math.floor(elapsed), output: `Demo run finished in ${Math.floor(elapsed)}s` };
              }
              return t;
            });
            // 在下一个微任务中更新日志和状态，避免嵌套 setState
            if (newLogs.length > 0) {
              setTimeout(() => setLogs((prev) => [...prev, ...newLogs]), 0);
            }
            setTimeout(() => setAgentStates(deriveAgentStates(updated)), 0);
            return updated;
          });
        });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 启动任务
  const startTask = useCallback(async (agentId: string, prompt: string) => {
    const agentDef = AGENTS.find((a) => a.id === agentId)!;
    const newTask: Task = {
      task_id: `task-${Date.now()}`,
      agent: agentId,
      prompt,
      status: "running",
      started: new Date().toISOString(),
      duration: null,
      output: null,
    };

    // 添加到本地状态
    setTasks((prev) => [...prev, newTask]);
    setLogs((prev) => [
      ...prev,
      { id: `log-${Date.now()}`, time: new Date().toISOString(), agent: agentDef.name, event: "started", duration: null },
    ]);

    // 尝试调用后端
    try {
      await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: agentId, prompt }),
      });
    } catch {
      // 后端未启动，静默降级
    }
  }, []);

  // 停止任务（模拟）
  const stopTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const newLogs: LogEntry[] = [];
      const updated = prev.map((t) => {
        if (t.task_id !== taskId) return t;
        const duration = Math.floor((Date.now() - new Date(t.started).getTime()) / 1000);
        newLogs.push({
          id: `log-stop-${Date.now()}`,
          time: new Date().toISOString(),
          agent: AGENTS.find((a) => a.id === t.agent)?.name || t.agent,
          event: "failed",
          duration,
        });
        return { ...t, status: "failed" as const, duration, output: "Stopped by the user" };
      });
      if (newLogs.length > 0) {
        setTimeout(() => setLogs((prev) => [...prev, ...newLogs]), 0);
      }
      return updated;
    });
  }, []);

  // 模态框提交
  const handleModalSubmit = useCallback(() => {
    if (parallelMode) {
      // 并行模式：启动所有勾选的 agent
      Object.entries(parallelAgents).forEach(([agentId, { checked, prompt }]) => {
        if (checked && prompt.trim()) {
          startTask(agentId, prompt.trim());
        }
      });
    } else {
      // 单 agent 模式
      if (modalPrompt.trim()) {
        startTask(modalAgent, modalPrompt.trim());
      }
    }
    // 关闭模态框并重置
    setModalOpen(false);
    setModalPrompt("");
    setParallelMode(false);
    setParallelAgents(Object.fromEntries(AGENTS.map((a) => [a.id, { checked: false, prompt: "" }])));
  }, [parallelMode, parallelAgents, modalAgent, modalPrompt, startTask]);

  // 打开模态框（可预选 agent）
  const openModal = useCallback((preselect?: string) => {
    if (preselect) setModalAgent(preselect);
    setModalOpen(true);
  }, []);

  return (
    <NavShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ═══ Header + quick actions ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agent Control Center</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Orchestration and monitoring panel for the agent fleet</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/25"
          >
            <span className="text-lg">▶</span> Start Agent
          </button>
        </div>

        {/* The task list, the logs and the run outputs below are generated in
            this component. When the backend is reachable the poll replaces
            them with real state; when it is not, they keep ticking on a timer.
            Say which one the visitor is looking at rather than letting
            fabricated task output pass as a running fleet. */}
        <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
          <strong className="font-semibold">Demo data.</strong> This page seeds
          itself with generated task history and log entries, and falls back to
          them whenever <code>{API_BASE}</code> is unreachable. Launching an agent
          from here runs a client-side simulation, not a real job. Connect the
          backend to see live state.
        </div>

        {/* ═══ 主体: 左 2/3 卡片网格 + 右 1/3 活动日志 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* 左侧: Agent 卡片网格 */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {AGENTS.map((agent) => {
              const state = agentStates.find((s) => s.id === agent.id);
              const status = state?.status ?? "offline";
              return (
                <div
                  key={agent.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-3 hover:border-indigo-500/50 transition"
                >
                  {/* 头部: 图标 + 名称 + 状态灯 */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{agent.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{agent.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{agent.id}</div>
                    </div>
                    {/* 状态指示灯 */}
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        status === "running"
                          ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                          : status === "idle"
                            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                            : "bg-slate-500"
                      }`}
                      title={status}
                    />
                  </div>

                  {/* 描述 */}
                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{agent.description}</p>

                  {/* 最近运行信息 */}
                  <div className="text-[10px] text-slate-500 dark:text-slate-600">
                    {state?.lastRunAt ? (
                      <>Last run: {fmtTime(state.lastRunAt)} · {fmtDuration(state.lastDuration)}</>
                    ) : (
                      <>Not run yet</>
                    )}
                  </div>

                  {/* Run 按钮 */}
                  <button
                    onClick={() => openModal(agent.id)}
                    className="mt-auto w-full py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white transition"
                  >
                    ▶ Run
                  </button>
                </div>
              );
            })}
          </div>

          {/* 右侧: 活动日志 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
            <h3 className="text-sm font-bold mb-3">Activity log</h3>
            <div className="flex-1 overflow-y-auto max-h-[420px] space-y-1.5 pr-1 scrollbar-thin">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 text-xs py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  {/* 时间 */}
                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{fmtTime(log.time)}</span>
                  {/* Agent 名 */}
                  <span className="font-semibold text-slate-300 whitespace-nowrap truncate max-w-[80px]">{log.agent}</span>
                  {/* 事件类型 */}
                  <span className={`font-semibold ${EVENT_COLOR[log.event]}`}>{log.event}</span>
                  {/* 耗时 */}
                  {log.duration !== null && (
                    <span className="text-slate-500 ml-auto whitespace-nowrap">{fmtDuration(log.duration)}</span>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* ═══ 底部: 任务列表表格 ═══ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-bold mb-4">Tasks</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-2 text-left">Task ID</th>
                  <th className="pb-2 text-left">Agent</th>
                  <th className="pb-2 text-left">Prompt</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-right">Started</th>
                  <th className="pb-2 text-right">Duration</th>
                  <th className="pb-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks
                  .slice()
                  .sort((a, b) => new Date(b.started).getTime() - new Date(a.started).getTime())
                  .map((task) => (
                    <React.Fragment key={task.task_id}>
                      <tr
                        className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer"
                        onClick={() => setExpandedTask(expandedTask === task.task_id ? null : task.task_id)}
                      >
                        <td className="py-2 font-mono text-xs text-slate-500">{task.task_id}</td>
                        <td className="py-2">
                          <span className="text-xs font-semibold">
                            {AGENTS.find((a) => a.id === task.agent)?.icon}{" "}
                            {AGENTS.find((a) => a.id === task.agent)?.name ?? task.agent}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-slate-400 max-w-[200px] truncate">{truncate(task.prompt, 40)}</td>
                        <td className="py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BG[task.status]}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-2 text-right text-xs font-mono text-slate-500">{fmtTime(task.started)}</td>
                        <td className="py-2 text-right text-xs font-mono text-slate-500">{fmtDuration(task.duration)}</td>
                        <td className="py-2 text-center">
                          {task.status === "running" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); stopTask(task.task_id); }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition"
                            >
                              Stop
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* 展开行: 完整输出 */}
                      {expandedTask === task.task_id && (
                        <tr>
                          <td colSpan={7} className="p-4 bg-slate-50 dark:bg-slate-900/50">
                            <div className="text-xs font-mono whitespace-pre-wrap text-slate-400 max-h-40 overflow-y-auto">
                              <div className="text-[10px] text-slate-500 mb-1 font-sans font-semibold">Full prompt:</div>
                              <div className="mb-2 text-slate-300">{task.prompt}</div>
                              <div className="text-[10px] text-slate-500 mb-1 font-sans font-semibold">Output:</div>
                              <div className={STATUS_COLOR[task.status]}>
                                {task.output ?? (task.status === "running" ? "Running…" : "No output")}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ Status bar ═══ */}
        <div className="flex flex-wrap gap-6 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
          <span>Poll interval: 3s</span>
          <span>Backend: {API_BASE}</span>
          <span>Agents: {AGENTS.length}</span>
          <span>Active tasks: {tasks.filter((t) => t.status === "running").length}</span>
        </div>
      </div>

      {/* ═══ Launch modal ═══ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4">
            {/* 标题 */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Launch an agent</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200 text-xl transition">✕</button>
            </div>

            {/* 并行模式切换 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={parallelMode}
                onChange={(e) => setParallelMode(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-400">Parallel launch (select more than one agent)</span>
            </label>

            {parallelMode ? (
              /* 并行模式: 多选 agent + 各自 prompt */
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {AGENTS.map((agent) => (
                  <div key={agent.id} className="border border-slate-700 rounded-lg p-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={parallelAgents[agent.id]?.checked ?? false}
                        onChange={(e) =>
                          setParallelAgents((prev) => ({
                            ...prev,
                            [agent.id]: { ...prev[agent.id], checked: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-semibold">{agent.icon} {agent.name}</span>
                    </label>
                    {parallelAgents[agent.id]?.checked && (
                      <input
                        type="text"
                        placeholder={`Prompt for ${agent.name}…`}
                        value={parallelAgents[agent.id]?.prompt ?? ""}
                        onChange={(e) =>
                          setParallelAgents((prev) => ({
                            ...prev,
                            [agent.id]: { ...prev[agent.id], prompt: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* 单 agent 模式 */
              <div className="space-y-3">
                {/* Agent 下拉 */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Select an agent</label>
                  <select
                    value={modalAgent}
                    onChange={(e) => setModalAgent(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {AGENTS.map((a) => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                  </select>
                </div>
                {/* Prompt 输入 */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Prompt</label>
                  <textarea
                    rows={3}
                    placeholder="Enter a task instruction…"
                    value={modalPrompt}
                    onChange={(e) => setModalPrompt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/25"
              >
                Launch
              </button>
            </div>
          </div>
        </div>
      )}
    </NavShell>
  );
}

