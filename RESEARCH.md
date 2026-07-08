# KeeperHub Agents Onchain Hackathon — 调研文档

> 比赛链接: https://dorahacks.io/hackathon/agents-onchain  
> KeeperHub 官网: https://keeperhub.com  
> 文档: https://docs.keeperhub.com  
> GitHub: https://github.com/KeeperHub/keeperhub  

---

## 一、比赛基本信息

| 项目 | 详情 |
|------|------|
| **主办方** | KeeperHub（原 MakerDAO/Sky Protocol DevOps 团队打造） |
| **奖金池** | **$5,000 USD** |
| **奖金分配** | 🥇 $2,000 / 🥈 $1,200 / 🥉 $800（主奖金）+ 2× $500 Bounty（最佳新人上手体验改进，可与主奖金叠加） |
| **预注册** | 已开放（截止 ~7月25日） |
| **提交窗口** | 2026年7月27日 ~ 8月13日 |
| **形式** | 线上 Virtual |
| **当前参赛** | 仅 14 名黑客 + 1 个 Bounty 提交 |
| **标签** | Blockchain, Web3, DeFi, AI Agents, Onchain, MCP |

---

## 二、KeeperHub 是什么

KeeperHub 是 **AI Agent 的链上执行层**（Execution Layer for Onchain Agents）。

核心理念：AI Agent 擅长推理和决策，但在"真正执行链上交易"这一最后一公里上会遇到困难。KeeperHub 提供：
- **可视化工作流构建器**：无需写代码即可构建链上自动化流程
- **MCP Server**：通过 Model Context Protocol 让 AI Agent 直接调用链上执行能力
- **REST API / CLI**：适用于程序化调用
- **托管基础设施**：自动处理 Gas 估算、Nonce 管理、交易重试、多 RPC 故障转移

### 技术栈
- **支持链**: Ethereum, Base, Arbitrum, Polygon, Sepolia 及其他 EVM 兼容链（12 条链）
- **集成协议**: Aave, Spark, Lido, Safe, Morpho, Pendle, Compound, Yearn, Curve, Uniswap, CowSwap, Chronicle 等 20+ 协议
- **钱包安全**: Turnkey 硬件安全模块，密钥存储在安全飞地中
- **支付**: 支持 x402 和 MPP 协议进行按次付费

---

## 三、核心能力

### 3.1 触发器（Triggers）
| 触发器 | 说明 |
|--------|------|
| Manual | 点击 Run 手动触发 |
| Schedule | 定时执行（每N分钟/小时/天） |
| Webhook | 外部 HTTP 请求触发 |
| Blockchain Event | 监听智能合约事件 |
| Block Interval | 按区块间隔执行 |

### 3.2 动作（Actions）
| 类别 | 能力 |
|------|------|
| **Web3** | 查询余额、读写智能合约、转账 ETH/ERC-20、查询事件日志、解码 calldata |
| **Notifications** | 发送 Discord、Telegram、Email 通知 |
| **System** | HTTP 请求、条件分支、循环（For Each）、聚合（Collect）、模板渲染 |
| **Math** | 数值聚合：求和、计数、平均值、中位数、最小值、最大值、乘积 |

### 3.3 MCP Server
- KeeperHub 提供 MCP Server，将触发器和工作流暴露为 AI Agent 可调用的工具
- 支持 **Claude, GPT, LangChain, CrewAI, ElizaOS, AutoGPT, Hermes** 等任何 MCP 兼容 runtime
- Agent 通过自然语言描述需求，KeeperHub 自动执行链上操作
- 所有执行记录可追溯：触发事件、提交的 tx、Gas 使用、结果、时间戳

---

## 四、比赛要求（官方描述）

### 核心要求
> **Every project MUST use KeeperHub as its onchain execution layer.**
> **We reward agents that execute onchain — a working transaction that executes through KeeperHub.**

### 建议方向
- **DeFi 自动化 Agent**：自动监控仓位、复投收益、清算保护
- **链上交易 Agent**：MCP 协议驱动的自主交易策略
- **定时自动化工作流**：定时分发奖励、清扫钱包、调用 Keeper 函数
- **事件响应 Agent**：监听大额转账、治理提案、所有权转移等事件并自动响应
- **多系统集成**：读合约数据 → 聚合计算 → 发送 Discord/Telegram 通知 → 触发链上操作

### 提交要求
- ✅ GitHub/GitLab/Bitbucket 链接（必须）
- ✅ Demo 视频
- ✅ 说明项目如何使用 KeeperHub

### Bounty（额外 $500×2）
- 最佳新人上手体验改进
- **可与主奖金叠加**（也就是说同一项目可以拿主奖金 + Bounty）

---

## 五、快速上手步骤

