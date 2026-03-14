// === APP STATE ===
const STORAGE_KEY = 'plateTracker';
const ACH_KEY = 'plateTrackerAch';
const HOME_KEY = 'plateTrackerHome';
let checked = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
let unlockedAch = new Set(JSON.parse(localStorage.getItem(ACH_KEY) || '[]'));
let userOrigin = JSON.parse(localStorage.getItem(HOME_KEY) || 'null');
let isAnimating = {};
let longPressTimer = null;
let modalCallback = null;
let svgBoxes = {};

// === STARS ===
(function() {
  const c = document.getElementById('stars');
  for (let i = 0; i < 35; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random()*100 + '%';
    s.style.top = Math.random()*100 + '%';
    s.style.animationDelay = Math.random()*3 + 's';
    s.style.animationDuration = (2 + Math.random()*3) + 's';
    s.style.width = s.style.height = (1 + Math.random()*2) + 'px';
    c.appendChild(s);
  }
})();

// === COMPUTE SVG BOUNDING BOXES ===
(function() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.visibility = 'hidden';
  document.body.appendChild(svg);
  for (const abbr in STATE_PATHS) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', STATE_PATHS[abbr]);
    svg.appendChild(path);
    try {
      const bb = path.getBBox();
      const pad = Math.max(bb.width, bb.height) * 0.1;
      const dim = Math.max(bb.width + pad*2, bb.height + pad*2);
      // Scale stroke so it looks ~same thickness on all states (target: 2px on a 100-unit viewBox)
      const sw = Math.max(0.5, Math.min(4, dim * 0.02));
      svgBoxes[abbr] = { vb: `${bb.x - pad} ${bb.y - pad} ${bb.width + pad*2} ${bb.height + pad*2}`, sw };
    } catch(e) {
      svgBoxes[abbr] = { vb: '0 0 100 100', sw: 2 };
    }
    svg.removeChild(path);
  }
  document.body.removeChild(svg);
})();

// === BUILD CARD GRID ===
function getDistLabel(st) {
  if (!userOrigin) return '\u2014';
  return Math.round(haversine(userOrigin.lat, userOrigin.lon, st.lat, st.lon)).toLocaleString() + ' mi';
}

