const request = require('supertest');

// Mock the pg module so tests never touch a real database
// Jest intercepts any require('pg') call and returns our fake implementation instead
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
    })),
    mockQuery, // expose so individual tests can control what the DB returns
  };
});

// Import app AFTER mocking pg so the mock is in place when app.js sets up the pool
const { app } = require('../app');
const { mockQuery } = require('pg');

// Reset mock between tests so one test's setup does not bleed into another
beforeEach(() => {
  mockQuery.mockReset();
});

// ── HEALTH CHECK ─────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns status ok and db_time when DB is reachable', async () => {
    // Simulate DB returning a timestamp
    mockQuery.mockResolvedValueOnce({ rows: [{ time: '2024-01-01T00:00:00.000Z' }] });

    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db_time).toBeDefined();
  });

  it('returns status error when DB is unreachable', async () => {
    // Simulate DB throwing an error
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
  });
});

// ── GET ALL NOTES ─────────────────────────────────────────────
describe('GET /api/notes', () => {
  it('returns an array of notes', async () => {
    // Simulate DB returning two notes
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, content: 'First note', created_at: '2024-01-01T00:00:00.000Z' },
        { id: 2, content: 'Second note', created_at: '2024-01-02T00:00:00.000Z' },
      ],
    });

    const res = await request(app).get('/api/notes');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].content).toBe('First note');
  });

  it('returns an empty array when there are no notes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/notes');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── CREATE A NOTE ─────────────────────────────────────────────
describe('POST /api/notes', () => {
  it('creates a note and returns it', async () => {
    // Simulate DB returning the newly created note
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, content: 'Test note', created_at: '2024-01-01T00:00:00.000Z' }],
    });

    const res = await request(app)
      .post('/api/notes')
      .send({ content: 'Test note' });

    expect(res.statusCode).toBe(201);
    expect(res.body.content).toBe('Test note');
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when content is missing', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Content is required');
  });
});

// ── DELETE A NOTE ─────────────────────────────────────────────
describe('DELETE /api/notes/:id', () => {
  it('deletes a note and returns a success message', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/notes/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Note deleted');
  });

  it('returns 500 when DB throws an error on delete', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).delete('/api/notes/1');

    expect(res.statusCode).toBe(500);
  });
});