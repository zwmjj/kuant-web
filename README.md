# kuant-web

**Next.js 16 + Tailwind + Recharts** research dashboard for the
[Kuant quant platform](https://github.com/zwmjj/kuant-core).
20 panels covering live monitoring, factor research, multi-agent
control, strategy library, backtester, IDE, and audit reports.

## Ecosystem

This is one of **six open-source repositories** that together form a
complete quant research platform. Total ~55,000 LOC, MIT licensed.

| Repo | Role | LOC |
|---|---|---|
| [`alt-data-research`](https://github.com/zwmjj/alt-data-research) ⭐ | SEC NLP + 13F alt-data alpha — **t-stat 2.11, ICIR 0.80** | ~2.5k |
| [`kuant-research`](https://github.com/zwmjj/kuant-research) | 14 reproducible empirical studies with committed expected outputs | ~3k |
| [`kuant-core`](https://github.com/zwmjj/kuant-core) | Production quant research library — 28+ factors, walk-forward CV, 5 cost models, US + CN A-share | ~20k |
| [`kuant-strategies`](https://github.com/zwmjj/kuant-strategies) | 25+ strategies built on kuant-core: momentum, mean-rev, crypto, options, ML, alt-data | ~17k |
| [`kuant-api`](https://github.com/zwmjj/kuant-api) | FastAPI research backend — 20 routers, Monaco IDE, WebSocket, JWT auth | ~5k |
| **`kuant-web`** (this repo) | Next.js 16 + Tailwind + Recharts dashboard — 20 panels | ~7k |

## Panels (20)

| Panel | Role |
|---|---|
| `/dashboard`  | Home overview — portfolio equity, latest strategy runs, risk gauges |
| `/login`      | JWT auth against `kuant-api` |
| `/strategies` | Strategy library — 25+ strategies with backtest summaries |
| `/factors`    | Factor catalogue with IC/ICIR and correlation heatmap |
| `/factor`     | Single-factor deep dive (tear sheet, quantile sort, rolling IC) |
| `/backtest`   | Interactive backtest — param sliders + instant Recharts equity curve |
| `/analysis`   | Walk-forward CV, optimize, stress test, attribution |
| `/research`   | 14 research studies with interactive charts |
| `/audit`      | Phase 3+4 SOP audit dashboard |
| `/sop`        | Strategy-of-production gate-check visualizer |
| `/risk`       | VaR / CVaR / drawdown / tail risk panel |
| `/monitor`    | Real-time WebSocket price + signal stream |
| `/trading`    | Live trading controls (paper) |
| `/agents`     | Multi-agent system control center (start / stop / parallel launch) |
| `/reports`    | Research report viewer + export (PDF / CSV / MD) |
| `/ide`        | Monaco code editor for custom strategies (backend: /code router) |
| `/source`     | In-browser source code viewer for qf + strategies |
| `/credits`    | Usage / credit tracking |
| `/docs`       | In-app API docs |

All panels talk to the [`kuant-api`](https://github.com/zwmjj/kuant-api)
FastAPI backend via `lib/api.ts`. No data is hardcoded — everything
is fetched at runtime.

## Quickstart

```bash
git clone https://github.com/zwmjj/kuant-web
cd kuant-web
npm install

# Point at your kuant-api backend (local or deployed)
cp .env.example .env.local
# edit .env.local with NEXT_PUBLIC_API_URL=http://your-api-host:8000

npm run dev
# → http://localhost:3000
```

## Environment variables

See `.env.example`. The only required variable is
`NEXT_PUBLIC_API_URL` pointing at a running `kuant-api` instance.
Everything else is derived at runtime from the API responses.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** strict mode
- **Tailwind CSS** (utility-first, dark mode via `class` strategy)
- **Recharts** (all plots — equity curves, IC time series, drawdown,
  factor correlation heatmaps)
- **Monaco Editor** (the /ide panel's code editor)
- **axios** (API client with JWT interceptor)

## Project layout

```
kuant-web/
├── app/                          # Next.js App Router (20 panels)
│   ├── dashboard/
│   ├── strategies/
│   ├── factors/
│   ├── factor/
│   ├── backtest/
│   ├── analysis/
│   ├── research/
│   ├── audit/
│   ├── sop/
│   ├── risk/
│   ├── monitor/
│   ├── trading/
│   ├── agents/
│   ├── reports/
│   ├── ide/
│   ├── source/
│   ├── credits/
│   ├── docs/
│   ├── login/
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                  # "/" landing
├── components/                   # NavShell, KpiGrid, chart wrappers, tables
├── lib/
│   └── api.ts                    # axios client with JWT interceptor
├── public/                       # static assets
├── next.config.ts                # rewrites /api/* → backend
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Secrets policy

This repo **never** contains:
- API keys or backend URLs (the only URL lives in `.env.local`)
- JWT tokens (only read from `localStorage` at runtime)
- Vercel / deployment-specific IDs (`.vercel/` is gitignored)
- `node_modules` or build output (`.next/` is gitignored)

## License

MIT. See `LICENSE`.
