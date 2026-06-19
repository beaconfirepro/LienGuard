import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs: number | undefined;

  try {
    const t0 = Date.now();
    await pool.query("SELECT 1");
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = "error";
  }

  const data = HealthCheckResponse.parse({ status: dbStatus === "ok" ? "ok" : "degraded" });
  const status = dbStatus === "ok" ? 200 : 503;

  res.status(status).json({
    ...data,
    db: dbStatus,
    dbLatencyMs,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
