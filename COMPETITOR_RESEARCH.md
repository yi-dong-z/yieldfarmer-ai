# 竞品调研 & 产品打磨建议

> 调研时间: 2026-07-08 | YieldFarmer AI 产品迭代参考

---

## 一、市场格局

2026 年 "Agentic Finance" (AgentFi / DeFAI) 是最热赛道。Cambrian Network 的 Q2 2026 报告列出了 30+ 个 Agent 项目。

### 核心玩家分级

| 层级 | 玩家 | 核心能力 |
|------|------|---------|
| 🏦 **巨头** | Coinbase for Agents | NL 交易 + 支付 + 投组再平衡, MCP 协议 |
| 🏗️ **基建** | **KeeperHub** | Agent 链上执行层（中立, 不是 agent 框架） |
| 🤖 **Agent 层** | Giza ARMA, CoinFello, Mayflower | NL → DeFi 自动化 |
| 🔧 **框架** | ElizaOS, Coinbase AgentKit, Hermes | Agent 开发工具, 对接 KeeperHub 执行 |

### 关键洞察：我们在什么位置

```
Agent 框架 (ElizaOS, Hermes)
    ↓ 调用
Agent 应用层 (Giza, CoinFello, Coinbase for Agents, ← 我们在这里)
    ↓ 调用
执行层 (KeeperHub, Chainlink Automation)
    ↓
链上合约 (Aave, Uniswap, Spark...)
```

**YieldFarmer AI 的定位是 Agent 应用层，建立在 KeeperHub 执行层之上。这和 Coinbase for Agents 是同一层级的竞争，但我们是开放的、跨链的。**

---

## 二、逐家分析

### 1. Coinbase for Agents 🏦 — 最强劲敌

**发布时间**: 2026年6月（CNBC, TechCrunch 报道）  
**核心**: AI Agent 连接 Coinbase 账户 → NL 交易、支付、投组管理  

**亮点**:
- 自然语言 → 交易执行（spot + derivatives）
- 用户可设置限额
- MCP 协议原生支持
- Agent 账户体系

**弱点**: 
- 绑定 Coinbase 生态（封闭）
- 不支持跨链 DeFi 协议（只能交易，不能借贷/收益）

**我们可以借鉴的**:
- ✨ **Agent 账户 / 限额系统** — 用户可以设定"每日最多花费 0.1 ETH"
- ✨ **投组视图** — 展示当前持仓、收益率、健康度

---

### 2. Giza / ARMA 🤖 — 最直接的同类

**核心**: 自主稳定币收益优化 Agent  
**数据**: 15% APY on USDC, $20M TVL  

**亮点**:
- 持续扫描数百个借贷池的收益率曲线
- 自动在 Aave、Spark、Morpho 之间分配资金
- 风险感知（自动从高风险池撤出）
- Verifiable rebalancing（每次操作可验证）

**我们可以借鉴的**:
- ✨ **收益率对比面板** — 展示不同协议的实时 APY
- ✨ **自动再平衡逻辑** — "当 Aave USDC APY < Spark APY 1% → 自动迁移"
- ✨ **风险评分** — 每个仓位显示健康因子

---

### 3. CoinFello / Fello 1 🔐 — 安全标杆

**核心**: "First self-sovereign AI agent for any smart contract"  
**亮点**:
- 自然语言 → send, swap, bridge, stake
- 🔑 **交易前人工可读预览**（关键功能！）
- 硬件级密钥安全
- Claude-like chat UX
- Agent skills 市场

**我们可以借鉴的**:
- ✨✨ **交易确认卡片** — 执行前展示: "即将在 Sepolia 上从 0x... 向 Aave V3 存入 0.01 ETH, Gas 预估 $0.03, 确认?"
- ✨ **操作可撤销** — 5秒倒计时, 可取消
- ✨ **操作记录带详情** — 每步显示 tx hash, gas 消耗, 状态

---

### 4. Mayflower AI 🐝 — 多 Agent 协作

**核心**: 自主 Agent swarm 在 Solana 执行 DeFi 操作  

**亮点**:
- 多 Agent 协同（一个监控市场, 一个执行交易）
- 长上下文推理
- Verifiable simulations

**我们可以借鉴的**:
- 💡 远期: 多 Agent 架构（Monitor Agent + Executor Agent）
- 💡 短期: 模拟模式 — "如果现在 swap, 你会得到 X ETH"

---

### 5. Supra AutoFi — 策略模板

**核心**: NL → 策略制定 → 自动化创建  

**亮点**:
- 预设策略模板: DCA, Stop-loss, Yield farming
- "Speak to an AI Agent in natural language, formulate strategies, and create automation"
- 多链自动化

**我们可以借鉴的**:
- ✨ **策略模板库** — DCA 定投、止损、复投、收益最大化
- ✨ **策略参数配置** — 用户可调整触发条件

---

## 三、KeeperHub 竞争格局（来自官方 Compare 页）

| 维度 | KeeperHub | Chainlink | Gelato | Defender |
|------|-----------|-----------|--------|----------|
| 定位 | 执行层 | Keeper 网络 | 执行(已下线) | 安全+自动化(已日落) |
| 主要用户 | Agent, 协议, 金库 | 协议架构师 | — | — |
| Agent 接口 | MCP, CLI, x402, MPP | 无 | — | — |
| 钱包 | Turnkey 非托管 | 外部 | — | — |
| 审计追踪 | 完整可导出 | Upkeep history | — | — |
| 上线时间 | < 5 分钟 | 需编码 | — | — |

**关键**: Gelato 2026年3月下线, Defender 2026年7月日落 → **KeeperHub 是事实上的唯一选择**。

---

## 四、YieldFarmer AI 打磨路线图

### 🔴 必做（提交前）

| # | 功能 | 借鉴自 | 工作量 |
|---|------|--------|--------|
| 1 | **交易确认卡片** — 执行前显示详情, 用户确认 | CoinFello | 1h |
| 2 | **执行历史面板** — Runs tab: 时间、tx hash、状态 | KeeperHub | 30min |
| 3 | **多步工作流 Demo** — Claim → Swap → Re-supply | Giza ARMA | 1h |
| 4 | **收益率展示** — 调用已有 marketplace workflow 对比 | Giza | 30min |

### 🟡 加分项（时间允许）

| # | 功能 | 借鉴自 |
|---|------|--------|
| 5 | 策略模板（DCA、止损、复投） | Supra |
| 6 | 仓位健康度仪表盘 | Giza |
| 7 | Telegram/Discord 通知 | KeeperHub 内置 |
| 8 | 模拟模式（预估结果但不执行） | Mayflower |

### 🔵 V2（比赛后）

| # | 功能 |
|---|------|
| 9 | 多 Agent 架构 |
| 10 | Agent 限额系统 |
| 11 | 跨链投组管理 |

---

## 五、结论

**YieldFarmer AI 的核心差异化**:

1. 🏗️ 建立在 **KeeperHub 开放执行层** 之上，不绑定单一平台（vs Coinbase 封闭生态）
2. 🤖 **LLM + 关键词双轨** 意图匹配，不依赖单一 Agent 框架
3. 🔓 **开源的 Agent 应用层**，任何 KeeperHub workflow 都能被 Agent 发现和调用
4. ⚡ < 5 分钟从注册到第一笔链上交易（KeeperHub 的核心优势）

**竞品给了我们三个最重要的启发**:
1. CoinFello 的**交易确认** — 信任感
2. Giza 的**收益对比** — 决策依据  
3. Coinbase 的**限额系统** — 安全感
