import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

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

export function setupSimpleAuth(app: Express) {
  app.set("trust proxy", 1);
  
  const sessionStore = new PgSession({
    pool: pool,
    tableName: "session",
    createTableIfMissing: true,
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

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        req.session.user = {
          username,
          loggedInAt: new Date().toISOString(),
        };
        
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        return res.json({ 
          success: true,
          user: { username }
        });
      }

      return res.status(401).json({ message: "Invalid username or password" });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed. Please try again." });
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
      res.clearCookie("connect.sid");
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
