const db = require('./config/db');

(async () => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    console.log('✅ DB connected! Test query result:', rows[0].result);

    const [weapons] = await db.query('SELECT COUNT(*) AS total FROM weapons');
    console.log('✅ Weapons table accessible. Total rows:', weapons[0].total);

    process.exit(0);
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }
})();