// AgentStreak frontend — dependency-free, talks to window.ethereum directly
// (raw JSON-RPC), so it works in the Binance Wallet in-app browser, MetaMask,
// Trust Wallet, and any EIP-1193 wallet on desktop or mobile.
//
// Selectors below are derived from contracts/AgentStreak.sol (see
// artifacts/AgentStreak.json). The contract address comes from abi.js and is
// filled in after deployment (see DEPLOY.md).
(function () {
  "use strict";

  var BSC_CHAIN_ID = 56;
  var BSC_CHAIN_HEX = "0x38";
  var BSC_RPC = "https://bsc-dataseed.bnbchain.org";
  var BSC_EXPLORER = "https://bscscan.com";

  var SEL = {
    checkIn: "0x183ff085",
    holdsAgentId: "0x11213086",
    canCheckIn: "0xfb896848",
    getUserStats: "0x4e43603a",
    getGlobalStats: "0x6b4169c3",
    currentDay: "0x5c9302c9",
  };

  var CONTRACT = (window.AGENT_STREAK_ADDRESS || "").trim();

  function $(id) { return document.getElementById(id); }
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  var account = null;

  function showError(msg) {
    var box = $("error-box");
    box.textContent = msg;
    show(box);
  }
  function clearError() { hide($("error-box")); }

  function shortAddr(a) { return a.slice(0, 6) + "…" + a.slice(-4); }
  function padAddr(a) { return a.toLowerCase().replace(/^0x/, "").padStart(64, "0"); }
  function word(hex, i) { return BigInt("0x" + hex.slice(2 + i * 64, 2 + (i + 1) * 64)); }

  function ethCall(to, data) {
    return window.ethereum.request({
      method: "eth_call",
      params: [{ to: to, data: data }, "latest"],
    });
  }

  function friendlyError(e) {
    var m = (e && e.message) || String(e);
    if (e && (e.code === 4001 || /rejected|denied/i.test(m))) return "Transaction rejected in your wallet. Nothing was sent.";
    if (/already checked in/i.test(m)) return "You already checked in today. Come back after 00:00 UTC.";
    if (/no agent id/i.test(m)) return "This wallet does not hold an Agent ID.";
    if (/insufficient funds/i.test(m)) return "Not enough BNB in this wallet to pay the gas for the check-in.";
    return "Something went wrong: " + m;
  }

  async function refresh() {
    clearError();
    if (!CONTRACT || !account) return;
    try {
      var holds = await ethCall(CONTRACT, SEL.holdsAgentId + padAddr(account));
      var isHolder = word(holds, 0) > 0n;
      var pill = $("agentid-pill");
      if (isHolder) {
        pill.innerHTML = '<span class="pill ok">Agent ID holder ✓</span>';
        hide($("no-agentid"));
        show($("streak-card"));
      } else {
        pill.innerHTML = '<span class="pill no">No Agent ID</span>';
        show($("no-agentid"));
        hide($("streak-card"));
      }

      var g = await ethCall(CONTRACT, SEL.getGlobalStats);
      $("global-total").textContent = word(g, 0).toString();
      $("global-unique").textContent = word(g, 1).toString();

      if (!isHolder) return;

      var u = await ethCall(CONTRACT, SEL.getUserStats + padAddr(account));
      var lastDay = word(u, 0), current = word(u, 1), longest = word(u, 2), total = word(u, 3);
      $("stat-current").textContent = current.toString();
      $("stat-longest").textContent = longest.toString();
      $("stat-total").textContent = total.toString();

      var can = await ethCall(CONTRACT, SEL.canCheckIn + padAddr(account));
      var canNow = word(can, 0) > 0n;
      var btn = $("checkin-btn");
      var status = $("checkin-status");
      if (canNow) {
        btn.disabled = false;
        btn.textContent = total === 0n ? "Check in — start your streak" : "Check in today";
        status.textContent = lastDay === 0n
          ? "Your first check-in starts a streak of 1."
          : "Keep it going — check in every day to grow your streak.";
        hide($("countdown"));
      } else {
        btn.disabled = true;
        btn.textContent = "Checked in today ✓";
        status.textContent = "Nice — come back tomorrow to keep the streak alive.";
        show($("countdown"));
      }
    } catch (e) {
      showError(friendlyError(e));
    }
  }

  function tickCountdown() {
    var now = new Date();
    var next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    var s = Math.max(0, Math.floor((next - now) / 1000));
    var h = String(Math.floor(s / 3600)).padStart(2, "0");
    var m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    var sec = String(s % 60).padStart(2, "0");
    $("countdown-time").textContent = h + ":" + m + ":" + sec;
  }

  async function checkChain() {
    var chainId = await window.ethereum.request({ method: "eth_chainId" });
    var ok = parseInt(chainId, 16) === BSC_CHAIN_ID;
    if (ok) hide($("wrong-chain")); else show($("wrong-chain"));
    return ok;
  }

  async function connect() {
    clearError();
    try {
      var accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) throw new Error("No account returned by the wallet.");
      account = accounts[0];
      $("account-addr").textContent = shortAddr(account);
      hide($("connect-area"));
      show($("account-area"));
      if (await checkChain()) await refresh();
    } catch (e) {
      showError(friendlyError(e));
    }
  }

  async function switchChain() {
    clearError();
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_HEX }],
      });
    } catch (e) {
      if (e && e.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: BSC_CHAIN_HEX,
              chainName: "BNB Smart Chain",
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              rpcUrls: [BSC_RPC],
              blockExplorerUrls: [BSC_EXPLORER],
            }],
          });
        } catch (e2) { showError(friendlyError(e2)); return; }
      } else { showError(friendlyError(e)); return; }
    }
    if (await checkChain()) await refresh();
  }

  function waitForReceipt(hash) {
    return new Promise(function (resolve, reject) {
      var tries = 0;
      (function poll() {
        tries++;
        window.ethereum.request({ method: "eth_getTransactionReceipt", params: [hash] })
          .then(function (r) {
            if (r) return resolve(r);
            if (tries > 60) return reject(new Error("Transaction is taking too long to confirm. Check BscScan for its status."));
            setTimeout(poll, 2000);
          })
          .catch(reject);
      })();
    });
  }

  async function checkIn() {
    clearError();
    hide($("tx-link"));
    var btn = $("checkin-btn");
    var status = $("checkin-status");
    btn.disabled = true;
    btn.textContent = "Confirm in your wallet…";
    try {
      // Estimate gas first, then send with a 50% margin (min 100k). The raw
      // estimate for checkIn() can come back a hair under the real cost, and
      // an exact-limit tx then runs out of gas in the final event emission.
      // Unused gas is refunded, so the margin costs nothing extra.
      var estimate = await window.ethereum.request({
        method: "eth_estimateGas",
        params: [{ from: account, to: CONTRACT, data: SEL.checkIn, value: "0x0" }],
      });
      var gasLimit = BigInt(estimate) * 3n / 2n;
      if (gasLimit < 100000n) gasLimit = 100000n;
      var hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: CONTRACT, data: SEL.checkIn, value: "0x0", gas: "0x" + gasLimit.toString(16) }],
      });
      status.textContent = "Transaction sent — waiting for confirmation…";
      var link = $("tx-link").querySelector("a");
      link.href = BSC_EXPLORER + "/tx/" + hash;
      show($("tx-link"));
      var receipt = await waitForReceipt(hash);
      if (receipt.status !== "0x1") throw new Error("The transaction was reverted on-chain. You may have already checked in today.");
      status.textContent = "Checked in! Your streak is updated.";
      await refresh();
    } catch (e) {
      showError(friendlyError(e));
      btn.disabled = false;
      btn.textContent = "Check in today";
    }
  }

  function init() {
    if (!CONTRACT) {
      show($("not-deployed"));
      $("contract-addr").textContent = "not deployed yet";
      return;
    }
    $("contract-addr").textContent = CONTRACT;
    var bscLink = $("bscscan-link");
    bscLink.href = BSC_EXPLORER + "/address/" + CONTRACT;
    show($("contract-links"));

    if (!window.ethereum) { show($("no-wallet")); return; }
    show($("main"));

    $("connect-btn").addEventListener("click", connect);
    $("switch-btn").addEventListener("click", switchChain);
    $("checkin-btn").addEventListener("click", checkIn);
    window.ethereum.on("accountsChanged", function (accs) {
      account = accs && accs.length > 0 ? accs[0] : null;
      if (!account) {
        show($("connect-area"));
        hide($("account-area"));
        hide($("streak-card"));
        return;
      }
      $("account-addr").textContent = shortAddr(account);
      refresh();
    });
    window.ethereum.on("chainChanged", function () { checkChain().then(function (ok) { if (ok) refresh(); }); });

    // If the wallet is already authorized, connect silently.
    window.ethereum.request({ method: "eth_accounts" }).then(function (accs) {
      if (accs && accs.length > 0) {
        account = accs[0];
        $("account-addr").textContent = shortAddr(account);
        hide($("connect-area"));
        show($("account-area"));
        checkChain().then(function (ok) { if (ok) refresh(); });
      } else {
        // Still load the global stats for visitors without a wallet.
        ethCall(CONTRACT, SEL.getGlobalStats).then(function (g) {
          $("global-total").textContent = word(g, 0).toString();
          $("global-unique").textContent = word(g, 1).toString();
        }).catch(function () {});
      }
    }).catch(function () {});

    tickCountdown();
    setInterval(tickCountdown, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
