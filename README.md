# AgentStreak

A free daily check-in dApp for **Agent ID** holders on BNB Chain — built for the
Binance Agent ID Hackathon (submission deadline **9 Dec 2026, 15:00 WIB**).

Holders check in once per UTC day and build an on-chain streak. The contract
tracks each holder's current streak, longest streak, and total check-ins, plus
global totals. There is **no token, no fee, and no reward** — checking in costs
only network gas (a few cents at most). The contract is fully permissionless:
no owner, no admin functions, no pausing, no way to change the rules.

## How Agent ID is used

Agent ID is the product's identity layer, not a garnish:

- `checkIn()` calls `balanceOf(msg.sender)` on the official SPACE ID Agent ID
  contract (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, ERC-721,
  non-transferable) and **reverts** for any caller who does not hold an Agent ID.
- The frontend reads the same gating (`holdsAgentId` / `canCheckIn`) before
  enabling the check-in button, and explains how to claim a free Agent ID to
  visitors who don't have one yet.

## Repo layout

```
contracts/
  AgentStreak.sol     # the dApp contract (single file, no imports)
  MockAgentId.sol     # TEST-ONLY mock of the Agent ID contract (never deployed)
test/
  test.js             # unit tests (node:test + ganache + ethers v6)
scripts/
  compile.js          # compiles with solc-js, writes artifacts/ + frontend/abi.js
frontend/
  index.html          # the dApp page (static, no build step, no backend)
  app.js              # dependency-free wallet logic (raw window.ethereum RPC)
  abi.js              # generated ABI + contract address (set after deployment)
artifacts/            # generated: ABI + bytecode per contract
DEPLOY.md             # deployment + BscScan verification steps and gas costs
FORM-ANSWERS.md       # drafted hackathon submission form answers
```

## Contract

`contracts/AgentStreak.sol` (Solidity ^0.8.20, compiled with 0.8.26, optimizer
on, 200 runs, evmVersion `paris`):

| Function | What it does |
|---|---|
| `constructor(address agentId)` | Binds the contract to an Agent ID contract (immutable). On mainnet: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`. |
| `checkIn()` | Check in for the current UTC day. Reverts with `NoAgentId` (no Agent ID) or `AlreadyCheckedInToday`. Streak +1 if yesterday was checked in, else resets to 1. Emits `CheckIn(user, day, streak)`. |
| `holdsAgentId(address)` | Whether an address currently holds an Agent ID. |
| `canCheckIn(address)` | Whether an address can check in right now. |
| `getUserStats(address)` | `(lastCheckInDay, currentStreak, longestStreak, totalCheckIns, hasCheckedIn)`. |
| `getGlobalStats()` | `(totalCheckInsGlobal, uniqueCheckInners)`. |
| `currentDay()` | Current UTC day number (`block.timestamp / 86400`). |

## Run the tests

```bash
npm install
npm test        # compiles, then runs the test suite (node --test)
```

7 tests, all passing (verified 10 consecutive clean runs):

1. Non-holder cannot check in (`NoAgentId` revert).
2. Holder checks in: streak 1, stats and `CheckIn` event correct.
3. Same-day double check-in reverts (`AlreadyCheckedInToday`).
4. Streak increments on consecutive days.
5. Streak resets to 1 after a missed day; longest streak kept.
6. Second holder: `uniqueCheckInners` counts distinct addresses only.
7. Deployment gas within the expected range (433,609 gas).

Test notes (documented in `test/test.js`): ganache does not support
`evm_setAccount` / `evm_setNextBlockTimestamp`, so time travel uses absolute
`evm_mine(timestamp)` jumps; and state-changing calls use an explicit gas
limit because ganache's `eth_estimateGas` under-reports this contract's
check-in cost by ~200 gas (the tx otherwise dies inside the final event
emission — the frontend applies the same 1.5x margin, see below).

## Run the frontend locally

```bash
cd frontend
python3 -m http.server 8000
# open http://localhost:8000 — connect a wallet on BNB Chain (chainId 56)
```

The page needs a deployed contract address in `frontend/abi.js`
(`window.AGENT_STREAK_ADDRESS`); until it is set, the page shows a
"coming soon" state. The frontend has **zero dependencies**: it talks to
`window.ethereum` with raw JSON-RPC, so it works in the Binance Wallet
in-app browser as well as MetaMask / Trust Wallet / desktop browsers.

## Deploy

See [DEPLOY.md](DEPLOY.md) for the exact steps, BscScan verification settings,
and the gas-cost table. Short version: deploy `AgentStreak.sol` on BNB Chain
with the constructor argument `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`,
verify the source on BscScan (solc 0.8.26, optimizer on, 200 runs, evmVersion
`paris`), then put the deployed address in `frontend/abi.js` and host the
`frontend/` folder anywhere static (GitHub Pages, Netlify, IPFS, …).

## Hackathon submission

Drafted answers for the submission form (project name, introduction in English
and Chinese, Agent ID usage description) are in
[FORM-ANSWERS.md](FORM-ANSWERS.md).

## Safety / hackathon red lines

- No "Binance" or "BNB" in the project name, token name, or domain.
- No returns promised anywhere — no token, no fee, no reward, no "passive
  income" language. The page states this explicitly.
- No QR-code login, no session storage, no credential collection. Users connect
  their own wallet and confirm each check-in themselves.
- Contract is open-source (this repo) and will be verified on BscScan. There
  are no owner permissions to disclose: the contract has no owner at all.
