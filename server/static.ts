import express, { type Express } from "express";
import fs from "fs";
import path from "path";

const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;

export function serveStatic(app: Express) {
  // On Vercel, static files are served by CDN and SPA routing is handled by rewrites
  // The serverless function only handles /api/* routes
  if (isVercel) {
    console.log("Running on Vercel - static files served by CDN");
    return;
  }

  // For non-Vercel environments (Replit, local dev, traditional hosting)
  const possiblePaths = [
    path.resolve(__dirname, "public"),           // Built production (server running from dist/)
    path.resolve(process.cwd(), "dist/public"),  // Development build
    path.resolve(process.cwd(), "public"),       // Static output
  ];

  let distPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      distPath = p;
      break;
    }
  }

  if (!distPath) {
    console.warn("Static assets directory not found, skipping static file serving");
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
