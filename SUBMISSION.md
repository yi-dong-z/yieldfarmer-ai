# 📋 Submission Checklist — KeeperHub Agents Onchain Hackathon 2026

> **Project**: YieldFarmer AI  
> **Team**: 赵昱博 (YuBo Zhao) — 单人项目  
> **Submission Status**: 🟡 进行中

---

## 🔗 Submission Links

| Item | Link |
|------|------|
| **DoraHacks Project Page** | [待填写 — DoraHacks 项目链接] |
| **Demo Video (YouTube/Bilibili)** | [待填写 — 30-60秒 Demo 视频链接] |
| **GitHub Repository** | https://github.com/yi-dong-z/yieldfarmer-ai |
| **Live Demo / Deployed URL** | [待填写 — 如已部署，提供前端 URL] |
| **Pitch Deck / Slides** | [待填写 — 路演 PPT 链接] |

---

## 🎬 Demo Video Script (30-60秒)

> **目标时长**: 30-60 秒  
> **建议比例**: 核心功能 40s / Workflows + 收益对比 20s  
> **录制工具**: Loom / OBS / QuickTime

| Time | Segment | Visual | Script (中英双语) |
|------|---------|--------|-------------------|
| **0-5s** | 打开前端 | 浏览器打开 `localhost:3000`，展示聊天界面 | 🎙️ "This is YieldFarmer AI — tell it what you want in natural language, and it executes onchain." |
| **5-10s** | 输入 NL 命令 | 在聊天框输入: `Supply 0.01 ETH to Aave V3 on Sepolia`，回车 | 🎙️ "Just type a DeFi command like 'Supply 0.01 ETH to Aave.' No code, no dashboards." |
| **10-15s** | 展示确认弹窗 | 弹出确认卡片: 协议=Aave V3, 金额=0.01 ETH, 链=Sepolia, Gas 估算 | 🎙️ "Before executing, you get a safety confirmation — intent, chain, gas estimate. Nothing runs without your approval." |
| **15-25s** | 确认执行 + 链上结果 | 点击 Confirm → 显示交易成功 + Etherscan 链接 | 🎙️ "One click to confirm. The transaction executes through KeeperHub — here's the Etherscan confirmation. Onchain, real, verifiable." |
| **25-30s** | 切换 Workflows Tab | 切换到 Workflows 标签页，展示执行历史列表 | 🎙️ "Switch to Workflows to see your full execution history — every command, every transaction, all tracked." |
| **30-45s** | 收益率对比面板 (可选) | 展示 Yield Comparison 面板: Aave vs Spark vs Compound APY 对比 | 🎙️ "Compare yields across protocols in real-time. Find the best rate before you commit capital." |
| **45-60s** | 策略模板 (可选) | 展示 Strategy Templates: 一键部署 Auto-Compound / DCA / 止损策略 | 🎙️ "Choose from strategy templates — auto-compound, DCA, stop-loss. One click to deploy, KeeperHub handles the rest. YieldFarmer AI: Speak DeFi. Execute Onchain." |

### 录制 Checklist

- [ ] 屏幕分辨率 ≥ 1920x1080
- [ ] 麦克风清晰、无背景噪音
- [ ] Etherscan 链接清晰可见（证明链上真实性）
- [ ] 确认弹窗停留 ≥ 2 秒（评审看到安全机制）
- [ ] 视频开头显示项目名称 + Hackathon 名称
- [ ] 视频结尾显示 GitHub 链接 + 团队名
- [ ] 导出 .mp4（非 .mov，兼容性更好）

---

## 🛠 Tech Stack Checklist

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Frontend Framework** | Next.js | 15.x | React 19, App Router |
| **Backend Framework** | FastAPI | 0.x | Python 3.12, async |
| **AI / LLM** | DeepSeek | deepseek-chat | 主路径意图解析 |
| **LLM Fallback** | Custom Regex/Keyword Engine | — | 零成本热路径 |
| **Onchain Execution** | KeeperHub MCP API | production | x-api-key auth |
| **HTTP Client** | httpx | 0.x | 异步 API 通信 |
| **Blockchain (Demo)** | Sepolia Testnet | chainid: 11155111 | 可切换主网 |
| **Protocols Integrated** | Aave V3, Uniswap V3, Spark | — | 通过 KeeperHub 可达 396 个 |
| **Package Manager** | npm + pip | — | 前后端独立管理 |
| **Plugin** | @ethglobal-openagent/openclaw-keeperhub | — | KeeperHub SDK 集成 |

---

## 👥 Team

| Role | Name | GitHub | Email |
|------|------|--------|-------|
| **Team Lead / Full Stack** | 赵昱博 (YuBo Zhao) | [yi-dong-z](https://github.com/yi-dong-z) | yi-dong-z@users.noreply.github.com |
| **AI / Backend Engineer** | 赵昱博 (YuBo Zhao) | [yi-dong-z](https://github.com/yi-dong-z) | yi-dong-z@users.noreply.github.com |
| **Frontend / UX** | 赵昱博 (YuBo Zhao) | [yi-dong-z](https://github.com/yi-dong-z) | yi-dong-z@users.noreply.github.com |
| **Blockchain / Smart Contract** | 赵昱博 (YuBo Zhao) | [yi-dong-z](https://github.com/yi-dong-z) | yi-dong-z@users.noreply.github.com |

---

## 📂 Deliverables

| # | Deliverable | File | Status |
|---|-------------|------|--------|
| 1 | 英文 README | `README.md` | ✅ 完成 |
| 2 | 比赛调研 | `RESEARCH.md` | ✅ 完成 |
| 3 | 竞品分析 | `COMPETITOR_RESEARCH.md` | ✅ 完成 |
| 4 | 提交清单 | `SUBMISSION.md` | ✅ 完成 |
| 5 | Demo 视频 | 待录制 | 🔴 未完成 |
| 6 | Pitch Deck | 待制作 | 🔴 未完成 |
| 7 | DoraHacks 提交 | 待提交 | 🔴 未完成 |

---

## 📝 Notes

- **提交截止**: August 13, 2026（建议提前 2 天提交以留出修改时间）
- **DoraHacks 提交要求**: 至少包含项目名称、描述、GitHub 链接、Demo 视频
- **评审标准参考**: 创新性、技术实现、KeeperHub 集成深度、用户体验、商业可行性
- **Etherscan 验证**: Demo 视频中的链上交易必须在 Etherscan 上可查，建议录制前先跑一遍确保交易确认
