import { Game } from './game.js';
import { CATEGORIES, categoryExample } from './data.js';
import { ACHIEVEMENTS, getAchievement } from './achievements.js';
import * as storage from './storage.js';
import { setSoundEnabled, sfxAchievement } from './audio.js';

// ---------------------------------------------------------------- helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmtTime = (sec) => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
const MODE_LABEL = { training: 'TRAINING', standard: 'STANDARD', turbo: 'TURBO' };

// ---------------------------------------------------------------- elements
const logPane = $('#log-pane');
const ticketQueue = $('#ticket-queue');
const iocFeed = $('#ioc-feed');
const legendBox = $('#legend-box');
const legendList = $('#legend-list');
const toastContainer = $('#toast-container');

const startScreen = $('#start-screen');
const modeGrid = $('#mode-grid');
const btnStart = $('#btn-start');

const classifyCard = $('#classify-card');
const ringProgress = $('#ring-progress');
const classifyMsg = $('#classify-msg');
const classifyOptions = $('#classify-options');

const pauseScreen = $('#pause-screen');
const gameoverScreen = $('#gameover-screen');

let game = null;
let selectedMode = null;
let iocInterval = null;
let classifyTimeout = null;
let sessionUnlocked = [];
let lastGameStats = null;

// ---------------------------------------------------------------- settings
const settings = storage.getSettings();
setSoundEnabled(settings.sound !== false);
updateSoundBtn();

function updateSoundBtn() {
  $('#btn-sound').textContent = settings.sound !== false ? '🔊' : '🔇';
}

$('#btn-sound').addEventListener('click', () => {
  settings.sound = settings.sound === false ? true : false;
  setSoundEnabled(settings.sound);
  storage.saveSettings(settings);
  updateSoundBtn();
});

// ---------------------------------------------------------------- mode select
modeGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.mode-card');
  if (!card) return;
  $$('.mode-card').forEach((c) => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedMode = card.dataset.mode;
  btnStart.disabled = false;
});

btnStart.addEventListener('click', () => {
  if (!selectedMode) return;
  startGame(selectedMode);
});

// ---------------------------------------------------------------- field manual
$('#btn-manual').addEventListener('click', () => {
  const list = $('#manual-list');
  list.innerHTML = '';
  Object.entries(CATEGORIES).forEach(([id, meta]) => {
    const row = document.createElement('div');
    row.className = 'manual-row';
    row.innerHTML = `
      <span class="manual-swatch" style="background:${meta.color}"></span>
      <div class="manual-text">
        <div class="manual-name">${meta.label} <span class="mitre-tag">${meta.mitre}</span></div>
        <div class="manual-example"></div>
      </div>`;
    row.querySelector('.manual-example').textContent = categoryExample(id);
    list.appendChild(row);
  });
  show('#manual-screen');
});

