function formValues(item) {
  if (!item.account || !item.business || !Number.isInteger(item.version) || item.version < 1) {
    throw new Error('approved authorization identity is incomplete');
  }
  const title = String(item.title || '').trim();
  const scope = String(item.scope || '').trim();
  if (!title || !scope) throw new Error('title and authorization scope are required');
  return { account: item.account, business: item.business, title, scope, version: item.version };
}

function verifySaved(approved, saved) {
  const expected = formValues(approved);
  const actual = formValues(saved);
  for (const field of Object.keys(expected)) {
    if (expected[field] !== actual[field]) throw new Error(`saved authorization differs at ${field}`);
  }
  return actual;
}

module.exports = { formValues, verifySaved };
