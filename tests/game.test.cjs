const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
function game(seed = {}, configure = () => {}) {
  const dom = new JSDOM(source('index.html'), {url:'https://example.test/plate-tracker/', runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window;
  w.matchMedia = () => ({matches:true});
  w.SVGElement.prototype.getBBox = () => ({x:0,y:0,width:100,height:100});
  for (const [key,value] of Object.entries(seed)) w.localStorage.setItem(key, value);
  configure(w);
  for (const file of ['state-paths.js','states-data.js','state-images.js','facts.js','achievements.js','app.js']) require('node:vm').runInContext(source(file), dom.getInternalVMContext());
  return {w, d:w.document, close:()=>w.close()};
}
function press(w, el, key) { el.focus(); el.dispatchEvent(new w.KeyboardEvent('keydown', {key,bubbles:true})); }
function find(g, code) { press(g.w,g.d.querySelector(`[data-abbr="${code}"] .card-front`),'Enter'); }
function dismiss(g) { if(g.d.querySelector('#modal.active')) press(g.w,g.d.querySelector('#modalConfirm'),'Escape'); }
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('baseline: 50 cards, 31 achievements and every local photo exists', () => {
  const g=game();
  try {
    assert.equal(g.d.querySelectorAll('.card-wrapper').length,50);
    assert.equal(g.d.querySelectorAll('#achGrid .ach-card').length,31);
    const vm=require('node:vm'); const ctx=vm.createContext({});
    const images=vm.runInContext(source('state-images.js')+'; STATE_IMAGES',ctx);
    for(const file of Object.values(images)) assert.ok(fs.existsSync(path.join(root,file)),file);
    assert.equal(g.d.querySelector('meta[name=viewport]').content.includes('user-scalable=no'),false);
  } finally { g.close(); }
});
test('legacy progress and hometown survive; stale achievements are reconciled', () => {
  const g=game({plateTracker:'["NY","CA","NY","ZZ"]',plateTrackerAch:'["first","all50","obsolete"]',plateTrackerHome:'{"name":"Test town","lat":41,"lon":-74}'});
  try {
    assert.equal(g.d.querySelector('#progressCount').textContent,'2 / 50');
    assert.equal(g.d.querySelector('#hometownName').textContent,'Test town');
    assert.deepEqual(JSON.parse(g.w.localStorage.getItem('plateTracker')),['NY','CA']);
    const ach=JSON.parse(g.w.localStorage.getItem('plateTrackerAch'));
    assert.ok(ach.includes('first')); assert.ok(ach.includes('coast')); assert.ok(!ach.includes('all50'));
  } finally {g.close();}
});
test('malformed saved data neither crashes nor overwrites the original', () => {
  for(const value of ['{bad','null','{}','[1]']) {
    const g=game({plateTracker:value,plateTrackerHome:'{"name":"Bad","lat":999,"lon":0}'});
    try {
      find(g,'NY');
      assert.equal(g.d.querySelector('#progressCount').textContent,'1 / 50');
      assert.equal(g.w.localStorage.getItem('plateTracker'),value);
      assert.match(g.d.querySelector('#saveStatus').textContent,/could not be read/);
    } finally {g.close();}
  }
});
test('blocked storage permits play and warns', () => {
  const g=game({},w=>Object.defineProperty(w,'localStorage',{get(){throw new Error('blocked');}}));
  try { find(g,'AL'); assert.equal(g.d.querySelector('#progressCount').textContent,'1 / 50'); assert.match(g.d.querySelector('#saveStatus').textContent,/may not survive/); }
  finally {g.close();}
});
test('keyboard find, achievement Escape and immediate remove confirmation', () => {
  const g=game();
  try {
    find(g,'NY'); assert.equal(g.d.querySelector('#progressBar').getAttribute('aria-valuenow'),'1');
    assert.equal(g.d.activeElement.id,'modalConfirm');
    dismiss(g);
    assert.equal(g.d.querySelector('#mainContent').inert,false);
    assert.equal(g.d.querySelector('#modalCancel').style.display,'');
    g.d.querySelector('[data-abbr=NY] .remove-btn').click();
    assert.equal(g.d.activeElement.id,'modalCancel');
    g.d.querySelector('#modalConfirm').click();
    assert.equal(g.d.querySelector('#modal').classList.contains('active'),false);
    assert.equal(g.d.querySelector('#progressCount').textContent,'0 / 50');
    assert.equal(g.d.querySelector('#achCount').textContent,'0/31');
    assert.deepEqual(JSON.parse(g.w.localStorage.getItem('plateTracker')),[]);
  } finally {g.close();}
});
test('reset cancel preserves states; confirm clears collection but keeps hometown', () => {
  const g=game({plateTracker:'["NY"]',plateTrackerAch:'["first"]',plateTrackerHome:'{"name":"Test","lat":41,"lon":-74}'});
  try {
    g.d.querySelector('#resetBtn').click(); g.d.querySelector('#modalCancel').click();
    assert.equal(g.d.querySelector('#progressCount').textContent,'1 / 50');
    g.d.querySelector('#resetBtn').click(); g.d.querySelector('#modalConfirm').click();
    assert.equal(g.d.querySelector('#progressCount').textContent,'0 / 50');
    assert.equal(g.d.querySelector('#achSectionCount').textContent,'0 / 31');
    assert.equal(JSON.parse(g.w.localStorage.getItem('plateTrackerHome')).name,'Test');
  } finally {g.close();}
});
test('search, found/missing filters and empty state', () => {
  const g=game({plateTracker:'["NY"]',plateTrackerAch:'["first"]'});
  try {
    const search=g.d.querySelector('#stateSearch');
    search.value='new'; search.dispatchEvent(new g.w.Event('input'));
    assert.equal([...g.d.querySelectorAll('.card-wrapper')].filter(el=>!el.hidden).length,4);
    g.d.querySelector('[data-filter=found]').click();
    assert.equal([...g.d.querySelectorAll('.card-wrapper')].filter(el=>!el.hidden).length,1);
    g.d.querySelector('[data-filter=missing]').click();
    assert.equal([...g.d.querySelectorAll('.card-wrapper')].filter(el=>!el.hidden).length,3);
    search.value='not a state'; search.dispatchEvent(new g.w.Event('input'));
    assert.equal(g.d.querySelector('#emptyState').hidden,false);
  } finally {g.close();}
});
test('nested photo dialog restores state information and its opener', () => {
  const g=game();
  try {
    find(g,'NY'); dismiss(g);
    const info=g.d.querySelector('[data-abbr=NY] .info-btn'); info.focus(); info.click();
    const img=g.d.querySelector('.info-img'); press(g.w,img,'Enter');
    assert.equal(g.d.querySelector('#lightbox img').alt,'American Beaver');
    assert.equal(g.d.querySelector('#infoPopup').inert,true);
    press(g.w,g.d.querySelector('#lightboxClose'),'Escape');
    assert.equal(g.d.activeElement,img); assert.equal(g.d.querySelector('#infoPopup').inert,false);
    press(g.w,g.d.querySelector('#infoClose'),'Escape');
    assert.equal(g.d.activeElement,info); assert.equal(g.d.querySelector('#mainContent').inert,false);
  } finally {g.close();}
});
test('hometown grants new distance awards and ignores duplicate submissions', async () => {
  let calls=0, complete;
  const g=game({plateTracker:'["HI"]',plateTrackerAch:'["first","aloha"]'}, w=> {
    w.fetch=()=>{calls++;return new Promise(resolve=>{complete=resolve;});};
  });
  try {
    const input=g.d.querySelector('#hometownInput'); input.value='Test town';
    press(g.w,input,'Enter'); press(g.w,input,'Enter'); assert.equal(calls,1);
    complete({ok:true,json:async()=>[{lat:'41',lon:'-74',display_name:'Test town',address:{town:'Test town',state:'New York'}}]});
    await tick();
    assert.equal(g.d.querySelector('#hometownName').textContent,'Test town, NY');
    assert.ok(JSON.parse(g.w.localStorage.getItem('plateTrackerAch')).includes('faraway'));
    assert.equal(g.d.querySelector('#achCount').textContent,'3/31');
  } finally {g.close();}
});
test('failed hometown lookup keeps previous home and typed query', async () => {
  const g=game({plateTrackerHome:'{"name":"Old town","lat":41,"lon":-74}'},w=>{w.fetch=async()=>({ok:false});});
  try {
    g.d.querySelector('#hometownEditBtn').click();
    const input=g.d.querySelector('#hometownInput');input.value='New town';press(g.w,input,'Enter');await tick();
    assert.equal(input.value,'New town');assert.equal(JSON.parse(g.w.localStorage.getItem('plateTrackerHome')).name,'Old town');
    assert.match(g.d.querySelector('#hometownStatus').textContent,/unavailable/);
    assert.equal(g.d.querySelector('#hometownGo').disabled,false);
  } finally {g.close();}
});
test('drag does not mark a state; info pointerdown cannot start removal', async () => {
  const g=game();
  try {
    const wrapper=g.d.querySelector('[data-abbr=AL]');
    wrapper.dispatchEvent(new g.w.MouseEvent('pointerdown',{button:0,clientX:10,clientY:10,bubbles:true}));
    wrapper.dispatchEvent(new g.w.MouseEvent('pointermove',{clientX:10,clientY:60,bubbles:true}));
    wrapper.dispatchEvent(new g.w.MouseEvent('pointerup',{bubbles:true}));wrapper.click();
    assert.equal(g.d.querySelector('#progressCount').textContent,'0 / 50');
    find(g,'NY');dismiss(g);
    g.d.querySelector('[data-abbr=NY] .info-btn').dispatchEvent(new g.w.MouseEvent('pointerdown',{button:0,bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,650));
    assert.equal(g.d.querySelector('#modal').classList.contains('active'),false);
  } finally {g.close();}
});

test('hold-to-remove still opens confirmation and cancelling preserves the plate', async () => {
  const g=game({plateTracker:'["NY"]',plateTrackerAch:'["first"]'});
  try {
    const wrapper=g.d.querySelector('[data-abbr=NY]');
    wrapper.dispatchEvent(new g.w.MouseEvent('pointerdown',{button:0,clientX:20,clientY:20,bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,650));
    assert.equal(g.d.querySelector('#modalTitle').textContent,'Remove License Plate');
    g.d.querySelector('#modalCancel').click();
    wrapper.dispatchEvent(new g.w.MouseEvent('pointerup',{bubbles:true}));
    wrapper.click();
    assert.equal(g.d.querySelector('#progressCount').textContent,'1 / 50');
    assert.equal(wrapper.querySelector('.card').classList.contains('flipped'),false);
  } finally {g.close();}
});

test('late startup achievements cannot replace a destructive confirmation', async () => {
  const g=game({plateTracker:'["NY"]'});
  try {
    g.d.querySelector('#resetBtn').click();
    await new Promise(resolve=>setTimeout(resolve,550));
    assert.equal(g.d.querySelector('#modalTitle').textContent,'Reset All?');
    g.d.querySelector('#modalConfirm').click();
    await tick();
    assert.equal(g.d.querySelector('#modal').classList.contains('active'),false);
    assert.equal(g.d.querySelector('#progressCount').textContent,'0 / 50');
  } finally {g.close();}
});
