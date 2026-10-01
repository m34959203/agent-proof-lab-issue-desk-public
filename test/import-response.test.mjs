import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {demo} from '../engine.mjs';
import {openStore} from '../store.mjs';

const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return {promise, resolve};
};
function element() {
  return {
    value: '', textContent: '', children: [], files: [],
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    get firstChild() { return this.children[0]; },
    setAttribute() {},
  };
}

for (const entry of ['import', 'demo']) {
  test(`${entry}: delayed import response preserves revision 2 and saved review`, async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'issue-desk-race-'));
    try {
      const store = await openStore(dir);
      const committed = deferred(), release = deferred();
      const nodes = new Map();
      const get = id => {
        if (!nodes.has(id)) nodes.set(id, element());
        return nodes.get(id);
      };
      get('filter').value = 'all';
      get('file').files = [{size: 100, text: async () => JSON.stringify(demo)}];
      const context = vm.createContext({
        document: {getElementById: get, createElement: element},
        confirm: () => true,
        fetch: async (url, options) => {
          let body;
          if (url === '/api/state') body = store.get();
          else if (url === '/api/demo') body = demo;
          else if (url === '/api/import') {
            body = await store.mutate(JSON.parse(options.body), 'import');
            committed.resolve();
            await release.promise;
          } else if (url === '/api/review') {
            body = await store.mutate(JSON.parse(options.body), 'review');
          } else throw Error(`Unexpected request: ${url}`);
          return {ok: true, json: async () => structuredClone(body)};
        },
      });
      vm.runInContext(source, context);
      await vm.runInContext('reload()', context);
      const pending = get(entry).onclick();
      await committed.promise;
      await get('reload').onclick();
      assert.match(get('count').textContent, /queue revision 1$/);
      const note = 'Fictional review: checked the original case and retained this note.';
      get('note').value = note;
      await get('review').onsubmit({preventDefault() {}});
      assert.match(get('count').textContent, /queue revision 2$/);
      const savedHistory = get('history').children;
      release.resolve();
      await pending;
      assert.equal(store.get().revision, 2);
      assert.equal(store.get().history[0].note, note);
      assert.match(get('count').textContent, /queue revision 2$/);
      assert.equal(get('history').children, savedHistory);
      assert.equal(get('history').children[0].children[1].textContent, note);
    } finally {
      await fs.rm(dir, {recursive: true, force: true});
    }
  });
}
