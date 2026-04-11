"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavShell from "@/components/NavShell";

interface DownloadFile {
  name: string; label: string; description: string;
  size: number; type: string; endpoint: string; rating?: string;
}

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

const TYPE_ICONS: Record<string, string> = {
  package: "📦", report: "📄", factor: "🧬", strategy: "📊",
  research: "🔬", feature: "⚙️",
};

const RATING_COLORS: Record<string, string> = {
  A: "bg-emerald-500", B: "bg-blue-500", C: "bg-amber-500", D: "bg-red-500", "N/A": "bg-slate-400",
};

export default function DocsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [readme, setReadme] = useState("");
  const [tab, setTab] = useState<"all" | "factors" | "strategies" | "research" | "features" | "readme">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    fetch("/api/downloads/list", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setFiles(d.files || [])).catch(() => {});
    fetch("/api/downloads/readme", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.text()).then(setReadme).catch(() => {});
  }, [router]);

  const download = async (endpoint: string, filename: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/downloads/${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = files.filter(f => {
    if (tab !== "all" && tab !== "readme") {
      if (tab === "factors" && f.type !== "factor") return false;
      if (tab === "strategies" && f.type !== "strategy") return false;
      if (tab === "research" && f.type !== "research") return false;
      if (tab === "features" && f.type !== "feature") return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return f.label.toLowerCase().includes(s) || f.description.toLowerCase().includes(s);
    }
    return true;
  });

  const packages = filtered.filter(f => f.type === "package");
  const reports = filtered.filter(f => f.type === "report");
  const items = filtered.filter(f => !["package", "report"].includes(f.type) && f.name && f.size > 0);

  const typeCounts: Record<string, number> = {};
  files.forEach(f => { typeCounts[f.type] = (typeCounts[f.type] || 0) + 1; });

  return (
    <NavShell>
      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Open Source Downloads</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {files.length} packages — Each factor, strategy, research study, and feature module individually downloadable with README + code + results.
            </p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm w-48" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 flex-wrap">
          {[
            { key: "all", label: `All (${files.length})` },
            { key: "factors", label: `Factors (${typeCounts.factor || 0})` },
            { key: "strategies", label: `Strategies (${typeCounts.strategy || 0})` },
            { key: "research", label: `Research (${typeCounts.research || 0})` },
            { key: "features", label: `Features (${typeCounts.feature || 0})` },
            { key: "readme", label: "README" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === t.key ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "readme" ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[70vh] overflow-y-auto">
              {readme || "Loading..."}
            </pre>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Full package */}
            {packages.map(f => (
              <div key={f.name} className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">{f.label}</div>
                    <div className="text-sm opacity-80 mt-1">{f.description}</div>
                    <div className="text-xs opacity-60 mt-2">{fmtSize(f.size)}</div>
                  </div>
                  <button onClick={() => download(f.endpoint, f.name)}
                    className="px-6 py-2.5 bg-white text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download All
                  </button>
                </div>
              </div>
            ))}

            {/* Reports */}
            {reports.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {reports.map(f => (
                  <button key={f.name} onClick={() => download(f.endpoint, f.name)}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-indigo-400 hover:shadow-md transition">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📄</span>
                      <div>
                        <div className="font-bold text-sm">{f.label}</div>
                        <div className="text-[10px] text-slate-400">{fmtSize(f.size)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Individual items */}
            {items.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-3 border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 font-medium">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-4">Name</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1 text-center">Rating</div>
                  <div className="col-span-1 text-right">Size</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>
                {items.map((f, idx) => (
                  <div key={`${f.type}-${f.name}-${idx}`} className="grid grid-cols-12 gap-2 p-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 items-center text-sm">
                    <div className="col-span-1 text-lg">{TYPE_ICONS[f.type] || "📁"}</div>
                    <div className="col-span-4 font-medium truncate">{f.label}</div>
                    <div className="col-span-3 text-xs text-slate-400 truncate">{f.description}</div>
                    <div className="col-span-1 text-center">
                      {f.rating && f.rating !== "N/A" && (
                        <span className={`${RATING_COLORS[f.rating] || ""} text-white text-[10px] font-bold px-1.5 py-0.5 rounded`}>
                          {f.rating}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 text-right text-xs text-slate-400">{fmtSize(f.size)}</div>
                    <div className="col-span-2 text-right">
                      <button onClick={() => download(f.endpoint, f.name)}
                        className="text-xs px-3 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition">
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick start */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-5 mt-4">
              <h3 className="text-sm font-bold mb-3">Quick Start</h3>
              <pre className="text-xs font-mono bg-slate-900 rounded-lg p-4 overflow-x-auto text-green-400">{`# Clone or unzip any package, then:
pip install -r requirements.txt
cd web && npm install && cd ..

# Backend:  python -m uvicorn api.main:app --port 8000
# Frontend: cd web && npm run dev
# Open:     http://localhost:3000  (kuan / quant2024)`}</pre>
            </div>
          </div>
        )}
      </div>
    </NavShell>
  );
}
