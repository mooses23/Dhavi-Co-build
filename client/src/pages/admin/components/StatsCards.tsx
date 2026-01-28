import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, TrendingUp, Package, AlertTriangle } from "lucide-react";

interface StatsCardsProps {
  pendingOrdersCount: number;
  todayRevenue: number;
  activeProductsCount: number;
  lowStockCount: number;
  isLoading: {
    orders: boolean;
    ingredients: boolean;
    products: boolean;
  };
}

export function StatsCards({
  pendingOrdersCount,
  todayRevenue,
  activeProductsCount,
  lowStockCount,
  isLoading,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading.orders ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <div className="text-2xl font-bold" data-testid="text-pending-orders">
                {pendingOrdersCount}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gold" data-testid="text-revenue">
            ${todayRevenue?.toFixed(2) || "0.00"}
          </div>
          <p className="text-xs text-muted-foreground">From approved orders</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-products">
            {activeProductsCount}
          </div>
          <p className="text-xs text-muted-foreground">Available for order</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          {isLoading.ingredients ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <div className="text-2xl font-bold text-destructive" data-testid="text-low-stock">
                {lowStockCount}
              </div>
              <p className="text-xs text-muted-foreground">Ingredients need reorder</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