### 第一步：注册 KeeperHub
1. 访问 https://app.keeperhub.com 注册账号
2. 自动创建 Turnkey 钱包

### 第二步：获取测试网 ETH
1. 推荐使用 **Sepolia** 测试网（免费）
2. Sepolia 水龙头获取测试 ETH

### 第三步：创建 API Key
1. 登录 app.keeperhub.com
2. 点击头像 → "API Keys" → "Organisation" tab
3. 点击 "New API Key"

### 第四步：接入 MCP Server
```json
{
  "mcpServers": {
    "keeperhub": {
      "command": "npx",
      "args": ["-y", "@keeperhub/mcp-server"],
      "env": {
        "KEEPERHUB_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 第五步：构建工作流
1. 使用 KeeperHub 可视化构建器或 AI 助手（自然语言描述 → 自动生成工作流）
2. 先用 Manual 触发器测试
3. 确认无误后切换到定时/自动触发器

---

## 六、Agent 开发技术方案建议

### 架构方案 A：MCP Agent（推荐）

```
User (NL Prompt) 
  → Your AI Agent (LLM) 
    → KeeperHub MCP Server 
      → DeFi Protocol (Aave/Spark/Uniswap...) 
        → Onchain Transaction
```

**优点**：
- 最符合比赛主题（Agent + MCP + Onchain）
- 开发成本低（KeeperHub 已封装协议调用）
- Claude Desktop / Hermes 直接支持 MCP

**缺点**：
- 需要等 KeeperHub 的 MCP SDK 正式文档
- 对 MCP 协议理解有一定要求

### 架构方案 B：REST API Agent（稳健）

```
Your Backend (Python FastAPI)
  → LLM 推理层（决策引擎）
    → KeeperHub REST API
      → Workflow 执行
        → Onchain Transaction
  → 前端 Dashboard（监控面板）
```

**优点**：
- 完全可控
- Python FastAPI 是你的主技术栈
- 可以加自定义逻辑（如风控、策略优化）

**缺点**：
- 开发量稍大
- 需要自己处理 Agent 决策逻辑

### 推荐组合：方案 A + 前端展示
- 用 MCP 连接 Claude/Hermes → KeeperHub
- 写一个 Next.js 前端展示 Agent 的执行状态和历史
- 加上 Telegram/Discord bot 通知

---

## 七、竞争分析

| 指标 | 评估 |
|------|------|
| 参赛人数 | 14 人（极低） |
| 奖金/人 | ~$357/人（高性价比） |
| 技术门槛 | 中低（KeeperHub 做了大量封装，可视化构建器可零代码构建） |
| 与你契合度 | ⭐⭐⭐⭐⭐（AI Agent + MCP + Web3 = 你的主赛道） |
| 时间充裕度 | ⭐⭐⭐⭐（预注册中，提交窗口 7/27-8/13，还有 ~3 周准备） |

### 获胜策略
1. **最低要求**（能拿奖）：做一个能真正执行链上交易的 Agent
2. **差异化**：重点做 **DeFi 自动化**（你之前 Casper 的经验可复用）
3. **加分项**：写好文档拿 Bounty（$500×2 几乎是白送）
4. **亮点方向**：
   - 监控 Spark/Aave 仓位健康度，自动补仓防清算
   - 自动复投收益（claim → swap → re-supply）
   - 定时 DCA（定投）策略 Agent

---

## 八、时间规划建议

| 日期 | 事项 |
|------|------|
| **7/8 - 7/10**（现在） | 注册 KeeperHub 账号，跑通 Quick Start，体验可视化构建器 |
| **7/11 - 7/15** | 确定 idea，搭建 MCP Agent 架构，实现第一笔自动交易 |
| **7/16 - 7/22** | 完善 Agent 逻辑，加入策略层（LLM 决策），搭建前端 |
| **7/23 - 7/26** | 录制 Demo 视频，写文档（冲刺 Bounty），内部测试 |
| **7/27** | 提交窗口开放 → 立即提交初版 |
| **7/28 - 8/13** | 根据反馈迭代优化，重新提交 |

---

## 九、重要链接

| 资源 | 链接 |
|------|------|
| 比赛页 | https://dorahacks.io/hackathon/agents-onchain |
| KeeperHub 官网 | https://keeperhub.com |
| 文档 | https://docs.keeperhub.com |
| Hackathon Quickstart | https://docs.keeperhub.com/quickstart |
| MCP Server 文档 | https://docs.keeperhub.com/ai-tools/mcp-server |
| GitHub | https://github.com/KeeperHub/keeperhub |
| Web App | https://app.keeperhub.com |
| YouTube 教程 | https://www.youtube.com/watch?v=wmrclPXB-tM |

---

> **调研完成时间**: 2026-07-08  
> **下一步**: 注册 app.keeperhub.com 账号，跑通 Quick Start