const grid = document.getElementById('grid');
STATES.forEach(st => {
  const isChecked = checked.has(st.abbr);
  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrapper' + (isChecked ? ' checked' : '');
  wrapper.dataset.abbr = st.abbr;

  const svgData = svgBoxes[st.abbr] || { vb: '0 0 100 100', sw: 2 };
  const svgMarkup = STATE_PATHS[st.abbr]
    ? `<svg class="state-outline" viewBox="${svgData.vb}" preserveAspectRatio="xMidYMid meet"><path d="${STATE_PATHS[st.abbr]}" style="stroke-width:${svgData.sw}"/></svg>`
    : '';

  wrapper.innerHTML = `
    <div class="card">
      <div class="card-face card-front">
        <span class="found-badge">\u2713 Found</span>
        <div class="card-abbr">${st.abbr}</div>
        <div class="card-name">${st.name}</div>
        ${svgMarkup}
      </div>
      <div class="card-face card-back">
        ${svgMarkup}
        <div class="back-title">${st.name}</div>
        <div class="fact-row"><span class="fact-icon">\u{1F3DB}</span><div><div class="fact-label">Capital</div><div class="fact-text">${st.capital}</div></div></div>
        <div class="fact-row"><span class="fact-icon">\u2B50</span><div><div class="fact-label">Nickname</div><div class="fact-text">${st.nickname}</div></div></div>
        <div class="fact-row"><span class="fact-icon">\u{1F43E}</span><div><div class="fact-label">Animal</div><div class="fact-text">${st.animal}</div></div></div>
        <div class="fact-row"><span class="fact-icon">\u{1F33C}</span><div><div class="fact-label">Flower</div><div class="fact-text">${st.flower}</div></div></div>
        <div class="fact-row"><span class="fact-icon">\u{1F4CD}</span><div><div class="fact-label">Distance</div><div class="fact-text dist-label">${getDistLabel(st)}</div></div></div>
        <button class="info-btn" data-abbr="${st.abbr}">i</button>
      </div>
    </div>`;

  // Touch / click handling
  let didLongPress = false;

  function onPointerDown(e) {
    didLongPress = false;
    if (checked.has(st.abbr)) {
      longPressTimer = setTimeout(() => {
        didLongPress = true;
        showModal('Remove License Plate', `Remove ${st.name} from your found list?`, () => {
          checked.delete(st.abbr);
          save();
          wrapper.classList.remove('checked');
          const card = wrapper.querySelector('.card');
          if (card.classList.contains('flipped')) card.classList.remove('flipped');
          updateProgress();
          recheckAchievements();
        }, 'Remove License Plate');
      }, 600);
    }
  }

  function onPointerUp(e) {
    clearTimeout(longPressTimer);
    if (didLongPress) return;
    if (e.target.closest('.info-btn')) return; // handled separately
    if (isAnimating[st.abbr]) return;

    const card = wrapper.querySelector('.card');
    if (card.classList.contains('flipped')) {
      flipWithLock(card, st.abbr, false);
      return;
    }
    flipWithLock(card, st.abbr, true);

    if (!checked.has(st.abbr)) {
      checked.add(st.abbr);
      save();
      wrapper.classList.add('checked');
      updateProgress();
      spawnMiniConfetti(wrapper);
      checkNewAchievements();
    }
  }

  function onPointerLeave() { clearTimeout(longPressTimer); }

  wrapper.addEventListener('pointerdown', onPointerDown);
  wrapper.addEventListener('pointerup', onPointerUp);
  wrapper.addEventListener('pointerleave', onPointerLeave);
  wrapper.addEventListener('pointercancel', onPointerLeave);
  wrapper.addEventListener('contextmenu', e => e.preventDefault());

  // Info button handler — use click (more reliable on mobile with 3D transforms)
  wrapper.querySelector('.info-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    clearTimeout(longPressTimer);
    showInfoPopup(st.abbr);
  });

  grid.appendChild(wrapper);
});

function flipWithLock(card, abbr, toBack) {
  isAnimating[abbr] = true;
  const wrapper = card.parentElement;
  if (toBack) {
    wrapper.classList.add('raised');
    card.classList.add('flipped');
  } else {
    card.classList.remove('flipped');
    setTimeout(() => { wrapper.classList.remove('raised'); }, 600);
  }
  setTimeout(() => { isAnimating[abbr] = false; }, 600);
}

// === PERSISTENCE ===
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]));
  localStorage.setItem(ACH_KEY, JSON.stringify([...unlockedAch]));
}

function updateProgress() {
  const count = checked.size;
  document.getElementById('progressCount').textContent = `${count} / 50`;
  document.getElementById('progressFill').style.width = (count / 50 * 100) + '%';
  document.getElementById('achCount').textContent = `${unlockedAch.size}/${ACHIEVEMENTS.length}`;
}

