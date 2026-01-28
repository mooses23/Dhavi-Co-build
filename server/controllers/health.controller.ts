import type { Request, Response } from "express";
import { getPool } from "../db.js";

export async function healthCheck(req: Request, res: Response) {
  try {
    await getPool().query("SELECT 1");
    
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    const errorMessage = process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "Service unavailable";
    
    res.status(503).json({
      status: "error",
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
