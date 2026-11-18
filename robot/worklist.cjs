const fs = require('node:fs');
const path = require('node:path');

class Worklist {
  constructor(filename) {
    this.filename = filename;
    this.items = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : [];
  }
  save() {
    fs.mkdirSync(path.dirname(this.filename), { recursive: true });
    const temporary = `${this.filename}.new`;
    fs.writeFileSync(temporary, JSON.stringify(this.items, null, 2));
    fs.renameSync(temporary, this.filename);
  }
  add(item) {
    if (this.items.some(existing => existing.account === item.account && existing.business === item.business)) throw new Error('duplicate business identity');
    if (!Number.isInteger(item.version) || item.version < 1) throw new Error('invalid authorization version');
    this.items.push({ ...item, state: 'approved' });
    this.save();
  }
  pending() { return this.items.filter(item => item.state === 'approved').map(item => ({ ...item })); }
  saved(account, business) {
    const item = this.items.find(value => value.account === account && value.business === business);
    if (!item) throw new Error('unknown work item');
    item.state = 'draft_saved';
    this.save();
  }
}

module.exports = { Worklist };
