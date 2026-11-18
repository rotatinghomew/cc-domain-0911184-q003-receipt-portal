const http = require('node:http');
const crypto = require('node:crypto');

function createPortal() {
  const state = { drafts: new Map(), receipts: [], dropAfterSubmit: false, requests: [], expiredAccounts: new Set() };
  const keyOf = (account, business) => JSON.stringify([account, business]);
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    state.requests.push({ method: request.method, path: url.pathname });
    const account = url.searchParams.get('account') || 'studio-a';
    const business = url.searchParams.get('business') || 'license-01';
    const key = keyOf(account, business);
    if (request.method === 'GET' && url.pathname === '/') {
      if (state.expiredAccounts.has(account)) {
        response.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<h1>会话已过期</h1><p>请重新登录合作方账号</p>');
        return;
      }
      const draft = state.drafts.get(key) || { title: '', scope: '', version: 0, operator: 'robot' };
      const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html lang="zh"><title>授权办理</title><h1>授权办理</h1>
        <p data-account>${escape(account)}</p><p data-operator>${escape(draft.operator)}</p><form id="license">
        <label>作品<input name="title" value="${escape(draft.title)}"></label>
        <label>授权范围<textarea name="scope">${escape(draft.scope)}</textarea></label>
        <label>审核版本<input name="version" type="number" value="${draft.version}"></label>
        <button type="button" id="save">保存草稿</button><button type="button" id="submit">提交受理</button>
        </form><button id="query">查询受理</button><pre id="status"></pre><script>
        const account=${JSON.stringify(account)},business=${JSON.stringify(business)};
        async function act(action){const fields=Object.fromEntries(new FormData(document.querySelector('form')));fields.version=Number(fields.version);
          const reply=await fetch('/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account,business,...fields})});
          document.querySelector('#status').textContent=JSON.stringify(await reply.json());}
        document.querySelector('#save').onclick=()=>act('draft');document.querySelector('#submit').onclick=()=>act('submit');
        document.querySelector('#query').onclick=async()=>{const reply=await fetch('/receipts?'+new URLSearchParams({account,business}));document.querySelector('#status').textContent=JSON.stringify(await reply.json());};
        </script></html>`);
      return;
    }
    const send = (status, payload) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(payload));
    };
    if (request.method === 'GET' && url.pathname === '/receipts') {
      send(200, { receipts: state.receipts.filter(record => record.account === account && record.business === business) });
      return;
    }
    if (request.method !== 'POST' || !['/draft', '/submit', '/takeover'].includes(url.pathname)) {
      send(404, { error: 'not_found' });
      return;
    }
    let body = '';
    for await (const chunk of request) body += chunk;
    let payload;
    try { payload = JSON.parse(body); } catch { send(400, { error: 'invalid_json' }); return; }
    const identity = keyOf(payload.account, payload.business);
    if (!payload.account || !payload.business || !payload.title || !payload.scope || !Number.isInteger(payload.version)) {
      send(422, { error: 'incomplete_license' });
      return;
    }
    if (state.expiredAccounts.has(payload.account)) { send(401, { error: 'session_expired' }); return; }
    if (url.pathname === '/draft' || url.pathname === '/takeover') {
      const draft = { ...payload, operator: url.pathname === '/takeover' ? 'human' : 'robot' };
      state.drafts.set(identity, draft);
      send(200, { state: 'draft', draft });
      return;
    }
    const receipt = { ...payload, receipt: crypto.randomUUID(), state: 'accepted' };
    state.receipts.push(receipt);
    state.drafts.delete(identity);
    if (state.dropAfterSubmit) {
      state.dropAfterSubmit = false;
      response.destroy();
    } else send(200, receipt);
  });
  return {
    state,
    async start(port = 0) {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
      return `http://127.0.0.1:${server.address().port}`;
    },
    async close() { await new Promise(resolve => server.close(resolve)); },
  };
}

module.exports = { createPortal };
