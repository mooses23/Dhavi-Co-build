# Deployment Guide

## Vercel + Supabase Deployment

This application is configured to deploy on Vercel with a Supabase PostgreSQL database.

### Prerequisites

1. A Vercel account
2. A Supabase project with PostgreSQL database
3. Stripe account for payment processing

### Required Environment Variables

Set the following environment variables in your Vercel project settings:

#### Database Configuration
```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```
Get this from your Supabase project settings under "Database" → "Connection String" → "URI" (make sure to select "Use connection pooling" for better serverless performance).

#### Session Security
```
SESSION_SECRET=your-random-secret-key-here
```
Generate a secure random string (at least 32 characters). You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Stripe Configuration
```
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (optional, for webhook verification)
```
Get these from your Stripe dashboard.

For the frontend (Vite):
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
```

### Deployment Steps

1. **Connect Repository to Vercel**
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add all the required variables listed above
   - Make sure they're set for "Production", "Preview", and "Development" environments

3. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - The build command (`npm run build`) will be executed
   - Static files will be served from the `/public` directory
   - API routes will be handled by the serverless function at `/api/index.ts`

### Database Setup

The application will automatically create the session table when it first starts. However, you may need to run the database migrations for other tables:

```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push
```

### Troubleshooting

#### Login Returns 500 Error

Check the following:

1. **Database Connection**: Verify `DATABASE_URL` is correct
   - Test connection using `/api/health` endpoint
   - Ensure you're using the connection pooling URL from Supabase
   - Verify SSL mode is enabled if required

2. **Session Table**: The session table should be created automatically, but you can create it manually if needed:
   ```sql
   CREATE TABLE IF NOT EXISTS "session" (
     "sid" varchar NOT NULL COLLATE "default",
     "sess" json NOT NULL,
     "expire" timestamp(6) NOT NULL,
     CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
   );
   ```

3. **Check Logs**: View Vercel function logs to see detailed error messages
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the deployment → Functions tab
   - View the `/api` function logs

4. **Environment Variables**: Ensure all required variables are set in Vercel
   - Go to Project Settings → Environment Variables
   - Verify `DATABASE_URL` and `SESSION_SECRET` are present

#### CORS Issues

If you encounter CORS errors, ensure:
- `trust proxy` is enabled (already configured in `simpleAuth.ts`)
- Cookies are configured correctly for your domain

### Test Endpoints

After deployment, test these endpoints:

1. **Health Check**:
   ```
   GET https://your-app.vercel.app/api/health
   ```
   Should return database connection status

2. **Products** (public):
   ```
   GET https://your-app.vercel.app/api/products
   ```
   Should return list of products

3. **Login** (test with credentials):
   - Username: `Dhavi.co`
   - Password: `SpeltBagels`
   ```
   POST https://your-app.vercel.app/api/auth/login
   Content-Type: application/json
   
   {
     "username": "Dhavi.co",
     "password": "SpeltBagels"
   }
   ```

### Security Notes

- Change the default username/password in production
- Use strong, unique values for `SESSION_SECRET`
- Keep your Stripe keys secure and never commit them to the repository
- Use Stripe webhook secret in production for payment verification
- Ensure your Supabase database has appropriate security rules and firewall settings
