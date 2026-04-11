"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCredits, type CreditProject, type CreditCategory } from "@/lib/api";
import NavShell from "@/components/NavShell";

const CAT_GRADIENTS: Record<string, string> = {
  frameworks: "from-indigo-500 to-purple-600",
  backtesting: "from-cyan-500 to-blue-600",
  research: "from-amber-500 to-orange-600",
  data: "from-emerald-500 to-teal-600",
  trading: "from-rose-500 to-pink-600",
  core: "from-slate-500 to-gray-600",
};

const TAG_COLORS: Record<string, string> = {
  ML: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  Factor: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  Portfolio: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  "A-Share": "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  DRL: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  HFT: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
  Backtest: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  Data: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  Live: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  UI: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
  API: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
};

function GitHubIcon() {
  return (
    <svg className="w-4 h-4 inline-block" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-3 h-3 inline-block" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
    </svg>
  );
}

function ProjectCard({ project }: { project: CreditProject }) {
  return (
    <div className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-400/5 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <GitHubIcon />
            <span className="truncate">{project.name}</span>
          </a>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{project.author}</p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {project.stars && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <StarIcon /> {project.stars}
            </span>
          )}
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            {project.license}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
        {project.description}
      </p>

      {/* Usage in Kuant */}
      <div className="text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 mb-3 text-slate-500 dark:text-slate-400 italic">
        <span className="not-italic font-semibold text-indigo-600 dark:text-indigo-400">Kuant:</span> {project.usage}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TAG_COLORS[tag] || "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CreditsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ categories: CreditCategory[]; total_projects: number; summary: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    getCredits()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <NavShell><div className="flex items-center justify-center h-[80vh] text-slate-400">Loading...</div></NavShell>;
  }

  if (!data) {
    return <NavShell><div className="flex items-center justify-center h-[80vh] text-red-400">Failed to load credits data</div></NavShell>;
  }

  return (
    <NavShell>
      <div className="max-w-7xl mx-auto px-5 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Open Source Credits
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
            Kuant is built on the shoulders of {data.total_projects} incredible open-source projects.
            We are deeply grateful to every contributor and maintainer.
          </p>

          {/* Summary badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            {Object.entries(data.summary).map(([key, count]) => (
              <div
                key={key}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{count}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        {data.categories.map((cat) => (
          <section key={cat.id} className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className={`text-xl font-bold bg-gradient-to-r ${CAT_GRADIENTS[cat.id] || "from-slate-500 to-gray-600"} bg-clip-text text-transparent`}>
                {cat.title}
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {cat.projects.length} projects
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cat.projects.map((project) => (
                <ProjectCard key={project.name} project={project} />
              ))}
            </div>
          </section>
        ))}

        {/* Footer */}
        <div className="text-center py-10 border-t border-slate-200 dark:border-slate-700 mt-6">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Built with open source. Thank you to every contributor.
          </p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
            If we missed attributing your project, please let us know.
          </p>
        </div>
      </div>
    </NavShell>
  );
}
