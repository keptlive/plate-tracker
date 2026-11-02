const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root=path.resolve(__dirname,'..');
function worker() {
  const events={}, removed=[], installed=[];
  const context=vm.createContext({URL, self:{location:{origin:'https://example.test',href:'https://example.test/plate-tracker/sw.js'},addEventListener:(name,handler)=>{events[name]=handler;},clients:{claim:async()=>{}}},
    caches:{open:async()=>({addAll:async files=>installed.push(...files),match:async key=>({cached:key})}),keys:async()=>['unrelated-app','plate-tracker-old'],delete:async key=>removed.push(key)},fetch:()=>{throw new Error('Network unavailable');}});
  vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
  return {events,removed,installed};
}
test('offline install includes every named asset; activation preserves unrelated caches', async()=>{
  const w=worker();let pending;
  w.events.install({waitUntil:p=>pending=p});await pending;
  assert.ok(w.installed.includes('index.html'));assert.ok(w.installed.includes('app.js'));
  for(const file of w.installed) assert.ok(fs.existsSync(path.join(root,file)),file);
  assert.equal(w.installed.filter(f=>f.endsWith('.jpg')).length,74);
  w.events.activate({waitUntil:p=>pending=p});await pending;
  assert.deepEqual(w.removed,['plate-tracker-old']);
});
test('offline root and image requests work at the GitHub Pages subpath without network', async()=>{
  const w=worker();
  for(const [url,expected] of [['https://example.test/plate-tracker/?offline-test','https://example.test/plate-tracker/index.html'],['https://example.test/plate-tracker/images/rose.jpg','https://example.test/plate-tracker/images/rose.jpg']]) {
    let response;
    w.events.fetch({request:{url,method:'GET'},respondWith:p=>response=p});
    assert.equal((await response).cached,expected);
  }
  for(const url of ['https://nominatim.openstreetmap.org/search?q=test','https://example.test/another-app/','https://example.test/plate-tracker/unknown']) {
    let handled=false;w.events.fetch({request:{url,method:'GET'},respondWith:()=>{handled=true;}});assert.equal(handled,false);
  }
});
