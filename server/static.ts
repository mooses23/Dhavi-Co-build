import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Try multiple paths for different environments
  const possiblePaths = [
    path.resolve(__dirname, "public"),           // Built production (server running from dist/)
    path.resolve(process.cwd(), "dist/public"),  // Vercel serverless function
    path.resolve(process.cwd(), "public"),       // Vercel static output
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
    // For Vercel, static files are served by the CDN, so the API doesn't need to serve them
    // Just handle the SPA fallback for client-side routing
    app.get("*", (_req, res) => {
      const possibleIndexPaths = [
        path.resolve(process.cwd(), "dist/public/index.html"),
        path.resolve(process.cwd(), "public/index.html"),
      ];
      for (const indexPath of possibleIndexPaths) {
        if (fs.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        }
      }
      res.status(404).send("Not found");
    });
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
