import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import OrderPage from "@/pages/order";
import CheckoutPage from "@/pages/checkout";
import OrderConfirmationPage from "@/pages/order-confirmation";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminOrders from "@/pages/admin/orders";
import AdminInvoices from "@/pages/admin/invoices";
import AdminProduction from "@/pages/admin/production";
import AdminProducts from "@/pages/admin/products";
import AdminIngredients from "@/pages/admin/ingredients";
import AdminLocations from "@/pages/admin/locations";
import AdminMarketing from "@/pages/admin/marketing";

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/order" component={OrderPage} />
      <Route path="/checkout/:orderId" component={CheckoutPage} />
      <Route path="/order/confirmation/:orderId" component={OrderConfirmationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-md gold-gradient animate-pulse" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/api/login";
    return null;
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/invoices" component={AdminInvoices} />
        <Route path="/admin/production" component={AdminProduction} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/ingredients" component={AdminIngredients} />
        <Route path="/admin/locations" component={AdminLocations} />
        <Route path="/admin/marketing" component={AdminMarketing} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Check if we're on an admin route
  if (location.startsWith("/admin")) {
    return <AdminRoutes />;
  }
  
  return <PublicRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="dhavi-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
