# ⛓ Onchain Builder Radar

[![Daily Report](https://github.com/Katomoto/onchain-builder-radar/actions/workflows/daily-report.yml/badge.svg)](https://github.com/Katomoto/onchain-builder-radar/actions/workflows/daily-report.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![Built with Node.js](https://img.shields.io/badge/Node.js-22-22d3ee?logo=node.js)](https://nodejs.org)
[![Powered by OpenRouter](https://img.shields.io/badge/AI-OpenRouter-a78bfa?logo=openai)](https://openrouter.ai)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://onchain-builder-radar.vercel.app)

> **Daily AI-powered intelligence on the most active onchain developers.**  
> Auto-updated every day via GitHub Actions. Archive grows forever. 🟩

## 🌐 Live Site
**[onchain-builder-radar.vercel.app](https://onchain-builder-radar.vercel.app)**

## 🔍 What It Does

Every day at 08:00 UTC the bot automatically:

- Scans GitHub for the most active Web3 developers (Base, Ethereum, Solana, DeFi)
- Pulls real metrics — commits, stars, forks, NPM downloads
- Scores each builder 0–100 using a custom algorithm
- Generates an AI analysis report via OpenRouter
- On Fridays publishes a special **Builder of the Week** report
- Commits everything to this repo → your contribution graph stays green 🟩

## 🏗 How It Works
GitHub API ──→ scan onchain repos

│

▼

DeFiLlama API ──→ check TVL data

│

▼

NPM Registry ──→ check package downloads

│

▼

Score Algorithm ──→ rank builders 0-100

│

▼

OpenRouter AI ──→ generate analysis

│

▼

reports/ ──→ commit to GitHub

│

▼

index.html ──→ live site on Vercel

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Automation | GitHub Actions (cron 08:00 + 09:00 UTC) |
| AI Model | OpenRouter Auto |
| Data Sources | GitHub API, DeFiLlama, NPM Registry |
| Frontend | Vanilla JS + Chart.js + Orbitron font |
| Hosting | Vercel |
| Chain | Base (wallet verified) |

## 📁 Project Structure
onchain-builder-radar/

├── bot.js                 # Main bot logic

├── index.html             # Live dashboard

├── package.json           # Dependencies

├── logo.svg               # Project logo

├── reports/

│   ├── index.json         # Archive index

│   ├── YYYY-MM-DD.json    # Daily reports

│   └── YYYY-MM-DD-weekly.json  # Weekly reports

└── .github/

└── workflows/

└── daily-report.yml  # GitHub Actions

## 🔐 Secrets Required

| Secret | Description |
|--------|-------------|
| `GH_PAT` | GitHub Personal Access Token (repo + workflow) |
| `OPENAI_API_KEY` | OpenRouter API key |
| `TALENT_WALLET` | Base wallet address |

## 📊 Builder Scoring Algorithm
Stars      → up to 40 pts  (×2 per star, max 40)

Commits    → up to 20 pts  (×5 per commit today)

Forks      → up to 15 pts  (×1.5 per fork)

NPM DLs    → up to 10 pts  (per 100 downloads/week)

Topics     → 5 pts         (if >3 onchain topics)

TVL        → 10 pts        (if protocol has TVL)

─────────────────────────────

Total      → 0-100 score

## 🚀 Self-Hosted Setup

1. Fork this repo
2. Add 3 secrets in Settings → Secrets → Actions
3. Run Actions manually to generate first report
4. Deploy `index.html` to Vercel
5. Bot runs automatically every day — no server needed

---

Built by [Katomoto](https://github.com/Katomoto) · Powered by GitHub Actions + OpenRouter AI