// === INFO POPUP ===
function showInfoPopup(abbr) {
  const st = STATES.find(s => s.abbr === abbr);
  if (!st) return;
  const distText = userOrigin
    ? Math.round(haversine(userOrigin.lat, userOrigin.lon, st.lat, st.lon)).toLocaleString() + ' miles from home'
    : 'Set hometown to see distance';
  const popup = document.getElementById('infoPopup');

  // Find related states
  const sameAnimal = STATES.filter(s => s.abbr !== abbr && s.animal === st.animal).map(s => s.abbr);
  const sameFlower = STATES.filter(s => s.abbr !== abbr && s.flower === st.flower).map(s => s.abbr);

  const svgInfo = svgBoxes[abbr] || { vb: '0 0 100 100', sw: 2 };
  const svgPath = STATE_PATHS[abbr] || '';

  let html = `
    <div class="info-header">
      <svg class="info-outline" viewBox="${svgInfo.vb}" preserveAspectRatio="xMidYMid meet">
        <path d="${svgPath}" style="stroke-width:${svgInfo.sw}"/>
      </svg>
      <h2>${st.name}</h2>
      <div class="info-nickname">${st.nickname}</div>
    </div>
    <div class="info-fact">"${st.fact}"</div>
    <div class="info-section">
      <div class="info-row"><span class="info-icon">\u{1F3DB}</span><strong>Capital:</strong> ${st.capital}</div>
      <div class="info-row"><span class="info-icon">\u{1F4CD}</span><strong>Distance:</strong> ${distText}</div>
    </div>
    <div class="info-section">
      <div class="info-row"><span class="info-icon">\u{1F43E}</span><strong>State Animal:</strong> ${st.animal}</div>
      ${STATE_IMAGES[st.animal] ? `<img class="info-img" src="${STATE_IMAGES[st.animal]}" alt="${st.animal}" loading="lazy">` : ''}
      <div class="info-detail">${ANIMAL_FACTS[st.animal] || ''}</div>
      ${sameAnimal.length ? `<div class="info-related">Also the animal of: <span class="info-tags">${sameAnimal.map(a => `<span class="info-tag ${checked.has(a)?'found':''}">${a}</span>`).join('')}</span></div>` : ''}
    </div>
    <div class="info-section">
      <div class="info-row"><span class="info-icon">\u{1F33C}</span><strong>State Flower:</strong> ${st.flower}</div>
      ${STATE_IMAGES[st.flower] ? `<img class="info-img" src="${STATE_IMAGES[st.flower]}" alt="${st.flower}" loading="lazy">` : ''}
      <div class="info-detail">${FLOWER_FACTS[st.flower] || ''}</div>
      ${sameFlower.length ? `<div class="info-related">Also the flower of: <span class="info-tags">${sameFlower.map(a => `<span class="info-tag ${checked.has(a)?'found':''}">${a}</span>`).join('')}</span></div>` : ''}
    </div>`;

  popup.querySelector('.info-body').innerHTML = html;
  popup.classList.add('active');

  // Wire up image click → lightbox
  popup.querySelectorAll('.info-img').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(img.src, img.alt);
    });
  });
}

// === LIGHTBOX ===
const lightboxEl = document.getElementById('lightbox');

function openLightbox(src, label) {
  lightboxEl.querySelector('img').src = src;
  lightboxEl.querySelector('.lightbox-label').textContent = label;
  lightboxEl.classList.add('active');
}

function closeLightbox() {
  lightboxEl.classList.remove('active');
  lightboxEl.querySelector('img').src = '';
}

document.getElementById('lightboxClose').addEventListener('click', (e) => {
  e.stopPropagation();
  closeLightbox();
});
lightboxEl.addEventListener('click', (e) => {
  // Close on background tap, but not on image or label
  if (e.target === lightboxEl) closeLightbox();
});

document.getElementById('infoClose').addEventListener('click', () => {
  document.getElementById('infoPopup').classList.remove('active');
});
document.getElementById('infoPopup').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
});

// === ACHIEVEMENT SYSTEM ===
function checkNewAchievements() {
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(ach => {
    try {
      if (!unlockedAch.has(ach.id) && ach.test(checked, STATES, userOrigin)) {
        unlockedAch.add(ach.id);
        newlyUnlocked.push(ach);
      }
    } catch(e) {}
  });
  if (newlyUnlocked.length > 0) {
    save();
    updateProgress();
    renderAchievementSection();
    showAchievementPopup(newlyUnlocked);
  }
}

function recheckAchievements() {
  let changed = false;
  ACHIEVEMENTS.forEach(ach => {
    if (unlockedAch.has(ach.id) && !ach.test(checked, STATES, userOrigin)) {
      unlockedAch.delete(ach.id);
      changed = true;
    }
  });
  if (changed) { save(); updateProgress(); }
  renderAchievementSection();
}

