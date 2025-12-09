// Evaluate mood + Google Fit metrics to determine stress severity
function evaluate(entries = [], googleFit = {}) {
  const last = Array.isArray(entries) ? entries.slice(-12) : [];
  const moodNums = last.map(e => Number(e.mood)).filter(n => !Number.isNaN(n));
  const stressNums = last.map(e => Number(e.stress)).filter(n => !Number.isNaN(n));
  const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const avgStress = +(avg(stressNums) || 0).toFixed(2);
  const avgMood = +(avg(moodNums) || 0).toFixed(2);

  const heartPoints = Number(googleFit.heartPoints || googleFit.heartPointsTotal || 0) || 0;
  const restingHR = Number(googleFit.restingHeartRate || googleFit.restingHeartRateAvg || 0) || 0;

  const reasons = [];
  if (avgStress >= 4) reasons.push(`Average stress is high (${avgStress})`);
  else if (avgStress >= 3.5) reasons.push(`Average stress is elevated (${avgStress})`);
  if (restingHR >= 95) reasons.push(`Resting heart rate is high (${restingHR})`);
  if (heartPoints === 0) reasons.push('No heart points detected recently');

  let severity = 'none';
  if (avgStress >= 4 || restingHR >= 95) severity = 'very_high';
  else if (avgStress >= 3.5 || restingHR >= 90) severity = 'high';
  else if (avgStress >= 2.5) severity = 'moderate';
  else if (avgStress >= 1.5) severity = 'low';

  return { severity, avgStress, avgMood, heartPoints, restingHR, reasons };
}

module.exports = { evaluate };
