import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app, initializeRoutes } from "../server/app";
import { serveStatic } from "../server/static";

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  
  await initializeRoutes();
  serveStatic(app);
  
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInitialized();
  return app(req as any, res as any);
}
