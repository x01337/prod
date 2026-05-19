// pages/api/health.js — used by Docker HEALTHCHECK and monitoring
export default async function handler(req, res) {
  try {
    // Quick DB connectivity check
    const getDb = (await import("../../lib/db")).default;
    const { dbGet } = await import("../../lib/db");
    const db = await getDb();
    await dbGet(db, "SELECT 1 AS ok");

    res.status(200).json({
      status:    "ok",
      timestamp: new Date().toISOString(),
      uptime:    process.uptime(),
      db:        process.env.DATABASE_URL ? "postgres" : "sqlite",
    });
  } catch (err) {
    console.error("[health]", err.message);
    res.status(503).json({ status: "error", message: err.message });
  }
}