// Achievement popup — reuses the existing modal system
function showAchievementPopup(achievements) {
  if (achievements.length === 0) return;
  const box = document.querySelector('.modal-box');
  const titleEl = document.getElementById('modalTitle');
  const textEl = document.getElementById('modalText');
  const cancelBtn = document.getElementById('modalCancel');
  const confirmBtn = document.getElementById('modalConfirm');

  box.classList.add('ach');
  cancelBtn.style.display = 'none';
  confirmBtn.textContent = 'Awesome!';
  confirmBtn.style.background = 'linear-gradient(135deg, #ffd200, #ff6b35)';

  if (achievements.length === 1) {
    const a = achievements[0];
    titleEl.innerHTML = '<div class="modal-ach-badge">Achievement Unlocked!</div><div class="modal-ach-icon">' + a.icon + '</div>' + a.name;
    titleEl.classList.add('ach');
    textEl.textContent = a.desc;
  } else {
    titleEl.innerHTML = '<div class="modal-ach-badge">Achievements Unlocked!</div><div class="modal-ach-icon">\u{1F3C6}</div>' + achievements.length + ' New!';
    titleEl.classList.add('ach');
    textEl.innerHTML = achievements.map(a => a.icon + ' <strong>' + a.name + '</strong> \u2014 ' + a.desc).join('<br>');
  }

  modalCallback = function() {
    // Cleanup: restore modal to normal state
    box.classList.remove('ach');
    titleEl.classList.remove('ach');
    cancelBtn.style.display = '';
    confirmBtn.textContent = 'Yes';
    confirmBtn.style.background = '';
  };
  document.getElementById('modal').classList.add('active');
  modalOpenedAt = Date.now();
  spawnFireworks();
}

// Achievement panel
document.getElementById('achBtn').addEventListener('click', showAchievementPanel);
document.getElementById('achPanelClose').addEventListener('click', () => {
  document.getElementById('achPanel').classList.remove('active');
});

function showAchievementPanel() {
  const panel = document.getElementById('achPanel');
  const body = panel.querySelector('.ach-body');
  let currentCat = '';
  let html = '';

  ACHIEVEMENTS.forEach(ach => {
    if (ach.cat !== currentCat) {
      currentCat = ach.cat;
      html += `<div class="ach-cat">${currentCat}</div>`;
    }
    const unlocked = ach.test(checked, STATES, userOrigin);
    html += `<div class="ach-item ${unlocked ? 'unlocked' : 'locked'}">
      <span class="ach-icon">${unlocked ? ach.icon : '\u{1F512}'}</span>
      <div class="ach-info">
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
      </div>
      ${unlocked ? '<span class="ach-check">\u2713</span>' : ''}
    </div>`;
  });

  body.innerHTML = html;
  panel.classList.add('active');
}

// === MODAL ===
let modalOpenedAt = 0;

function showModal(title, text, onConfirm, confirmLabel) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalText').textContent = text;
  document.getElementById('modalConfirm').textContent = confirmLabel || 'Yes';
  modalCallback = onConfirm;
  document.getElementById('modal').classList.add('active');
  modalOpenedAt = Date.now();
}

function closeModal() {
  // Ignore clicks within 400ms of opening (blocks synthetic click from card tap)
  if (Date.now() - modalOpenedAt < 400) return;
  document.getElementById('modal').classList.remove('active');
}

document.getElementById('modalCancel').addEventListener('click', () => {
  closeModal();
  modalCallback = null;
});
document.getElementById('modalConfirm').addEventListener('click', () => {
  closeModal();
  if (modalCallback) modalCallback();
  modalCallback = null;
});
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    closeModal();
    modalCallback = null;
  }
});

