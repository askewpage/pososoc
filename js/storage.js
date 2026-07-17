// localStorage persistence: high scores, achievements, settings.

const KEYS = {
  scores: (mode) => `soclv_highscores_${mode}`,
  achievements: 'soclv_achievements',
  settings: 'soclv_settings',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function getHighScores(mode) {
  return readJSON(KEYS.scores(mode), []);
}

export function submitHighScore(mode, name, score, extra = {}) {
  const list = getHighScores(mode);
  list.push({ name: name.slice(0, 12) || 'ANON', score, date: new Date().toISOString(), ...extra });
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, 10);
  writeJSON(KEYS.scores(mode), trimmed);
  return trimmed;
}

export function getUnlockedAchievements() {
  return readJSON(KEYS.achievements, []);
}

export function unlockAchievement(id) {
  const list = getUnlockedAchievements();
  if (!list.includes(id)) {
    list.push(id);
    writeJSON(KEYS.achievements, list);
    return true;
  }
  return false;
}

export function getSettings() {
  return readJSON(KEYS.settings, { sound: true });
}

export function saveSettings(settings) {
  writeJSON(KEYS.settings, settings);
}
