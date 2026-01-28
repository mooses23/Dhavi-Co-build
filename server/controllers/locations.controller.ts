import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { insertLocationSchema } from "../../shared/schema.js";

export async function getPublicLocations(req: Request, res: Response) {
  try {
    const locations = await storage.getLocations();
    const activeLocations = locations.filter(l => l.isActive);
    res.json(activeLocations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
}

export async function getAllLocations(req: Request, res: Response) {
  try {
    const locations = await storage.getLocations();
    res.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
}

export async function createLocation(req: Request, res: Response) {
  try {
    const parseResult = insertLocationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid location data",
        errors: parseResult.error.errors 
      });
    }
    const location = await storage.createLocation(parseResult.data);
    res.json(location);
  } catch (error) {
    console.error("Error creating location:", error);
    res.status(500).json({ message: "Failed to create location" });
  }
}

export async function updateLocation(req: Request, res: Response) {
  try {
    const updateSchema = insertLocationSchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid location data",
        errors: parseResult.error.errors 
      });
    }
    const location = await storage.updateLocation(req.params.id as string, parseResult.data);
    res.json(location);
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ message: "Failed to update location" });
  }
}

export async function getLocationInventory(req: Request, res: Response) {
  try {
    const inventory = await storage.getLocationInventory(req.params.id as string);
    res.json(inventory);
  } catch (error) {
    console.error("Error fetching location inventory:", error);
    res.status(500).json({ message: "Failed to fetch location inventory" });
  }
}
