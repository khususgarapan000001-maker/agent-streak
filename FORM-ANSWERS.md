# AgentStreak — hackathon submission form drafts

Submission form: "Agent ID 黑客松参赛项目提交表" (Binance survey; the form is
in Chinese). Deadline: **9 Dec 2026, 08:00 UTC (15:00 WIB)**. One project per
team. Fields below follow the form's visible section one (项目基本信息 /
project basic info). Fill the TBD fields after deployment + hosting.

## 1. 项目名称 / Project name

```
AgentStreak
```

## 2. 项目简介 / Project introduction (1–3 sentences)

English:

> AgentStreak is a free daily check-in dApp for Agent ID holders on BNB Chain.
> Holders check in once per UTC day to build an on-chain streak — the contract
> tracks current streak, longest streak, and total check-ins, and only wallets
> holding an Agent ID can participate. There is no token, no fee, and no
> reward: it is a simple, permissionless way to show up every day as an
> on-chain agent.

Chinese (for the form):

> AgentStreak 是面向 Agent ID 持有者的免费每日签到 dApp，部署在 BNB Chain 上。
> 持有者每天（UTC）签到一次，即可在链上累积连续签到天数——合约记录当前连续
> 天数、历史最长天数和总签到次数，只有持有 Agent ID 的钱包才能参与。没有代
> 币、没有费用、没有奖励：它只是一个简单、无需许可的方式，让链上 Agent 每天
> 打卡。

## 3. 项目合约地址 / Project contract address (BscScan link, verified + open-source)

```
https://bscscan.com/address/0x45F2A11fb4816098923EFbEC6208CE9413727A3D
```

Deployed 19 Nov 2026 ~00:03 WIB from 0xe409BaFfD08c7459bA1998bEC08337ACD8Dc337D
(Bitget Wallet) via Remix. Constructor arg: the official Agent ID contract
0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F. **Sourcify-verified exact match**
(creation + runtime, 2026-11-18T17:04:11Z). Compilation settings (from
Sourcify metadata): solc 0.8.34+commit.80d5c536, optimizer OFF, EVM osaka —
note: Remix deployed the first-compile artifact, not the 0.8.26/paris/
optimizer-200 recompile; functionally identical, verified on-chain
(AGENT_ID() correct, holdsAgentId(Agentic)=true). BscScan verification
pending (use the settings above + constructor args
00000000000000000000000060b9262456de011f7d15a54cdd8c48baaa8b022f).
Source open in this repo.

## 4. 项目官网 / 产品入口 / Project website / product link

```
https://khususgarapan000001-maker.github.io/agent-streak/
```

Static site from frontend/ (GitHub Pages, gh-pages branch).

## Agent ID usage description (for the form's Agent ID section, if present)

English:

> AgentStreak gates its core function on Agent ID. The checkIn() function calls
> balanceOf on the official SPACE ID Agent ID contract
> (0x60B9262456de011f7d15a54CdD8c48bAaa8B022F) and reverts for any caller who
> does not hold an Agent ID, so every streak provably belongs to an Agent ID
> holder. The frontend also reads the holder's Agent ID status before enabling
> check-in, and directs non-holders to claim their free Agent ID in the Binance
> app.

Chinese:

> AgentStreak 的核心功能以 Agent ID 作为准入门槛。checkIn() 函数会调用官方
> SPACE ID Agent ID 合约（0x60B9262456de011f7d15a54CdD8c48bAaa8B022F）的
> balanceOf，未持有 Agent ID 的调用者将被拒绝，因此每一条签到记录都必然属于
> Agent ID 持有者。前端同样会在开放签到前读取用户的 Agent ID 状态，并引导尚
> 未持有者前往 Binance App 免费领取 Agent ID。

## Other likely fields (fill at submission time)

- **Reward receiving address:** TBD — the wallet that should receive any prize
  (confirm with the project owner before submitting).
- **Team / contact:** TBD — name + contact (X / Telegram / email) of the submitter.
- **GitHub / source repo:** https://github.com/khususgarapan000001-maker/agent-streak
- **Agent ID of the submitter:** `akmdrzzz.ai` (holder: the Agentic Wallet
  0xcBaE5e7ecCC487E4596B8cA7441ab92f1DB737e2 — NOT the deployer wallet).
