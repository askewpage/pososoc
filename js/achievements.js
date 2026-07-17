// Achievement definitions. Each is checked against the running game stats
// after every relevant event — see game.js#checkAchievements().

export const ACHIEVEMENTS = [
  { id: 'first_catch', name: 'First Blood', desc: 'Escalate your first real incident.', check: (s) => s.totalCatches >= 1 },
  { id: 'combo_10', name: 'In The Zone', desc: 'Reach a x10 combo.', check: (s) => s.bestCombo >= 10 },
  { id: 'combo_25', name: 'Autopilot', desc: 'Reach a x25 combo.', check: (s) => s.bestCombo >= 25 },
  { id: 'sqli_slayer', name: 'SQL Slayer', desc: 'Catch 15 SQL Injection attempts.', check: (s) => (s.catchesByCategory.sqli || 0) >= 15 },
  { id: 'xss_hunter', name: 'XSS Hunter', desc: 'Catch 15 Cross-Site Scripting attempts.', check: (s) => (s.catchesByCategory.xss || 0) >= 15 },
  { id: 'level_5', name: 'Threat Hunter', desc: 'Reach level 5 in Standard mode.', check: (s) => s.mode === 'standard' && s.level >= 5 },
  { id: 'level_8', name: 'Cyber Sentinel', desc: 'Reach level 8 in Standard mode.', check: (s) => s.mode === 'standard' && s.level >= 8 },
  { id: 'clean_shift', name: 'Clean Shift', desc: 'Catch 20+ incidents with zero false positives.', check: (s) => s.totalCatches >= 20 && s.falsePositives === 0 },
  { id: 'perfectionist', name: 'Perfectionist', desc: 'Catch 20+ incidents without missing a single one.', check: (s) => s.totalCatches >= 20 && s.missed === 0 },
  { id: 'turbo_60', name: 'Turbo Master', desc: 'Survive 60 seconds in Turbo mode.', check: (s) => s.mode === 'turbo' && s.elapsedSec >= 60 },
  { id: 'turbo_120', name: 'Reflex God', desc: 'Survive 120 seconds in Turbo mode.', check: (s) => s.mode === 'turbo' && s.elapsedSec >= 120 },
  { id: 'score_1000', name: 'Four Figures', desc: 'Score 1,000 points in a single shift.', check: (s) => s.score >= 1000 },
  { id: 'score_5000', name: 'SOC Legend', desc: 'Score 5,000 points in a single shift.', check: (s) => s.score >= 5000 },
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
