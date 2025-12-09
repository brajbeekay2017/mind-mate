// Simple rules as described in the starter spec
module.exports = function detectStress(entries) {
  // entries is an array of {mood, stress, timestamp}
  if (!Array.isArray(entries) || entries.length === 0) return { triggered: false, reason: null };
  const last = entries.slice(-4);
  // rule 1: if 2 of last 3 entries have stress >=4
  const last3 = entries.slice(-3);
  const stressHighCount = last3.filter(e => e.stress >= 4).length;
  if (stressHighCount >= 2) return { triggered: true, reason: 'recent stress spikes' };
  // rule 2: mood drops >=2 across last 4 entries
  if (last.length >= 4) {
    const moods = last.map(e => e.mood);
    const diff = Math.max(...moods) - Math.min(...moods);
    if (diff >= 2) return { triggered: true, reason: 'mood drop detected' };
  }
  return { triggered: false, reason: null };
};
