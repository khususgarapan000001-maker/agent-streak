# AgentStreak — deployment guide

> **Status: NOT YET DEPLOYED.** Nothing in this repo has been sent to any chain.
> Deployment needs a wallet with a little BNB (see costs below) and a human to
> confirm the deployment transaction.

## What is deployed

- **One contract:** `AgentStreak` (`contracts/AgentStreak.sol`), single file,
  no imports, no libraries.
- **Constructor argument:** the Agent ID contract address (the only argument):
  `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`
- **Chain:** BNB Chain mainnet (chainId 56).
- **Compiler settings (must match exactly for BscScan verification):**
  solc **0.8.26**, optimizer **enabled**, runs **200**, evmVersion **paris**,
  license **MIT**.

## Gas costs (measured on a local chain)

| Action | Gas | Cost @ 0.05 gwei (live BSC price, 18 Nov 2026) | Cost @ 1 gwei | Cost @ 5 gwei |
|---|---|---|---|---|
| Deploy AgentStreak | 433,609 | 0.0000217 BNB (~$0.013) | 0.000434 BNB (~$0.25) | 0.00217 BNB (~$1.26) |
| First check-in (per user) | 184,979 | 0.0000092 BNB (~$0.005) | 0.000185 BNB (~$0.11) | 0.000925 BNB (~$0.54) |
| Repeat check-in | 57,210 | 0.0000029 BNB (~$0.002) | 0.000057 BNB (~$0.033) | 0.000286 BNB (~$0.17) |

BNB ≈ $580 (Nov 2026). BSC gas prices move; re-check `eth_gasPrice` before
deploying. **The deployer wallet currently holds ~0.000361 BNB (~$0.21)** —
enough to deploy at gas prices up to ~0.8 gwei, and far more than enough at the
current ~0.05 gwei. A top-up of ~0.002 BNB (~$1.20) is still recommended as a
safety margin so a gas spike cannot strand the deployment.

## Deploy option A — Remix (recommended, no private key leaves the wallet)

1. Open [remix.ethereum.org](https://remix.ethereum.org) in a browser where
   the deployer wallet is available (Binance Wallet in-app browser, or desktop
   with MetaMask / Binance Wallet extension).
2. Create `AgentStreak.sol`, paste the contents of
   `contracts/AgentStreak.sol` verbatim.
3. Compile with Solidity **0.8.26**, optimizer **on**, runs **200**,
   EVM version **paris**.
4. In "Deploy & run transactions": environment = **Injected Provider** (connect
   the deployer wallet), network must be **BNB Chain (56)**.
5. Next to Deploy, enter the constructor argument:
   `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`
6. Click Deploy and confirm in the wallet. Save the deployed address.
7. Sanity-check on BscScan: `AGENT_ID()` should read
   `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, and `holdsAgentId(<your
   address>)` should read `true`.

## Deploy option B — deploy script (for an operator with a key)

`artifacts/AgentStreak.json` contains the exact bytecode compiled by
`scripts/compile.js` (same settings as above). A standard ethers v6 deploy:

```js
const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
const streak = await factory.deploy("0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F");
await streak.waitForDeployment();
```

This path needs the deployer's private key in the environment — only use it on
a trusted machine. The Agentic Wallet CLI (`baw`) does not cover contract
deployment (its `contract-call` flow targets existing contracts), so Remix
(option A) is the path for the Agentic Wallet.

## Verify on BscScan (required by the hackathon)

1. Open the contract page on BscScan → **Contract** → **Verify and Publish**.
2. Compiler type: **Solidity (Single file)**. Version: **v0.8.26+commit.8a97fa7a**.
   License: **MIT**.
3. Optimization: **Yes**, runs: **200**. EVM version: **paris**.
4. Paste `contracts/AgentStreak.sol` verbatim.
5. Constructor arguments (ABI-encoded, one 32-byte word — the Agent ID
   address, left-padded):
   `00000000000000000000000060b9262456de011f7d15a54cdd8c48baaa8b022f`
6. Verify. The page should then show a green checkmark and the source code.

If verification fails, the usual cause is a settings mismatch — re-check the
compiler version, optimizer runs, and evmVersion against the list above.

## After deployment

1. Put the deployed address in `frontend/abi.js`
   (`window.AGENT_STREAK_ADDRESS = "0x...";`) and re-run
   `node scripts/compile.js` only if the contract changed (it regenerates
   `abi.js` — re-apply the address afterwards).
2. Host the `frontend/` folder anywhere static (GitHub Pages, Netlify, IPFS,
   Vercel…). No backend, no build step.
3. Do a live check-in from the deployer wallet (it holds an Agent ID) and
   confirm the streak shows as 1.
4. Fill in the submission form — see [FORM-ANSWERS.md](FORM-ANSWERS.md).
   The form needs the BscScan link of the verified contract.
