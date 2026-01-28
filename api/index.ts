import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app, initializeRoutes } from "../server/app.js";

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  
  await initializeRoutes();
  // Don't call serveStatic on Vercel - static files are served by CDN
  
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInitialized();
  return app(req as any, res as any);
}
