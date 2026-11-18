const { ethers } = require('ethers');
const artifact = require('../artifacts/AgentStreak.json');
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.bnbchain.org');
const STREAK = '0x45F2A11fb4816098923EFbEC6208CE9413727A3D';
const AGENT_ID = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';
const AGENTIC = '0xcBaE5e7ecCC487E4596B8cA7441ab92f1DB737e2';
const s = v => (typeof v === 'bigint' ? v.toString() : v);
(async () => {
  const streak = new ethers.Contract(STREAK, artifact.abi, provider);
  console.log('AGENT_ID():', await streak.AGENT_ID());
  const gs = await streak.getGlobalStats();
  console.log('getGlobalStats(): totalCheckInsGlobal=%s uniqueCheckInners=%s', s(gs[0]), s(gs[1]));
  console.log('currentDay():', s(await streak.currentDay()), '| expected ~', Math.floor(Date.now() / 86400000));
  const idc = new ethers.Contract(AGENT_ID, ['function balanceOf(address) view returns (uint256)'], provider);
  console.log('AgentID balanceOf(Agentic):', s(await idc.balanceOf(AGENTIC)));
  console.log('holdsAgentId(Agentic):', await streak.holdsAgentId(AGENTIC));
  console.log('canCheckIn(Agentic):', await streak.canCheckIn(AGENTIC));
  console.log('totalCheckInsGlobal():', s(await streak.totalCheckInsGlobal()));
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
