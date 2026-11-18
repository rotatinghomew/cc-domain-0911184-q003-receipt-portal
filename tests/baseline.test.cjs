const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPortal } = require('../portal/site.cjs');
const { Worklist } = require('../robot/worklist.cjs');
const { savePending } = require('../robot/drafts.cjs');
const { verifySaved } = require('../robot/authorization.cjs');
const license = { account: 'studio-a', business: 'case-1', title: '归途', scope: '华东网络发行', version: 1 };

test('a persistent portal can reuse an explicitly assigned listener port', async () => {
  const first = createPortal();
  const address = await first.start();
  const port = Number(new URL(address).port);
  await first.close();
  const second = createPortal();
  try {
    assert.equal(await second.start(port), address);
    assert.equal((await fetch(address)).status, 200);
  } finally {
    await second.close();
  }
});

test('saved draft must match the approved authorization', () => {
  assert.equal(verifySaved(license, { ...license }).version, 1);
  assert.throws(() => verifySaved(license, { ...license, version: 2 }), /version/);
  assert.throws(() => verifySaved(license, { ...license, scope: '西部' }), /scope/);
});

test('browser fills a draft without submitting', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-test-'));
  const portal = createPortal();
  try {
    const url = await portal.start();
    const filename = path.join(directory, 'worklist.json');
    const worklist = new Worklist(filename);
    worklist.add(license);
    await savePending(url, worklist);
    assert.equal(portal.state.receipts.length, 0);
    assert.equal([...portal.state.drafts.values()][0].scope, license.scope);
    assert.equal(new Worklist(filename).items[0].state, 'draft_saved');
  } finally { await portal.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('same business id remains distinct across accounts', async () => {
  const portal = createPortal();
  try {
    const url = await portal.start();
    for (const account of ['studio-a', 'studio-b']) {
      const reply = await fetch(url + '/submit', { method: 'POST', body: JSON.stringify({ ...license, account }) });
      assert.equal(reply.status, 200);
    }
    const reply = await fetch(url + '/receipts?account=studio-a&business=case-1');
    const body = await reply.json();
    assert.equal(body.receipts.length, 1);
    assert.equal(body.receipts[0].account, 'studio-a');
  } finally { await portal.close(); }
});

test('accepted submission can lose its response', async () => {
  const portal = createPortal();
  try {
    const url = await portal.start();
    portal.state.dropAfterSubmit = true;
    await assert.rejects(fetch(url + '/submit', { method: 'POST', body: JSON.stringify(license) }));
    const reply = await fetch(url + '/receipts?account=studio-a&business=case-1');
    assert.equal((await reply.json()).receipts.length, 1);
  } finally { await portal.close(); }
});

test('human takeover is observable in the existing page', async () => {
  const portal = createPortal();
  try {
    const url = await portal.start();
    await fetch(url + '/takeover', { method: 'POST', body: JSON.stringify({ ...license, scope: '西部授权', version: 2 }) });
    const reply = await fetch(url + '/?account=studio-a&business=case-1');
    assert.match(await reply.text(), /西部授权/);
    assert.equal([...portal.state.drafts.values()][0].operator, 'human');
  } finally { await portal.close(); }
});

test('incomplete forms never create a receipt', async () => {
  const portal = createPortal();
  try {
    const url = await portal.start();
    const reply = await fetch(url + '/submit', { method: 'POST', body: JSON.stringify({ ...license, scope: '' }) });
    assert.equal(reply.status, 422);
    assert.equal(portal.state.receipts.length, 0);
  } finally { await portal.close(); }
});

test('expired account cannot save or submit authorization', async () => {
  const portal = createPortal();
  try {
    const url = await portal.start();
    portal.state.expiredAccounts.add('studio-a');
    assert.equal((await fetch(url + '/?account=studio-a')).status, 401);
    assert.equal((await fetch(url + '/submit', { method: 'POST', body: JSON.stringify(license) })).status, 401);
    assert.equal(portal.state.receipts.length, 0);
  } finally { await portal.close(); }
});