// === RESET ===
document.getElementById('resetBtn').addEventListener('click', () => {
  if (checked.size === 0) return;
  showModal('Reset All?', 'This will clear all your found states and achievements. Are you sure?', () => {
    checked.clear();
    unlockedAch.clear();
    save();
    document.querySelectorAll('.card-wrapper').forEach(w => {
      w.classList.remove('checked');
      w.querySelector('.card').classList.remove('flipped');
    });
    updateProgress();
    renderAchievementSection();
  });
});

// === MINI CONFETTI (per state found) ===
function spawnMiniConfetti(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ['#ffd200','#ff6b35','#4ecdc4','#667eea','#f093fb','#96c93d','#fff'];
  for (let i = 0; i < 28; i++) {
    const c = document.createElement('div');
    const isStrip = Math.random() > 0.5;
    const w = isStrip ? (3 + Math.random()*3) : (5 + Math.random()*6);
    const h = isStrip ? (8 + Math.random()*8) : w;
    c.style.cssText = 'position:fixed;pointer-events:none;z-index:300;';
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.style.borderRadius = isStrip ? '1px' : '50%';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.left = cx + 'px';
    c.style.top = cy + 'px';
    const angle = (Math.PI * 2 * i) / 28 + (Math.random()-0.5)*0.4;
    const speed = 80 + Math.random() * 100;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 50;
    const rot = Math.floor(Math.random()*360);
    c.animate([
      { transform: `translate(-50%,-50%) scale(1) rotate(0deg)`, opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3) rotate(${rot}deg)`, opacity: 0 }
    ], { duration: 600 + Math.random()*400, easing: 'cubic-bezier(0,.7,.3,1)', fill: 'forwards' });
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 900);
  }
}

// === CONFETTI + FIREWORKS ===
function spawnConfetti() {
  const colors = ['#ffd200','#ff6b35','#ff6b6b','#667eea','#764ba2','#4ecdc4','#96c93d','#f093fb'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    const isStrip = Math.random() > 0.6;
    const w = isStrip ? (3 + Math.random()*4) : (6 + Math.random()*8);
    const h = isStrip ? (12 + Math.random()*14) : w;
    c.style.left = Math.random()*100 + 'vw';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.style.borderRadius = isStrip ? '2px' : (Math.random() > 0.5 ? '50%' : '1px');
    c.style.setProperty('--drift', (Math.random()*80-40) + 'px');
    const dur = 2 + Math.random()*2;
    c.style.animationDuration = dur + 's';
    c.style.animationDelay = (Math.random()*0.5) + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), (dur+1)*1000);
  }
}

function spawnFireworks() {
  spawnConfetti();
  // Canvas fireworks burst
  let canvas = document.getElementById('fwCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'fwCanvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:350;pointer-events:none';
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles = [];
  const colors = ['#ffd200','#ff6b35','#ff4757','#4ecdc4','#667eea','#f093fb','#96c93d','#fff'];
  // Launch 3 bursts at staggered times
  function burst(cx, cy) {
    const count = 40 + Math.floor(Math.random()*20);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random()-0.5)*0.3;
      const speed = 2 + Math.random()*4;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        life: 1,
        decay: 0.012 + Math.random()*0.01,
        color: colors[Math.floor(Math.random()*colors.length)],
        size: 2 + Math.random()*2,
        trail: []
      });
    }
  }
  // Stagger 3 bursts
  burst(canvas.width*0.5, canvas.height*0.35);
  setTimeout(() => burst(canvas.width*0.25, canvas.height*0.3), 200);
  setTimeout(() => burst(canvas.width*0.75, canvas.height*0.3), 400);

  let animId;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.trail.push({x:p.x, y:p.y, a:p.life*0.4});
      if (p.trail.length > 5) p.trail.shift();
      // Draw trail
      p.trail.forEach(t => {
        ctx.globalAlpha = t.a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.size*0.5, 0, Math.PI*2);
        ctx.fill();
      });
      // Draw particle
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.vx *= 0.985;
      p.life -= p.decay;
    });
    ctx.globalAlpha = 1;
    if (alive) animId = requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  draw();
}

// === HOMETOWN ===
function initHometown() {
  const inputRow = document.getElementById('hometownInputRow');
  const display = document.getElementById('hometownDisplay');
  const input = document.getElementById('hometownInput');
  const goBtn = document.getElementById('hometownGo');
  const nameEl = document.getElementById('hometownName');
  const editBtn = document.getElementById('hometownEditBtn');

  function showSet() {
    inputRow.style.display = 'none';
    display.style.display = 'flex';
    nameEl.textContent = userOrigin.name;
  }
  function showInput() {
    inputRow.style.display = 'flex';
    display.style.display = 'none';
    input.value = '';
    input.focus();
  }

  if (userOrigin) showSet();

  async function geocode() {
    const q = input.value.trim();
    if (!q) return;
    goBtn.textContent = '...';
    goBtn.disabled = true;
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=us&format=json&limit=1&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (!data.length) {
        input.value = '';
        input.placeholder = 'City not found, try again...';
        return;
      }
      const place = data[0];
      const addr = place.address || {};
      const city = addr.city || addr.town || addr.village || addr.hamlet || place.display_name.split(',')[0];
      const stateAbbr = STATE_NAME_TO_ABBR[addr.state || ''] || '';
      const zip = addr.postcode || '';
      const homeName = stateAbbr && zip ? `${city}, ${stateAbbr} ${zip}` : city;
      userOrigin = { name: homeName, lat: parseFloat(place.lat), lon: parseFloat(place.lon) };
      localStorage.setItem(HOME_KEY, JSON.stringify(userOrigin));
      showSet();
      updateAllDistances();
      recheckAchievements();
    } catch(e) {
      input.placeholder = 'Error, try again...';
    } finally {
      goBtn.textContent = 'Go';
      goBtn.disabled = false;
    }
  }

  goBtn.addEventListener('click', geocode);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') geocode(); });
  editBtn.addEventListener('click', showInput);
}

function updateAllDistances() {
  document.querySelectorAll('.card-wrapper').forEach(wrapper => {
    const abbr = wrapper.dataset.abbr;
    const st = STATES.find(s => s.abbr === abbr);
    if (!st) return;
    const el = wrapper.querySelector('.dist-label');
    if (el) el.textContent = getDistLabel(st);
  });
}

// === ACHIEVEMENT SECTION ===
function renderAchievementSection() {
  const grid = document.getElementById('achGrid');
  const countEl = document.getElementById('achSectionCount');
  let unlocked = 0;
  let currentCat = '';
  let html = '';

  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = ach.test(checked, STATES, userOrigin);
    if (isUnlocked) unlocked++;
    if (ach.cat !== currentCat) {
      currentCat = ach.cat;
      html += `<div class="ach-cat-label">${currentCat}</div>`;
    }
    html += `<div class="ach-card ${isUnlocked ? 'unlocked' : 'locked'}">
      <span class="ach-card-icon">${isUnlocked ? ach.icon : '\u{1F512}'}</span>
      <div class="ach-card-info">
        <div class="ach-card-name">${ach.name}</div>
        <div class="ach-card-desc">${ach.desc}</div>
      </div>
      ${isUnlocked ? '<span class="ach-card-check">\u2713</span>' : ''}
    </div>`;
  });

  grid.innerHTML = html;
  countEl.textContent = `${unlocked} / ${ACHIEVEMENTS.length}`;
}

// === INIT ===
initHometown();
updateProgress();
// Detect achievements that qualify but were never shown (e.g. earned before code update or between sessions)
const initNew = [];
ACHIEVEMENTS.forEach(ach => {
  if (ach.test(checked, STATES, userOrigin)) {
    if (!unlockedAch.has(ach.id)) initNew.push(ach);
    unlockedAch.add(ach.id);
  }
});
save();
updateProgress();
renderAchievementSection();
// Show popups for any achievements earned but never notified
if (initNew.length > 0) {
  setTimeout(() => showAchievementPopup(initNew), 500);
}
