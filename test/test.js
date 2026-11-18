// AgentStreak unit tests (node:test + ganache + ethers v6).
// Run:  node scripts/compile.js && node --test test/test.js
//
// The real Agent ID contract does not exist on the local chain, so tests
// deploy MockAgentId and pass its address to AgentStreak's constructor.
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ganache = require("ganache");
const { ethers } = require("ethers");

const DAY = 86400n;

// Explicit gas limit for state-changing calls. Relying on ganache's
// eth_estimateGas made checkIn() flakily run out of gas: the estimate came
// back ~200 gas short of the real cost (the tx died inside the final LOG3
// event emission). Real wallets estimate against live state and add their
// own margin, so this is a test-harness artifact, not a contract issue.
const TX = { gasLimit: 200_000 };

const streakArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "AgentStreak.json"), "utf8"));
const mockArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "MockAgentId.json"), "utf8"));

let provider, deployer, holder1, holder2, stranger, streak, deployGasUsed;

// Move the chain to 01:00 UTC on the day `offsetDays` after the current UTC
// day by mining a block with that exact timestamp. Absolute timestamps (not
// relative evm_increaseTime) keep the tests deterministic regardless of
// wall-clock drift between blocks. The next transaction mines at +1s, still
// safely inside the target day.
//
// Ganache quirk: a transaction sent immediately after the timestamped
// evm_mine flakily reverts (the tx is mined against a stale view of the
// chain). Mining one extra empty block after the jump — plus the
// currentDay() read confirming the jump landed — settles the chain and
// makes the sequence deterministic.
async function gotoDay(offsetDays) {
  const currentDay = await streak.currentDay();
  const targetDay = currentDay + BigInt(offsetDays);
  const target = targetDay * DAY + 3600n;
  await provider.send("evm_mine", [Number(target)]);
  const landedDay = await streak.currentDay();
  assert.equal(landedDay, targetDay, `time jump did not land: expected day ${targetDay}, got ${landedDay}`);
  await provider.send("evm_mine", []);
}

async function expectRevert(promise, errorName) {
  const selector = ethers.id(`${errorName}()`).slice(0, 10);
  let err = null;
  try {
    await promise;
  } catch (e) {
    err = e;
  }
  assert.ok(err, `expected revert ${errorName}, but call succeeded`);
  // ethers v6 surfaces custom-error revert data on err.data (or nested).
  const data = err.data || err.error?.data || "";
  if (typeof data === "string" && data.startsWith("0x") && data.length >= 10) {
    assert.equal(data.slice(0, 10), selector, `expected revert ${errorName}, got data ${data}`);
  }
}

before(async () => {
  const ganacheProvider = ganache.provider({ logging: { quiet: true } });
  provider = new ethers.BrowserProvider(ganacheProvider);
  const accounts = await provider.listAccounts();
  // JsonRpcSigners backed by ganache's unlocked deterministic accounts.
  const signers = await Promise.all(accounts.slice(0, 4).map((a) => provider.getSigner(a.address)));
  [deployer, holder1, holder2, stranger] = signers;

  // Deploy the mock Agent ID contract and grant IDs to holder1 and holder2.
  const mockFactory = new ethers.ContractFactory(mockArtifact.abi, mockArtifact.bytecode, deployer);
  const mock = await mockFactory.deploy();
  await mock.waitForDeployment();
  await (await mock.setBalance(holder1.address, 1)).wait();
  await (await mock.setBalance(holder2.address, 1)).wait();
  assert.equal(await mock.balanceOf(holder1.address), 1n);
  assert.equal(await mock.balanceOf(stranger.address), 0n);

  // Deploy AgentStreak bound to the mock Agent ID contract and record gas.
  const factory = new ethers.ContractFactory(streakArtifact.abi, streakArtifact.bytecode, deployer);
  streak = await factory.deploy(await mock.getAddress());
  const receipt = await streak.deploymentTransaction().wait();
  deployGasUsed = receipt.gasUsed;
  console.log(`\nAgentStreak deployed at ${await streak.getAddress()} (gas used: ${deployGasUsed})`);
  console.log(`MockAgentId at ${await mock.getAddress()}`);
  console.log(`holder1=${holder1.address} holder2=${holder2.address} stranger=${stranger.address}`);
});

