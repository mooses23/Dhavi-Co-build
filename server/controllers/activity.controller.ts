import type { Request, Response } from "express";
import { storage } from "../storage.js";

export async function getActivityLogs(req: Request, res: Response) {
  try {
    const { entityType, entityId, limit } = req.query;
    
    const logs = await storage.getActivityLogs({
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
}

export async function getRecentActivity(req: Request, res: Response) {
  try {
    const logs = await storage.getActivityLogs({ limit: 20 });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ message: "Failed to fetch recent activity" });
  }
}
