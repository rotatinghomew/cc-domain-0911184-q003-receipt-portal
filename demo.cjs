const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPortal } = require('./portal/site.cjs');
const { Worklist } = require('./robot/worklist.cjs');
const { savePending } = require('./robot/drafts.cjs');

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-'));
  const portal = createPortal();
  try {
    const url = await portal.start();
    const worklist = new Worklist(path.join(folder, 'worklist.json'));
    worklist.add({ account: 'studio-a', business: 'license-01', title: '山间来信', scope: '华东网络发行', version: 1 });
    await savePending(url, worklist);
    console.log(JSON.stringify({ worklist: worklist.items, drafts: [...portal.state.drafts.values()], accepted: portal.state.receipts.length }));
  } finally { await portal.close(); fs.rmSync(folder, { recursive: true, force: true }); }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
