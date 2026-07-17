import { rand, pick, benignLine, threatLine, levelConfig, TURBO_CONFIG, CATEGORIES, ALL_CATS } from './data.js';
import { sfxCatch, sfxFalsePositive, sfxMissed, sfxLevelUp, sfxClassifyCorrect } from './audio.js';

let uid = 0;

export class Game {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.paneEl - scrolling log container
   * @param {'training'|'standard'|'turbo'} opts.mode
   * @param {Object} opts.callbacks
   */
  constructor({ paneEl, mode, callbacks }) {
    this.paneEl = paneEl;
    this.mode = mode;
    this.cb = callbacks || {};
    this.activeLines = []; // newest first
    this.spawnTimer = null;
    this.tickTimer = null;
    this.paused = false;
    this.running = false;
    this.pendingClassify = false;
    this.lineHeight = 36;
    this.maxVisible = 10;

    this.stats = {
      mode,
      score: 0,
      combo: 0,
      bestCombo: 0,
      lives: mode === 'training' ? Infinity : 3,
      maxLives: 3,
      stress: 0,
      level: 1,
      elapsedSec: 0,
      totalCatches: 0,
      falsePositives: 0,
      missed: 0,
      catchesByCategory: {},
    };

    this._measure();
    window.addEventListener('resize', () => this._measure());
    this.paneEl.addEventListener('click', (e) => {
      const row = e.target.closest('.log-line');
      if (row) this._resolveCatch(row.dataset.id, row);
    });
    this._onKeydown = (e) => {
      if (!this.running || this.paused) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        const newest = this.activeLines[0];
        if (newest) this._resolveCatch(newest.id, newest.el);
      }
    };
    document.addEventListener('keydown', this._onKeydown);
  }

  _measure() {
    const cs = getComputedStyle(document.documentElement);
    const lh = parseFloat(cs.getPropertyValue('--line-height'));
    this.lineHeight = lh || 36;
    this.maxVisible = Math.max(3, Math.floor(this.paneEl.clientHeight / this.lineHeight));
  }

  start() {
    this.running = true;
    this.paused = false;
    this._scheduleSpawn();
    this.tickTimer = setInterval(() => this._tick(), 1000);
    this._emitStats();
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    clearTimeout(this.spawnTimer);
    clearInterval(this.tickTimer);
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this._scheduleSpawn();
    this.tickTimer = setInterval(() => this._tick(), 1000);
  }

  stop() {
    this.running = false;
    clearTimeout(this.spawnTimer);
    clearInterval(this.tickTimer);
    document.removeEventListener('keydown', this._onKeydown);
  }

  _currentConfig() {
    if (this.mode === 'turbo') {
      const ramp = Math.floor(this.stats.elapsedSec / 20) * 12;
      return { ...TURBO_CONFIG, spawnMs: Math.max(150, TURBO_CONFIG.spawnMs - ramp) };
    }
    return levelConfig(this.stats.level);
  }

  _scheduleSpawn() {
    if (!this.running || this.paused) return;
    const cfg = this._currentConfig();
    this.spawnTimer = setTimeout(() => {
      this._spawn();
      this._scheduleSpawn();
    }, cfg.spawnMs);
  }

  _tick() {
    this.stats.elapsedSec += 1;
    // alert-fatigue: stress slowly cools down when things are going well
    if (this.stats.stress > 0) this.stats.stress = Math.max(0, this.stats.stress - 2);
    this._emitStats();
  }

  _spawn() {
    const cfg = this._currentConfig();
    const isThreat = Math.random() < cfg.threatChance;
    let data;
    if (isThreat) {
      const cat = pick(cfg.cats && cfg.cats.length ? cfg.cats : ALL_CATS);
      data = threatLine(cat, cfg.disguiseChance);
    } else {
      data = benignLine();
      data.isThreat = false;
    }
    const entry = {
      id: String(++uid),
      ts: new Date(),
      ...data,
      resolved: false,
    };
    entry.el = this._render(entry);
    this.activeLines.unshift(entry);
    this.paneEl.prepend(entry.el);

    while (this.activeLines.length > this.maxVisible) {
      const oldest = this.activeLines.pop();
      this._expire(oldest);
    }
  }

  _render(entry) {
    const row = document.createElement('div');
    row.className = `log-line level-${entry.level.toLowerCase()}`;
    row.dataset.id = entry.id;
    if (this.mode === 'training' && entry.isThreat) {
      row.classList.add('hint');
      row.style.setProperty('--cat-color', CATEGORIES[entry.category].color);
    }

    const time = document.createElement('span');
    time.className = 'col-time';
    time.textContent = entry.ts.toLocaleTimeString('en-GB', { hour12: false });

    const lvl = document.createElement('span');
    lvl.className = 'col-level';
    lvl.textContent = entry.level;

    const svc = document.createElement('span');
    svc.className = 'col-service';
    svc.textContent = entry.service;

    const msg = document.createElement('span');
    msg.className = 'col-message';
    msg.textContent = entry.message;

    row.append(time, lvl, svc, msg);

    requestAnimationFrame(() => row.classList.add('show'));
    return row;
  }

  _resolveCatch(id, el) {
    const idx = this.activeLines.findIndex((l) => l.id === id && !l.resolved);
    if (idx === -1) return;
    const entry = this.activeLines[idx];
    entry.resolved = true;

    if (entry.isThreat) {
      this._onCorrectCatch(entry, el);
    } else {
      this._onFalsePositive(entry, el);
    }
    this._emitStats();
  }

  _onCorrectCatch(entry, el) {
    this.stats.combo += 1;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.combo);
    const multiplier = 1 + Math.floor(this.stats.combo / 5) * 0.5;
    const base = 10;
    const gained = Math.round(base * multiplier);
    this.stats.score += gained;
    this.stats.totalCatches += 1;
    this.stats.catchesByCategory[entry.category] = (this.stats.catchesByCategory[entry.category] || 0) + 1;
    this.stats.stress = Math.max(0, this.stats.stress - 3);

    // level up standard mode by catch count
    if (this.mode === 'standard' || this.mode === 'training') {
      const nextLevelAt = this.stats.level * 6;
      if (this.stats.totalCatches >= nextLevelAt) {
        this.stats.level += 1;
        sfxLevelUp();
        this.cb.onLevelUp && this.cb.onLevelUp(this.stats.level);
      }
    }

    sfxCatch();
    el && el.classList.add('flash-good');
    this.cb.onToast && this.cb.onToast({ text: `+${gained}`, kind: 'good', el });
    this.cb.onTicket && this.cb.onTicket({ category: entry.category, mitre: entry.mitre, message: entry.message, status: 'escalated' });

    this._removeSoon(entry);

    if (this.mode !== 'turbo' && !this.pendingClassify) {
      this.pendingClassify = true;
      const options = this._classifyOptions(entry.category);
      this.cb.onClassifyOpen && this.cb.onClassifyOpen({
        entry,
        options,
        resolve: (chosenId) => this._resolveClassification(entry, chosenId),
      });
    }
  }

  _classifyOptions(correctCategory) {
    const others = ALL_CATS.filter((c) => c !== correctCategory);
    const distractors = [];
    while (distractors.length < 2 && others.length) {
      const c = others.splice(rand(0, others.length - 1), 1)[0];
      distractors.push(c);
    }
    const opts = [correctCategory, ...distractors].map((id) => ({ id, label: CATEGORIES[id].label }));
    return opts.sort(() => Math.random() - 0.5);
  }

  _resolveClassification(entry, chosenId) {
    this.pendingClassify = false;
    if (chosenId === entry.category) {
      this.stats.score += 15;
      sfxClassifyCorrect();
      this.cb.onToast && this.cb.onToast({ text: '+15 correct tag', kind: 'good' });
      this.cb.onTicket && this.cb.onTicket({ category: entry.category, mitre: entry.mitre, message: entry.message, status: 'confirmed' });
    }
    this._emitStats();
  }

  _onFalsePositive(entry, el) {
    this.stats.combo = 0;
    this.stats.score = Math.max(0, this.stats.score - 5);
    this.stats.falsePositives += 1;
    this.stats.stress = Math.min(100, this.stats.stress + 12);
    sfxFalsePositive();
    el && el.classList.add('flash-bad');
    this.cb.onToast && this.cb.onToast({ text: '-5 false positive', kind: 'bad', el });
    this._removeSoon(entry);
    this._checkStressGameOver();
  }

  _expire(entry) {
    if (entry.resolved) {
      entry.el && entry.el.remove();
      return;
    }
    if (entry.isThreat) {
      entry.resolved = true;
      this.stats.combo = 0;
      this.stats.missed += 1;
      this.stats.stress = Math.min(100, this.stats.stress + 18);
      if (this.mode !== 'training') this.stats.lives -= 1;
      sfxMissed();
      this.cb.onToast && this.cb.onToast({ text: 'MISSED INCIDENT', kind: 'bad', el: entry.el });
      this.cb.onTicket && this.cb.onTicket({ category: entry.category, mitre: entry.mitre, message: entry.message, status: 'missed' });
    }
    entry.el && entry.el.remove();
    this._emitStats();
    this._checkLivesGameOver();
    this._checkStressGameOver();
  }

  _removeSoon(entry) {
    setTimeout(() => {
      entry.el && entry.el.remove();
    }, 260);
  }

  _checkLivesGameOver() {
    if (this.mode !== 'training' && this.stats.lives <= 0) {
      this._gameOver('missed_incidents');
    }
  }

  _checkStressGameOver() {
    if (this.mode !== 'training' && this.stats.stress >= 100) {
      this._gameOver('burnout');
    }
  }

  _gameOver(reason) {
    if (!this.running) return;
    this.stop();
    this.cb.onGameOver && this.cb.onGameOver({ ...this.stats, reason });
  }

  getStats() {
    return { ...this.stats, catchesByCategory: { ...this.stats.catchesByCategory } };
  }

  _emitStats() {
    this.cb.onStats && this.cb.onStats(this.getStats());
  }
}
