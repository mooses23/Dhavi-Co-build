import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingCart, 
  Package, 
  Wheat, 
  AlertTriangle,
  TrendingUp,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import type { Order, Ingredient } from "@shared/schema";

export default function AdminDashboard() {
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const { data: ingredients, isLoading: ingredientsLoading } = useQuery<Ingredient[]>({
    queryKey: ["/api/admin/ingredients"],
  });

  const { data: stats } = useQuery<{
    todayOrders: number;
    pendingOrders: number;
    todayRevenue: number;
    lowStockCount: number;
  }>({
    queryKey: ["/api/admin/stats/dashboard"],
  });

  const pendingOrders = orders?.filter((o) => o.status === "new") || [];
  const lowStockIngredients = ingredients?.filter(
    (i) => parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
  ) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here's what's happening today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-pending-orders">
                  {pendingOrders.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold" data-testid="text-revenue">
              ${stats?.todayRevenue?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              From approved orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-products">
              {stats?.todayOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {ingredientsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-destructive" data-testid="text-low-stock">
                  {lowStockIngredients.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingredients need reorder
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif">Recent Orders</CardTitle>
            <Link href="/admin/orders">
              <Badge variant="outline" className="hover-elevate cursor-pointer">
                View All
              </Badge>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`order-row-${order.id}`}
                  >
                    <div>
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.fulfillmentDate), "MMM d, yyyy")} - {order.fulfillmentWindow}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gold">${parseFloat(order.total).toFixed(2)}</p>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        New
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif">Low Stock Ingredients</CardTitle>
            <Link href="/admin/ingredients">
              <Badge variant="outline" className="hover-elevate cursor-pointer">
                View All
              </Badge>
            </Link>
          </CardHeader>
          <CardContent>
            {ingredientsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lowStockIngredients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wheat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All ingredients well stocked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockIngredients.slice(0, 5).map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                    data-testid={`ingredient-alert-${ingredient.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium">{ingredient.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {parseFloat(ingredient.onHand).toFixed(1)} {ingredient.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reorder at {parseFloat(ingredient.reorderThreshold).toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