test("non-holder cannot check in (reverts NoAgentId)", async () => {
  assert.equal(await streak.holdsAgentId(stranger.address), false);
  assert.equal(await streak.canCheckIn(stranger.address), false);
  await expectRevert(streak.connect(stranger).checkIn.staticCall(), "NoAgentId");
});

test("holder checks in: streak 1, stats and event correct", async () => {
  assert.equal(await streak.holdsAgentId(holder1.address), true);
  assert.equal(await streak.canCheckIn(holder1.address), true);

  const tx = await streak.connect(holder1).checkIn(TX);
  const receipt = await tx.wait();
  const event = receipt.logs.map((l) => { try { return streak.interface.parseLog(l); } catch { return null; } }).find((e) => e && e.name === "CheckIn");
  assert.ok(event, "CheckIn event not emitted");
  assert.equal(event.args.user, holder1.address);
  assert.equal(event.args.streak, 1n);

  const [lastDay, current, longest, total, has] = await streak.getUserStats(holder1.address);
  assert.equal(current, 1n);
  assert.equal(longest, 1n);
  assert.equal(total, 1n);
  assert.equal(has, true);
  assert.equal(lastDay, await streak.currentDay());

  const [globalTotal, unique] = await streak.getGlobalStats();
  assert.equal(globalTotal, 1n);
  assert.equal(unique, 1n);
});

test("same-day double check-in reverts (AlreadyCheckedInToday)", async () => {
  assert.equal(await streak.canCheckIn(holder1.address), false);
  await expectRevert(streak.connect(holder1).checkIn.staticCall(), "AlreadyCheckedInToday");
});

test("streak increments on consecutive days", async () => {
  await gotoDay(1);
  await (await streak.connect(holder1).checkIn(TX)).wait();
  let [, current, longest, total] = await streak.getUserStats(holder1.address);
  assert.equal(current, 2n);
  assert.equal(longest, 2n);
  assert.equal(total, 2n);

  await gotoDay(1);
  await (await streak.connect(holder1).checkIn(TX)).wait();
  [, current, longest, total] = await streak.getUserStats(holder1.address);
  assert.equal(current, 3n);
  assert.equal(longest, 3n);
  assert.equal(total, 3n);
});

test("streak resets to 1 after a missed day; longest streak kept", async () => {
  await gotoDay(2); // skip one full UTC day
  await (await streak.connect(holder1).checkIn(TX)).wait();
  const [, current, longest, total] = await streak.getUserStats(holder1.address);
  assert.equal(current, 1n, "streak should reset after a missed day");
  assert.equal(longest, 3n, "longest streak should be preserved");
  assert.equal(total, 4n);
});

test("second holder: uniqueCheckInners counts distinct addresses only", async () => {
  await (await streak.connect(holder2).checkIn(TX)).wait();
  const [globalTotal, unique] = await streak.getGlobalStats();
  assert.equal(unique, 2n);
  assert.equal(globalTotal, 5n);

  const [, current, longest, total] = await streak.getUserStats(holder2.address);
  assert.equal(current, 1n);
  assert.equal(longest, 1n);
  assert.equal(total, 1n);

  // holder1 checking in again the next day must NOT raise uniqueCheckInners.
  await gotoDay(1);
  await (await streak.connect(holder1).checkIn(TX)).wait();
  const [, uniqueAfter] = await streak.getGlobalStats();
  assert.equal(uniqueAfter, 2n);
});

test("deployment gas is within the expected range for DEPLOY.md", () => {
  assert.ok(deployGasUsed > 0n, "no deploy gas recorded");
  assert.ok(deployGasUsed < 1_000_000n, `deploy gas unexpectedly high: ${deployGasUsed}`);
  console.log(`deploy gas used: ${deployGasUsed}`);
});
