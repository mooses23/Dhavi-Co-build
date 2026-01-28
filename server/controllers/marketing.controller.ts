import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { insertMarketingAssetSchema } from "../../shared/schema.js";

export async function getAllMarketingAssets(req: Request, res: Response) {
  try {
    const assets = await storage.getMarketingAssets();
    res.json(assets);
  } catch (error) {
    console.error("Error fetching marketing assets:", error);
    res.status(500).json({ message: "Failed to fetch marketing assets" });
  }
}

export async function createMarketingAsset(req: Request, res: Response) {
  try {
    const parseResult = insertMarketingAssetSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid marketing asset data",
        errors: parseResult.error.errors 
      });
    }
    const asset = await storage.createMarketingAsset(parseResult.data);
    res.json(asset);
  } catch (error) {
    console.error("Error creating marketing asset:", error);
    res.status(500).json({ message: "Failed to create marketing asset" });
  }
}