// ---------------------------------------------------------------- scores screen
$('#btn-scores').addEventListener('click', () => openScores('standard'));
$$('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderScoresList(btn.dataset.scoremode);
  });
});
function openScores(mode) {
  $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.scoremode === mode));
  renderScoresList(mode);
  renderAchievementsGrid();
  show('#scores-screen');
}
function renderScoresList(mode) {
  const list = storage.getHighScores(mode);
  const el = $('#scores-list');
  el.innerHTML = '';
  if (!list.length) {
    el.innerHTML = '<li class="empty">Пока пусто. Заступи на смену первым.</li>';
    return;
  }
  list.forEach((entry) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="sc-name">${escapeHtml(entry.name)}</span><span class="sc-score">${entry.score}</span>`;
    el.appendChild(li);
  });
}
function renderAchievementsGrid() {
  const unlocked = storage.getUnlockedAchievements();
  const grid = $('#achievements-grid');
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach((a) => {
    const has = unlocked.includes(a.id);
    const card = document.createElement('div');
    card.className = `ach-card ${has ? 'unlocked' : 'locked'}`;
    card.innerHTML = `<div class="ach-icon">${has ? '🎖' : '🔒'}</div><div class="ach-name">${has ? a.name : '???'}</div><div class="ach-desc">${has ? a.desc : 'Скрыто'}</div>`;
    grid.appendChild(card);
  });
}
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ---------------------------------------------------------------- overlay open/close
function show(sel) { $(sel).classList.remove('hidden'); }
function hide(sel) { $(sel).classList.add('hidden'); }

document.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) hide('#' + closeBtn.dataset.close);
});

// ---------------------------------------------------------------- pause
$('#btn-pause').addEventListener('click', () => {
  if (!game) return;
  game.pause();
  show('#pause-screen');
});
$('#btn-resume').addEventListener('click', () => {
  hide('#pause-screen');
  game && game.resume();
});
$('#btn-quit').addEventListener('click', () => {
  hide('#pause-screen');
  endToMenu();
});

// ---------------------------------------------------------------- game lifecycle
function startGame(mode) {
  hide('#start-screen');
  show('#hud');
  show('#game-area');
  logPane.innerHTML = '';
  ticketQueue.innerHTML = '';
  sessionUnlocked = [];

  $('#hud-mode').textContent = MODE_LABEL[mode];
  $('#hud-mode').className = `pill pill-${mode}`;
  legendBox.classList.toggle('hidden', mode !== 'training');
  if (mode === 'training') renderLegend();

  document.getElementById('hud-lives').parentElement?.classList.toggle('no-lives', mode === 'training');

  game = new Game({
    paneEl: logPane,
    mode,
    callbacks: {
      onStats: handleStats,
      onToast: handleToast,
      onTicket: handleTicket,
      onClassifyOpen: handleClassifyOpen,
      onLevelUp: handleLevelUp,
      onGameOver: handleGameOver,
    },
  });
  game.start();
  startIocFeed();
}

function endToMenu() {
  if (game) game.stop();
  game = null;
  stopIocFeed();
  hide('#hud'); hide('#game-area'); hide('#gameover-screen'); hide('#pause-screen');
  show('#start-screen');
}

function renderLegend() {
  legendList.innerHTML = '';
  Object.values(CATEGORIES).forEach((meta) => {
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.innerHTML = `<span class="legend-swatch" style="background:${meta.color}"></span>${meta.label}`;
    legendList.appendChild(row);
  });
}

// ---------------------------------------------------------------- HUD updates
function handleStats(stats) {
  lastGameStats = stats;
  $('#hud-score').textContent = stats.score;
  $('#hud-combo').textContent = `x${stats.combo}`;
  $('#hud-combo').classList.toggle('hot', stats.combo >= 10);
  $('#hud-time').textContent = fmtTime(stats.elapsedSec);
  $('#hud-level').textContent = stats.mode === 'turbo' ? '⚡ TURBO' : `LVL ${stats.level}`;

  const livesEl = $('#hud-lives');
  if (stats.mode === 'training') {
    livesEl.innerHTML = '<span class="infinity">∞ practice</span>';
  } else {
    livesEl.innerHTML = Array.from({ length: stats.maxLives }, (_, i) =>
      `<span class="heart ${i < stats.lives ? 'full' : 'empty'}">❤</span>`
    ).join('');
  }

  const stressFill = $('#hud-stress-fill');
  stressFill.style.width = `${stats.stress}%`;
  stressFill.className = `stress-fill ${stats.stress > 70 ? 'critical' : stats.stress > 40 ? 'warn' : ''}`;

  checkAchievements(stats);
}

function checkAchievements(stats) {
  ACHIEVEMENTS.forEach((a) => {
    if (storage.getUnlockedAchievements().includes(a.id)) return;
    if (a.check(stats)) {
      const firstTime = storage.unlockAchievement(a.id);
      if (firstTime) {
        sessionUnlocked.push(a.id);
        showAchievementToast(a);
      }
    }
  });
}

function showAchievementToast(a) {
  sfxAchievement();
  const el = $('#achievement-toast');
  el.innerHTML = `<span class="ach-toast-icon">🎖</span><div><div class="ach-toast-title">Достижение разблокировано</div><div class="ach-toast-name">${a.name}</div></div>`;
  el.classList.remove('hidden');
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 400);
  }, 3200);
}

// ---------------------------------------------------------------- toasts
function handleToast({ text, kind, el }) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${kind}`;
  toast.textContent = text;
  let x = window.innerWidth / 2, y = 80;
  if (el) {
    const r = el.getBoundingClientRect();
    x = r.right - 60;
    y = r.top + r.height / 2;
  }
  toast.style.left = `${x}px`;
  toast.style.top = `${y}px`;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('rise'));
  setTimeout(() => toast.remove(), 900);
}

// ---------------------------------------------------------------- ticket queue
function handleTicket({ category, mitre, message, status }) {
  const meta = CATEGORIES[category];
  const li = document.createElement('div');
  li.className = `ticket ticket-${status}`;
  li.style.setProperty('--cat-color', meta.color);
  const statusLabel = { escalated: 'PENDING', confirmed: 'CONFIRMED', missed: 'MISSED' }[status];
  li.innerHTML = `
    <div class="ticket-head"><span class="ticket-cat">${meta.label}</span><span class="ticket-status">${statusLabel}</span></div>
    <div class="ticket-mitre">${mitre}</div>`;
  ticketQueue.prepend(li);
  while (ticketQueue.children.length > 6) ticketQueue.lastElementChild.remove();
}

