import crypto from "crypto";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { getSql } from "./db.js";

const { Pool } = pg;

function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set in production.");
    }
    console.warn("WARNING: ADMIN_USERNAME or ADMIN_PASSWORD not set. Admin login will be disabled.");
    return { username: "", password: "" };
  }

  return { username, password };
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable must be set in production.");
    }
    console.warn("WARNING: SESSION_SECRET not set. Using an insecure default for development only.");
    return "dev-only-insecure-secret-do-not-use-in-production";
  }
  return secret;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length === 0 && b.length === 0) return true;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
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

let _sessionPool: pg.Pool | null = null;

function getSessionPool(): pg.Pool {
  if (!_sessionPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    _sessionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 2,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });
  }
  return _sessionPool;
}

export async function setupSimpleAuth(app: Express) {
  app.set("trust proxy", 1);

  try {
    await getSql()`SELECT 1`;
    console.log("Database connection successful");

    await getSql()`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
      )
    `;

    await getSql()`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire")
    `;

    console.log("Session table ready");
  } catch (error) {
    console.error("Database setup error:", error);
    throw error;
  }

  const sessionStore = new PgSession({
    pool: getSessionPool(),
    tableName: "sessions",
    createTableIfMissing: false,
    pruneSessionInterval: 900,
    errorLog: (error) => {
      console.error("Session store error:", error);
    },
  });

  app.use(
    session({
      store: sessionStore,
      secret: getSessionSecret(),
      resave: false,
      saveUninitialized: false,
      name: "dhavi.sid",
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000,
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

      const credentials = getAdminCredentials();

      const usernameMatch = timingSafeEqual(username, credentials.username);
      const passwordMatch = timingSafeEqual(password, credentials.password);

      if (usernameMatch && passwordMatch) {
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
                resolve();
              }
            });
          });

          return res.json({
            success: true,
            user: { username },
          });
        } catch (sessionError) {
          console.error("Session error during login:", sessionError);
          return res.status(500).json({
            message: "Failed to create session. Please try again or contact support.",
          });
        }
      }

      console.warn(`Failed login attempt for username: "${username}" from IP: ${req.ip}`);
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
      res.clearCookie("dhavi.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
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
