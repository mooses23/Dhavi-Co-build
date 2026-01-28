import type { VercelRequest, VercelResponse } from "@vercel/node";

let appModule: any = null;
let initialized = false;
let initError: Error | null = null;

async function ensureInitialized() {
  if (initError) {
    throw initError;
  }
  if (initialized) return;
  
  try {
    // Check required environment variables upfront
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set. Please add it in Vercel Project Settings → Environment Variables.");
    }
    
    // Dynamic import to ensure env vars are checked first
    appModule = await import("../server/app.js");
    await appModule.initializeRoutes();
    
    initialized = true;
    console.log("API initialized successfully");
  } catch (error) {
    initError = error as Error;
    console.error("Initialization error:", error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInitialized();
    return appModule.app(req as any, res as any);
  } catch (error: any) {
    console.error("Handler error:", error);
    
    // Return helpful error message
    res.status(500).json({
      error: "Server initialization failed",
      message: error.message || "Unknown error",
      hint: "Check that all environment variables (DATABASE_URL, STRIPE_SECRET_KEY, SESSION_SECRET) are set in Vercel Project Settings."
    });
  }
}
