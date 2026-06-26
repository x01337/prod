export default async function handler(req, res) {
  try {
    const getDb = (await import("../../lib/db.js")).default;
    const { dbGet } = await import("../../lib/db.js");
    const db = await getDb();
    await dbGet(db, "SELECT 1 AS ok");
    res.status(200).json({ status:"ok", uptime:process.uptime(), db:process.env.DATABASE_URL?"postgres":"sqlite", ts:new Date().toISOString() });
  } catch(err) {
    res.status(503).json({ status:"error", message:err.message });
  }
}
