const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const GITHUB_TOKEN = process.env.GH_PAT;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TALENT_WALLET = process.env.TALENT_WALLET || "";
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "Katomoto";
const REPO = process.env.GITHUB_REPOSITORY || "Katomoto/onchain-builder-radar";

const ONCHAIN_KEYWORDS = ["base", "ethereum", "solana", "web3", "defi", "nft", "onchain", "evm", "hardhat", "foundry", "wagmi", "viem", "ethers"];
const HEADERS_GITHUB = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "onchain-builder-radar"
};

async function searchOnchainRepos() {
  const query = ONCHAIN_KEYWORDS.slice(0, 5).map(k => `topic:${k}`).join(" OR ");
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query + " pushed:>" + getYesterday())}&sort=updated&per_page=50`;
  const res = await fetch(url, { headers: HEADERS_GITHUB });
  const data = await res.json();
  return data.items || [];
}

async function getRepoCommitsToday(owner, repo) {
  try {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?since=${since.toISOString()}&per_page=10`;
    const res = await fetch(url, { headers: HEADERS_GITHUB });
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

async function getNpmDownloads(packageName) {
  try {
    const res = await fetch(`https://api.npmjs.org/downloads/point/last-week/${packageName}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.downloads || 0;
  } catch {
    return 0;
  }
}

async function getDefiLlamaTVL(protocol) {
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${protocol}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.tvl ? data.tvl[data.tvl.length - 1]?.totalLiquidityUSD || null : null;
  } catch {
    return null;
  }
}

async function buildBuilderProfiles(repos) {
  const builderMap = {};

  for (const repo of repos.slice(0, 30)) {
    const owner = repo.owner?.login;
    if (!owner || owner === "github" || owner === "topics") continue;

    if (!builderMap[owner]) {
      builderMap[owner] = {
        username: owner,
        avatar: repo.owner?.avatar_url,
        repos: [],
        totalStars: 0,
        totalForks: 0,
        languages: {},
        topics: [],
        commitsToday: 0,
        npmDownloads: 0,
        tvl: null,
        score: 0
      };
    }

    const b = builderMap[owner];
    b.repos.push(repo.name);
    b.totalStars += repo.stargazers_count || 0;
    b.totalForks += repo.forks_count || 0;
    if (repo.language) b.languages[repo.language] = (b.languages[repo.language] || 0) + 1;
    if (repo.topics) b.topics = [...new Set([...b.topics, ...repo.topics])];

    const commits = await getRepoCommitsToday(owner, repo.name);
    b.commitsToday += commits;

    const npmTry = await getNpmDownloads(repo.name);
    b.npmDownloads += npmTry;
  }

  return Object.values(builderMap).slice(0, 10);
}

function calculateScore(builder) {
  let score = 0;
  score += Math.min(builder.totalStars * 2, 40);
  score += Math.min(builder.commitsToday * 5, 20);
  score += Math.min(builder.totalForks * 1.5, 15);
  score += Math.min(builder.npmDownloads / 100, 10);
  score += builder.topics.length > 3 ? 5 : 0;
  score += builder.tvl ? 10 : 0;
  return Math.round(Math.min(score, 100));
}

async function generateAIReport(builders) {
  const buildersText = builders.map((b, i) => 
    `${i+1}. ${b.username} | Stars: ${b.totalStars} | Commits today: ${b.commitsToday} | Score: ${b.score} | Topics: ${b.topics.slice(0,5).join(", ")} | Repos: ${b.repos.slice(0,3).join(", ")}`
  ).join("\n");

  const today = new Date().toISOString().split("T")[0];
  const isWeeklyReport = new Date().getDay() === 5;

  const prompt = isWeeklyReport 
    ? `You are an expert Web3 analyst. Today is ${today} (Friday — weekly report day).
Analyze these top onchain builders from GitHub and write a WEEKLY BUILDER REPORT.

Builders:
${buildersText}

Write a structured report with:
1. 🏆 Builder of the Week (pick the best one, explain why in 3 sentences)
2. 📊 Weekly Trends (what patterns do you see in the onchain dev ecosystem this week)
3. 🚀 Ones to Watch (2-3 builders who are rising fast)
4. 💡 Ecosystem Insight (one key insight about the current state of onchain development)
5. 📈 Score Breakdown (brief table of all builders with scores)

Keep it sharp, data-driven, and useful for Web3 investors and developers. Max 600 words.`
    : `You are an expert Web3 analyst. Today is ${today}.
Analyze these top onchain builders discovered on GitHub today:

${buildersText}

Write a DAILY BUILDER REPORT with:
1. 🔥 Today's Most Active Builder (who stands out and why)
2. 🛠️ What They're Building (key projects and their potential)
3. 📡 Ecosystem Signal (what does today's activity tell us about the onchain dev space)
4. ⚡ Quick Stats Summary (bullet points of key numbers)
5. 🎯 One to Follow (your pick for most promising builder today)

Be concise, insightful, and data-driven. Max 400 words.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `https://github.com/${REPO}`,
      "X-Title": "Onchain Builder Radar"
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "AI analysis unavailable.";
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getTopLanguages(builders) {
  const langCount = {};
  builders.forEach(b => {
    Object.entries(b.languages).forEach(([lang, count]) => {
      langCount[lang] = (langCount[lang] || 0) + count;
    });
  });
  return Object.entries(langCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([lang]) => lang);
}

async function saveReport(builders, aiReport) {
  const today = new Date().toISOString().split("T")[0];
  const isWeekly = new Date().getDay() === 5;
  const reportDir = "reports";

  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const topLanguages = getTopLanguages(builders);
  const avgScore = Math.round(builders.reduce((s, b) => s + b.score, 0) / builders.length);
  const totalCommits = builders.reduce((s, b) => s + b.commitsToday, 0);
  const totalStars = builders.reduce((s, b) => s + b.totalStars, 0);

  const report = {
    date: today,
    type: isWeekly ? "weekly" : "daily",
    generated_at: new Date().toISOString(),
    wallet: TALENT_WALLET,
    stats: {
      builders_tracked: builders.length,
      total_commits_today: totalCommits,
      total_stars: totalStars,
      avg_score: avgScore,
      top_languages: topLanguages
    },
    builders: builders.map(b => ({
      username: b.username,
      avatar: b.avatar,
      score: b.score,
      totalStars: b.totalStars,
      totalForks: b.totalForks,
      commitsToday: b.commitsToday,
      npmDownloads: b.npmDownloads,
      tvl: b.tvl,
      repos: b.repos.slice(0, 5),
      topics: b.topics.slice(0, 8),
      topLanguage: Object.entries(b.languages).sort((a,b) => b[1]-a[1])[0]?.[0] || "Unknown"
    })),
    ai_report: aiReport
  };

  const filename = `${reportDir}/${today}${isWeekly ? "-weekly" : ""}.json`;
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`✅ Report saved: ${filename}`);

  // Update index
  updateIndex(today, isWeekly, report.stats, builders[0]?.username);

  return filename;
}

function updateIndex(date, isWeekly, stats, topBuilder) {
  const indexPath = "reports/index.json";
  let index = { reports: [], last_updated: "" };

  if (fs.existsSync(indexPath)) {
    try { index = JSON.parse(fs.readFileSync(indexPath, "utf8")); } catch {}
  }

  const entry = { date, type: isWeekly ? "weekly" : "daily", stats, top_builder: topBuilder };
  index.reports = index.reports.filter(r => r.date !== date);
  index.reports.unshift(entry);
  index.reports = index.reports.slice(0, 90);
  index.last_updated = new Date().toISOString();

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log("✅ Index updated");
}

async function main() {
  console.log("🚀 Onchain Builder Radar starting...");
  console.log(`📅 Date: ${new Date().toISOString()}`);

  try {
    console.log("🔍 Searching onchain repos...");
    const repos = await searchOnchainRepos();
    console.log(`Found ${repos.length} repos`);

    console.log("👤 Building profiles...");
    const builders = await buildBuilderProfiles(repos);

    builders.forEach(b => { b.score = calculateScore(b); });
    builders.sort((a, b) => b.score - a.score);

    console.log("🤖 Generating AI report...");
    const aiReport = await generateAIReport(builders);

    console.log("💾 Saving report...");
    await saveReport(builders, aiReport);

    console.log("🎉 Done! Report generated successfully.");
    console.log(`Top builder today: ${builders[0]?.username} (score: ${builders[0]?.score})`);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