// ---------------------------------------------------------------- classification popup
function handleClassifyOpen({ entry, options, resolve }) {
  classifyMsg.textContent = entry.message.length > 90 ? entry.message.slice(0, 90) + '…' : entry.message;
  classifyOptions.innerHTML = '';
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'classify-opt';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      finishClassify(resolve, opt.id);
    });
    classifyOptions.appendChild(btn);
  });
  classifyCard.classList.remove('hidden');
  requestAnimationFrame(() => ringProgress.classList.add('run'));
  clearTimeout(classifyTimeout);
  classifyTimeout = setTimeout(() => finishClassify(resolve, null), 4200);
}
function finishClassify(resolve, chosenId) {
  clearTimeout(classifyTimeout);
  ringProgress.classList.remove('run');
  classifyCard.classList.add('hidden');
  resolve(chosenId);
}

// ---------------------------------------------------------------- level up
function handleLevelUp(level) {
  handleToast({ text: `LEVEL UP → ${level}`, kind: 'level' });
}

// ---------------------------------------------------------------- game over
function handleGameOver(stats) {
  hide('#pause-screen');
  const reasonText = {
    missed_incidents: '💥 Слишком много пропущенных инцидентов — вас отстранили от смены.',
    burnout: '🔥 Выгорание. Стресс достиг 100% — пора домой.',
  }[stats.reason] || 'Смена окончена.';
  $('#gameover-reason').textContent = reasonText;

  const s = $('#gameover-stats');
  s.innerHTML = `
    <div class="go-stat"><span>Счёт</span><b>${stats.score}</b></div>
    <div class="go-stat"><span>Лучшее комбо</span><b>x${stats.bestCombo}</b></div>
    <div class="go-stat"><span>Поймано инцидентов</span><b>${stats.totalCatches}</b></div>
    <div class="go-stat"><span>Ложные срабатывания</span><b>${stats.falsePositives}</b></div>
    <div class="go-stat"><span>Пропущено</span><b>${stats.missed}</b></div>
    <div class="go-stat"><span>Время смены</span><b>${fmtTime(stats.elapsedSec)}</b></div>
  `;

  const newAch = $('#new-achievements');
  newAch.innerHTML = '';
  sessionUnlocked.forEach((id) => {
    const a = getAchievement(id);
    if (!a) return;
    const badge = document.createElement('span');
    badge.className = 'new-ach-badge';
    badge.textContent = `🎖 ${a.name}`;
    newAch.appendChild(badge);
  });

  const scoreMode = stats.mode;
  const existing = storage.getHighScores(scoreMode);
  const qualifies = stats.score > 0 && (existing.length < 10 || stats.score > existing[existing.length - 1].score);
  const entryBox = $('#highscore-entry');
  if (qualifies) {
    entryBox.classList.remove('hidden');
    const input = $('#initials-input');
    input.value = '';
    const submit = () => {
      storage.submitHighScore(scoreMode, input.value.trim(), stats.score, { combo: stats.bestCombo, catches: stats.totalCatches });
      entryBox.classList.add('hidden');
    };
    $('#btn-submit-score').onclick = submit;
  } else {
    entryBox.classList.add('hidden');
  }

  stopIocFeed();
  show('#gameover-screen');
}

$('#btn-retry').addEventListener('click', () => {
  const mode = lastGameStats ? lastGameStats.mode : selectedMode;
  hide('#gameover-screen');
  startGame(mode);
});
$('#btn-menu').addEventListener('click', () => {
  hide('#gameover-screen');
  endToMenu();
});

// ---------------------------------------------------------------- decorative IOC feed
const IOC_POOL = [
  '185.220.101.42 — TOR exit node (malicious)',
  'update-cdn-sync.net — flagged C2 domain',
  'SHA256:9f2a...c31e — known ransomware dropper',
  '45.153.160.2 — brute-force source (blocklist)',
  'freehost-panel.ru — phishing infrastructure',
  'JA3 771,4866-4867 — Cobalt Strike fingerprint',
  '203.0.113.77 — scanning /wp-admin across fleet',
  'CVE-2024-3400 — active exploitation observed',
];
function startIocFeed() {
  iocFeed.innerHTML = '';
  iocInterval = setInterval(() => {
    const item = document.createElement('div');
    item.className = 'ioc-item';
    item.textContent = IOC_POOL[Math.floor(Math.random() * IOC_POOL.length)];
    iocFeed.prepend(item);
    while (iocFeed.children.length > 5) iocFeed.lastElementChild.remove();
  }, 3500);
}
function stopIocFeed() {
  clearInterval(iocInterval);
}

// ---------------------------------------------------------------- keyboard: pause with Escape/P
document.addEventListener('keydown', (e) => {
  if (!game) return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (pauseScreen.classList.contains('hidden')) {
      game.pause();
      show('#pause-screen');
    } else {
      hide('#pause-screen');
      game.resume();
    }
  }
});
