import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";

const VALID_USERNAME = "Dhavi.co";
const VALID_PASSWORD = "SpeltBagels";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET not set in production. Using fallback secret.");
}

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    user?: {
      username: string;
      loggedInAt: string;
    };
  }
}

export async function setupSimpleAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Test database connection and ensure session table exists before setting up session store
  try {
    await pool.query("SELECT 1");
    console.log("Database connection successful");
    
    // Ensure session table exists with proper structure
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);
    
    // Create index on expire column for faster session pruning
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);
    
    console.log("Session table ready");
  } catch (error) {
    console.error("Database setup error:", error);
    throw error; // Fail fast if database setup fails
  }
  
  const sessionStore = new PgSession({
    pool: pool,
    tableName: "session",
    // Disable auto table creation since we create it manually above
    createTableIfMissing: false,
    // Enable session pruning to clean up expired sessions (every 15 minutes)
    pruneSessionInterval: 900,
    errorLog: (error) => {
      console.error("Session store error:", error);
    },
  });
  
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "dhavi-bakehouse-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      name: "dhavi.sid",
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

export function registerSimpleAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    
    try {
      const { username, password } = req.body;
      
      console.log("Login attempt for username:", username ? "(provided)" : "(missing)");

      if (!username || !password) {
        console.log("Login failed: Missing credentials");
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        console.log("Credentials valid, attempting to create session...");
        
        try {
          req.session.user = {
            username,
            loggedInAt: new Date().toISOString(),
          };
          
          await new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
              if (err) {
                console.error("Session save error:", err);
                reject(err);
              } else {
                console.log("Session saved successfully");
                resolve();
              }
            });
          });
          
          console.log("Login successful");
          return res.json({ 
            success: true,
            user: { username }
          });
        } catch (sessionError) {
          console.error("Session error during login:", sessionError);
          // Return generic error message without exposing internal details
          return res.status(500).json({ 
            message: "Failed to create session. Please try again or contact support."
          });
        }
      }

      console.log("Login failed: Invalid credentials");
      return res.status(401).json({ message: "Invalid username or password" });
    } catch (error) {
      console.error("Login error (caught at top level):", error);
      // Return generic error message in production, detailed in development
      const message = process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Login failed. Please try again.";
      return res.status(500).json({ message });
    }
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.session.user) {
      return res.json({
        username: req.session.user.username,
        firstName: "Baker",
        lastName: "",
        email: "",
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      // Clear the correct cookie name that matches the session config
      res.clearCookie("dhavi.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
      return res.json({ success: true });
    });
  });
}

export const isSimpleAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
