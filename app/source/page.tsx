"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import NavShell from "@/components/NavShell";
import PanelUnavailable from "@/components/PanelUnavailable";
import { fetchPanel, type BackendFailure } from "@/lib/backendStatus";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface SourceFile { path: string; name: string; category: string; }

export default function SourcePage() {
  const router = useRouter();
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("vs-dark");
  const [failure, setFailure] = useState<BackendFailure | null>(null);

  // Was: .catch(() => setFiles([])), which renders exactly like a repository
  // that genuinely contains no source files.
  const load = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/login"); return; }
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "vs-dark" : "light");
    setFailure(null);
    const res = await fetchPanel<{ files?: SourceFile[] }>("/api/code/files");
    if (!res.ok) { setFailure(res.failure); setFiles([]); return; }
    setFiles(res.data.files || []);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const loadFile = async (path: string) => {
    setLoading(true); setSelectedFile(path);
    try {
      const t = localStorage.getItem("token");
      const res = await fetch(`/api/code/source/file:${path}`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      setCode(data.code || data.error || "Error loading file");
    } catch { setCode("Failed to load"); }
    finally { setLoading(false); }
  };

  const grouped: Record<string, SourceFile[]> = {};
  files.forEach(f => { if (!grouped[f.category]) grouped[f.category] = []; grouped[f.category].push(f); });

  if (failure) {
    return (
      <NavShell>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold mb-4">Source Viewer</h1>
          <PanelUnavailable
            failure={failure}
            panel="Source viewer"
            needs="the /api/code routes"
            onRetry={load}
          />
        </div>
      </NavShell>
    );
  }

  return (
    <NavShell>
      <div className="flex h-[calc(100vh-48px)]">
        {/* File tree */}
        <div className="w-56 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
          <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Source Files</div>
          {Object.entries(grouped).map(([cat, catFiles]) => (
            <div key={cat} className="mb-2">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">{cat}</div>
              {catFiles.map(f => (
                <button key={f.path} onClick={() => loadFile(f.path)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition ${
                    selectedFile === f.path
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{f.path}</div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Code viewer */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-3">
            <span className="text-sm font-medium font-mono">{selectedFile || "Select a file"}</span>
            <div className="flex-1" />
            {selectedFile && (
              <button onClick={() => { router.push("/ide"); }}
                className="text-xs px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition">
                Open in IDE
              </button>
            )}
          </div>
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>
            ) : selectedFile ? (
              <MonacoEditor
                height="100%"
                language="python"
                theme={theme}
                value={code}
                options={{
                  readOnly: true,
                  fontSize: 13,
                  minimap: { enabled: true },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 8 },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Select a file from the sidebar to view source code
              </div>
            )}
          </div>
        </div>
      </div>
    </NavShell>
  );
}
