const { ethers } = require('ethers');
const artifact = require('../artifacts/AgentStreak.json');
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.bnbchain.org');
const STREAK = '0x45F2A11fb4816098923EFbEC6208CE9413727A3D';
(async () => {
  const code = await provider.getCode(STREAK);
  const fresh = artifact.deployedBytecode.toLowerCase();
  console.log('on-chain len bytes:', (code.length - 2) / 2);
  console.log('fresh len bytes:', (fresh.length - 2) / 2);
  console.log('on-chain head:', code.slice(0, 80));
  console.log('fresh head:   ', fresh.slice(0, 80));
  console.log('on-chain tail:', code.slice(-120));
  console.log('fresh tail:   ', fresh.slice(-120));
  // check if fresh code (minus metadata tail) appears inside on-chain code
  const freshNoMeta = fresh.slice(0, -200); // strip ~100-byte metadata
  console.log('fresh body contained in on-chain:', code.toLowerCase().includes(freshNoMeta.slice(2, 500)));
  // selectors from ABI
  const iface = new ethers.Interface(artifact.abi);
  for (const frag of iface.fragments.filter(f => f.type === 'function')) {
    const sel = iface.getFunction(frag.name).selector;
    console.log(frag.format(), '->', sel, '| in on-chain:', code.toLowerCase().includes(sel.slice(2)));
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
