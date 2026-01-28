# D'havi.co - Premium Spelt Bagel Bakery Operating System

## Overview
D'havi.co is a production-ready web application for a premium small-batch spelt bagel brand. This system models physical reality, not just online commerce - bagels come from ingredients, ingredients become batches, batches become finished goods, and orders reserve reality first, money second.

## Project Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Simple username/password (Baker's Login)
- **Payments**: Stripe (PaymentIntents with manual capture)

### Portability Notes (Vercel/Supabase)
The code is structured to be portable:
- Drizzle ORM works with any PostgreSQL (including Supabase)
- Environment variables: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `SESSION_SECRET`

**Vercel Deployment:**
The project includes full Vercel configuration:
- `vercel.json` - Routes API requests to serverless function, static assets to CDN
- `api/index.ts` - Serverless function entry point that wraps the Express app
- Build outputs static files to `public/` for Vercel CDN serving

To deploy to Vercel:
1. Connect your GitHub repo to Vercel
2. Configure environment variables in Vercel dashboard:
   - `DATABASE_URL` - Supabase PostgreSQL connection string
   - `STRIPE_SECRET_KEY` - Your Stripe secret key
   - `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
   - `SESSION_SECRET` - Random string for session encryption
3. Deploy - Vercel will automatically run `npm run build`

## Key Features

### 1. Public Order Flow
- Customers can browse products and place orders without logging in
- Select pickup location and date/time window
- Stripe authorization (manual capture) - card is authorized but not charged until admin approves

### 2. Bakehouse Dashboard (Protected via Baker's Login)
- Access via `/bakers-login` with credentials: Username "Dhavi.co", Password "SpeltBagels"
- **Orders Queue**: View, approve, reject orders. Approving captures payment.
- **Production Planner**: Schedule batches, track production runs
- **Inventory Management**: Track ingredients with reorder alerts
- **Products**: Manage bagel SKUs with Bill of Materials
- **Locations**: Manage pickup spots, pop-ups, wholesale accounts

### 3. Physical Reality Constraints
- Bill of Materials: Each product has defined ingredient requirements
- Batch completion deducts ingredients from inventory
- Low stock alerts when ingredients fall below reorder threshold

## Recent Changes (January 2026)
- **Backend Modularization**: Refactored routes.ts from 841 lines to ~200 lines by extracting feature-based controllers
- **Freezer Stock Management**: Added freezer_stock table and API endpoints for tracking finished goods inventory
- **Activity Logging**: Added activity_logs table for audit trail (order.approved, batch.completed, etc.)
- **Batch Completion Flow**: Enhanced to automatically add products to freezer stock and log activities
- **Zustand Store**: Added client-side admin state management to reduce prop drilling

## File Structure

```
client/
  src/
    pages/
      landing.tsx          - Public landing page
      order.tsx            - Public order form
      checkout.tsx         - Stripe payment page
      order-confirmation.tsx - Order confirmation
      bakers-login.tsx     - Baker's Login page
      admin/
        dashboard.tsx      - Bakehouse dashboard (route: /bakehouse)
        orders.tsx         - Order management (route: /bakehouse/orders)
        production.tsx     - Batch production (route: /bakehouse/production)
        products.tsx       - Product catalog (route: /bakehouse/products)
        ingredients.tsx    - Ingredient inventory (route: /bakehouse/ingredients)
        locations.tsx      - Location management (route: /bakehouse/locations)
        marketing.tsx      - Brand assets (route: /bakehouse/marketing)
    stores/
      adminStore.ts        - Zustand store for admin state management
    components/
      app-sidebar.tsx      - Bakehouse navigation
      theme-toggle.tsx     - Dark/light mode toggle

server/
  routes.ts               - API route registration
  storage.ts              - Database operations
  db.ts                   - Database connection
  simpleAuth.ts           - Simple session-based authentication
  controllers/
    index.ts              - Controller exports
    health.controller.ts  - Health check
    products.controller.ts - Product management
    ingredients.controller.ts - Ingredient management
    orders.controller.ts  - Order management
    batches.controller.ts - Batch production
    freezer.controller.ts - Freezer stock management
    activity.controller.ts - Activity logging
    invoices.controller.ts - Invoice management
    locations.controller.ts - Location management
    marketing.controller.ts - Marketing assets
    stats.controller.ts   - Dashboard statistics

shared/
  schema.ts               - Drizzle database schema
  models/
    auth.ts               - Auth-related schemas
```

## API Endpoints

### Public
- `GET /api/products` - List active products
- `GET /api/locations` - List active locations
- `POST /api/orders` - Create order (returns Stripe client secret)
- `GET /api/orders/:id` - Get order details

### Protected (Admin)
- `GET /api/admin/orders` - List all orders
- `PATCH /api/admin/orders/:id/status` - Update order status (triggers payment capture/cancel)
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/:id` - Update product
- `GET /api/admin/products/:id/bom` - Get product bill of materials
- `PUT /api/admin/products/:id/bom` - Update product bill of materials
- `GET /api/admin/ingredients` - List all ingredients
- `POST /api/admin/ingredients` - Create ingredient
- `PATCH /api/admin/ingredients/:id` - Update ingredient
- `POST /api/admin/ingredients/:id/adjust` - Adjust ingredient inventory
- `GET /api/admin/locations` - List all locations
- `POST /api/admin/locations` - Create location
- `PATCH /api/admin/locations/:id` - Update location
- `GET /api/admin/locations/:id/inventory` - Get location inventory
- `GET /api/admin/batches` - List batches
- `POST /api/admin/batches` - Create batch
- `PATCH /api/admin/batches/:id/status` - Update batch status (deducts ingredients, adds to freezer)
- `GET /api/admin/freezer` - Get freezer stock
- `GET /api/admin/freezer/product/:productId` - Get freezer stock by product
- `POST /api/admin/freezer` - Add to freezer stock
- `PATCH /api/admin/freezer/:id` - Update freezer stock quantity
- `GET /api/admin/activity` - Get activity logs
- `GET /api/admin/activity/recent` - Get recent activity
- `GET /api/admin/stats/dashboard` - Dashboard statistics
- `GET /api/admin/stats/orders` - Order statistics
- `GET /api/admin/stats/inventory` - Inventory statistics
- `GET /api/admin/stats/freezer` - Freezer statistics

## Order Lifecycle
1. **New**: Customer placed order, payment authorized
2. **Approved**: Admin approved, payment captured
3. **Baking**: Order in production
4. **Ready**: Ready for pickup
5. **Completed**: Customer picked up
6. **Cancelled**: Order cancelled, authorization voided

## Design System
- **Colors**: Matte black with gold accents (#d4a017)
- **Typography**: Playfair Display (headings), Inter (body)
- **Theme**: Dark mode by default, light mode available

## Development Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push schema changes to database
- `npm run build` - Build for production

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe key for frontend
