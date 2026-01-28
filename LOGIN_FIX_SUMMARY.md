# Login Fix Summary

## Problem
Login failed with 500 error when deployed to Vercel with Supabase database.

## Root Causes

1. **Race Condition**: Session store was initialized before the PostgreSQL session table was created, causing the first login attempt to fail
2. **Database Pool Configuration**: Not optimized for Vercel's serverless environment
3. **Insufficient Error Logging**: No detailed logs to diagnose the actual failure
4. **Error Message Exposure**: Internal error details were exposed to clients
5. **Supabase Pooler Mode**: Transaction mode pooler (port 6543) causes issues with session stores; Session mode (port 5432) is required

## Solutions Implemented

### 1. Fixed Session Table Initialization Race Condition

**File: `server/simpleAuth.ts`**

Changed `setupSimpleAuth` from synchronous to async, ensuring:
- Database connection is tested first
- Session table is created before session store initialization
- Index created on `expire` column for better performance
- Fails fast if database setup fails
- All steps are logged for debugging

```typescript
export async function setupSimpleAuth(app: Express) {
  // Ensure database and session table are ready BEFORE creating session store
  await pool.query("SELECT 1");
  await pool.query(`CREATE TABLE IF NOT EXISTS "session" (...)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`);
  
  const sessionStore = new PgSession({ ... });
  // Session store only created after table exists
}
```

### 2. Optimized Database Connection for Serverless

**File: `server/db.ts`**

Configured PostgreSQL connection pool for Vercel serverless functions:
- Max 1 connection (serverless best practice)
- Connection timeout: 10 seconds
- **Idle timeout: 5 seconds** (reduced from 30s to prevent stale connections with PgBouncer)
- SSL configuration for Supabase production connections
- Error event handler for unexpected errors

### 3. Fixed Cookie Name Mismatch

**File: `server/simpleAuth.ts`**

Fixed logout to clear the correct cookie:
- Session uses cookie name `dhavi.sid`
- Logout was clearing `connect.sid` (wrong)
- Now properly clears `dhavi.sid` with matching options

### 4. Enhanced Error Logging & Security

**Files: `server/simpleAuth.ts`, `server/routes.ts`**

- Detailed console logs at each step (visible in Vercel function logs)
- Sanitized error messages returned to clients
- Environment-aware error handling (detailed in dev, generic in prod)
- No exposure of database connection details or system internals

### 5. Added Health Check Endpoint

**File: `server/routes.ts`**

New endpoint: `GET /api/health`
- Tests database connectivity
- Returns JSON status
- Useful for deployment verification

### 5. Created Deployment Documentation

**File: `DEPLOYMENT.md`**

Comprehensive guide covering:
- Required environment variables
- Vercel deployment steps
- Database setup instructions
- Troubleshooting common issues
- Security best practices

### 6. Added Database Testing Script

**File: `script/test-db-connection.js`**

Script to test database connection locally:
```bash
node script/test-db-connection.js
```

Tests:
- Database connectivity
- Session table existence
- Lists all tables

## How to Deploy

### 1. Set Environment Variables in Vercel

Required variables:
```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
SESSION_SECRET=your-random-secret-key-here
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

**CRITICAL**: For Supabase with this app, you MUST use:
- **Session Mode** pooler (port 5432), NOT Transaction Mode (port 6543)
- Transaction mode causes "prepared statement already exists" errors with `connect-pg-simple`
- URL format: `postgresql://postgres.[project-ref]:[password]@[region]-pooler.supabase.com:5432/postgres?sslmode=require`

### 2. Deploy to Vercel

Push your code to GitHub, and Vercel will automatically:
1. Run `npm install`
2. Run `npm run build`
3. Deploy the application

### 3. Verify Deployment

Test the health endpoint:
```bash
curl https://your-app.vercel.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-28T03:47:46.098Z"
}
```

### 4. Test Login

Navigate to: `https://your-app.vercel.app/bakers-login`

Current credentials (should be changed):
- Username: `Dhavi.co`
- Password: `SpeltBagels`

## Troubleshooting

### If Login Still Fails

1. **Check Vercel Function Logs**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on latest deployment → Functions tab
   - View `/api` function logs
   - Look for detailed error messages we added

2. **Test Database Connection**
   - Hit `/api/health` endpoint
   - Should show "database": "connected"
   - If not, verify DATABASE_URL in Vercel settings

3. **Verify Environment Variables**
   - Vercel Dashboard → Project Settings → Environment Variables
   - Ensure DATABASE_URL and SESSION_SECRET are set
   - Verify DATABASE_URL uses connection pooling URL from Supabase

4. **Check Session Table**
   - Connect to your Supabase database
   - Verify "session" table exists
   - Or run: `node script/test-db-connection.js` locally

### Common Issues

**Issue: "Failed to create session"**
- **Cause**: Database connection failed or session table doesn't exist
- **Fix**: Check DATABASE_URL, ensure it uses connection pooling

**Issue: 503 from /api/health**
- **Cause**: Cannot connect to database
- **Fix**: Verify DATABASE_URL is correct and database is accessible

**Issue: CORS errors**
- **Cause**: Cookie settings not working with your domain
- **Fix**: Verify `trust proxy` is enabled (already in code)

## Security Notes

1. **Change Default Credentials**: Update username/password in `server/simpleAuth.ts` or use environment variables
2. **SESSION_SECRET**: Use a strong, unique random string (at least 32 characters)
3. **Database**: Use Supabase's connection pooling URL with SSL enabled
4. **Stripe Keys**: Never commit keys to the repository

## What Changed

| File | Change |
|------|--------|
| server/simpleAuth.ts | Made async, fixed race condition, enhanced logging, sanitized errors |
| server/db.ts | Optimized pool for serverless, removed invalid config |
| server/routes.ts | Added health endpoint, await async setup |
| vercel.json | Removed outdated runtime version |
| DEPLOYMENT.md | Complete deployment guide (NEW) |
| script/test-db-connection.js | Database testing script (NEW) |

## Next Steps

1. Deploy to Vercel with proper environment variables
2. Test `/api/health` endpoint
3. Test login at `/bakers-login`
4. Check Vercel function logs if issues occur
5. Change default credentials for production use

## Support

If login still fails after following these steps:
1. Check Vercel function logs for detailed error messages
2. Test database connection using the test script
3. Verify all environment variables are set correctly
4. Ensure using Supabase connection pooling URL
