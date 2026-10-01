// In-memory stand-in for `jsr:@supabase/supabase-js@2`, just big enough for lifecycle-dispatcher/index.ts.
// Used only by dispatcher.sim.test.mjs (Node harness); never deployed.

const clone = (x) => (x === undefined ? x : structuredClone(x));

export class FakeDB {
  constructor() {
    this.tables = {};
    this.rpcHandlers = {};
    this.rpcCalls = [];
    this.tableErrors = {}; // table -> {code,message}  (applies to every op on that table)
    this.writes = 0; // count of mutating ops (insert/update/delete) actually applied
  }
  t(name) { return (this.tables[name] ??= []); }
  seed(name, rows) { for (const r of rows) this.t(name).push(clone(r)); return this; }
  snapshot() { return JSON.stringify(Object.fromEntries(Object.entries(this.tables).filter(([, v]) => v.length))); } // empty tables are created lazily by reads; ignore them
}

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

class Q {
  constructor(db, table) {
    this.db = db; this.table = table; this.filters = []; this.op = 'select'; this.payload = null;
    this._order = null; this._limit = null; this._single = false;
  }
  select() { return this; }
  insert(rows) { this.op = 'insert'; this.payload = rows; return this; }
  update(p) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
  lte(c, v) { this.filters.push((r) => r[c] != null && cmp(r[c], v) <= 0); return this; }
  gte(c, v) { this.filters.push((r) => r[c] != null && cmp(r[c], v) >= 0); return this; }
  lt(c, v) { this.filters.push((r) => r[c] != null && cmp(r[c], v) < 0); return this; }
  gt(c, v) { this.filters.push((r) => r[c] != null && cmp(r[c], v) > 0); return this; }
  like(c, pat) { const re = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$'); this.filters.push((r) => typeof r[c] === 'string' && re.test(r[c])); return this; }
  in(c, arr) { this.filters.push((r) => arr.includes(r[c])); return this; }
  not(c, op, v) {
    if (op === 'is') this.filters.push((r) => (v === null ? r[c] != null : r[c] !== v));
    else if (op === 'eq') this.filters.push((r) => r[c] !== v);
    return this;
  }
  order(c, o = {}) { this._order = { c, asc: o.ascending !== false }; return this; }
  limit(n) { this._limit = n; return this; }
  maybeSingle() { this._single = true; return this; }
  single() { this._single = true; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.exec()).then(res, rej); }
  exec() {
    const err = this.db.tableErrors[this.table];
    if (err) return { data: null, error: { ...err } };
    const rows = this.db.t(this.table);
    const match = (r) => this.filters.every((f) => f(r));
    if (this.op === 'insert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      for (const p of list) {
        const row = clone(p);
        if (row.id === undefined) row.id = crypto.randomUUID();
        const nowIso = new Date().toISOString();
        if (this.table === 'lifecycle_dispatch_log' && row.attempted_at === undefined) row.attempted_at = nowIso;
        if (this.table === 'lifecycle_engine_alerts' && row.created_at === undefined) row.created_at = nowIso;
        rows.push(row); this.db.writes++;
      }
      return { data: null, error: null };
    }
    if (this.op === 'update') {
      for (const r of rows) if (match(r)) { Object.assign(r, clone(this.payload)); this.db.writes++; }
      return { data: null, error: null };
    }
    if (this.op === 'delete') {
      for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i])) { rows.splice(i, 1); this.db.writes++; }
      return { data: null, error: null };
    }
    let out = rows.filter(match).map(clone);
    if (this._order) {
      const { c, asc } = this._order;
      out.sort((a, b) => (asc ? 1 : -1) * cmp(a[c], b[c]));
    }
    if (this._limit != null) out = out.slice(0, this._limit);
    if (this._single) return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }
}

export function createClient() {
  const db = globalThis.__FAKE_DB;
  if (!db) throw new Error('FakeDB not installed');
  return {
    from: (t) => new Q(db, t),
    rpc: (name, args) => {
      db.rpcCalls.push({ name, args });
      const h = db.rpcHandlers[name];
      const result = h ? h(args) : { data: null, error: { code: '42883', message: `function ${name} does not exist` } };
      return { then: (res, rej) => Promise.resolve(result).then(res, rej) };
    },
  };
}

// index.ts imports SupabaseClient only as a TYPE; Deno elides it, Node's type-stripper cannot, so provide a stub.
export class SupabaseClient {}
