const { app, pool } = require('./app');

const PORT = process.env.PORT || 5000;

// Wait for DB to be ready (important for Podman where depends_on ordering is softer)
const connectWithRetry = async (retries = 10, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected successfully');
      return;
    } catch (err) {
      console.log(`DB not ready, retrying in ${delay / 1000}s... (${i + 1}/${retries})`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error('Could not connect to the database. Exiting.');
  process.exit(1);
};

// Initialize DB: create a simple notes table
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Notes table ready');
};

// Boot sequence
(async () => {
  await connectWithRetry();
  await initDB();
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
})();