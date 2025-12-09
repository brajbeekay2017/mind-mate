const request = require('supertest');
const app = require('../src/server');
const fs = require('fs-extra');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'data.json');

beforeEach(async () => {
  await fs.outputFile(DATA_PATH, '[]');
});

afterAll(async () => {
  // clean up
  await fs.remove(DATA_PATH).catch(() => {});
});

test('POST /mood appends entry and returns last 10', async () => {
  const res = await request(app)
    .post('/mood')
    .send({ mood: 4, stress: 2 })
    .set('Accept', 'application/json');

  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveProperty('entries');
  expect(Array.isArray(res.body.entries)).toBe(true);
  expect(res.body.entries.length).toBeGreaterThanOrEqual(1);
});
