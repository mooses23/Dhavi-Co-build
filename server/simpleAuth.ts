import type { Express, RequestHandler } from "express";
import session from "express-session";
import MemoryStore from "memorystore";

const VALID_USERNAME = "Dhavi.co";
const VALID_PASSWORD = "SpeltBagels";

const SessionStore = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    user?: {
      username: string;
      loggedInAt: string;
    };
  }
}

export function setupSimpleAuth(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dhavi-bakehouse-secret-key-2024",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax",
      },
    })
  );
}

export function registerSimpleAuthRoutes(app: Express) {
  // Login route
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      req.session.user = {
        username,
        loggedInAt: new Date().toISOString(),
      };
      return res.json({ 
        success: true,
        user: { username }
      });
    }

    return res.status(401).json({ message: "Invalid username or password" });
  });

  // Get current user
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

  // Logout route
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

// Middleware to check if user is authenticated
export const isSimpleAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
