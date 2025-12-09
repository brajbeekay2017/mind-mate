const detectStress = require('../src/services/stressDetector');

test('detects stress when 2 of last 3 stress >= 4', () => {
  const entries = [
    { mood: 5, stress: 1 },
    { mood: 4, stress: 4 },
    { mood: 3, stress: 5 }
  ];
  const res = detectStress(entries);
  expect(res.triggered).toBe(true);
  expect(res.reason).toMatch(/stress/i);
});

test('detects mood drop >=2 across last 4', () => {
  const entries = [
    { mood: 5, stress: 1 },
    { mood: 5, stress: 1 },
    { mood: 3, stress: 2 },
    { mood: 2, stress: 2 }
  ];
  const res = detectStress(entries);
  expect(res.triggered).toBe(true);
  expect(res.reason).toMatch(/mood/i);
});

test('no trigger for stable low stress', () => {
  const entries = [
    { mood: 4, stress: 1 },
    { mood: 4, stress: 1 },
    { mood: 4, stress: 1 }
  ];
  const res = detectStress(entries);
  expect(res.triggered).toBe(false);
});
