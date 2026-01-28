import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingCart, 
  Package, 
  Wheat, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  ChefHat,
  Calendar,
  ArrowRight
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order, Ingredient, Batch, Product } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const { data: ingredients, isLoading: ingredientsLoading } = useQuery<Ingredient[]>({
    queryKey: ["/api/admin/ingredients"],
  });

  const { data: batches, isLoading: batchesLoading } = useQuery<(Batch & { items: any[] })[]>({
    queryKey: ["/api/admin/batches"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: stats } = useQuery<{
    todayOrders: number;
    pendingOrders: number;
    todayRevenue: number;
    lowStockCount: number;
  }>({
    queryKey: ["/api/admin/stats/dashboard"],
  });

  const approveOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("PATCH", `/api/admin/orders/${orderId}/status`, { status: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order Approved", description: "Payment has been captured" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve order", variant: "destructive" });
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ batchId, status }: { batchId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/batches/${batchId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batches"] });
      toast({ title: "Batch Updated", description: "Batch status has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update batch", variant: "destructive" });
    },
  });

  const pendingOrders = orders?.filter((o) => o.status === "new") || [];
  const lowStockIngredients = ingredients?.filter(
    (i) => parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
  ) || [];

  // Get today's and upcoming batches
  const todayBatches = batches?.filter((b) => {
    const batchDate = new Date(b.batchDate);
    return isToday(batchDate) && b.status !== "cancelled";
  }) || [];

  const upcomingBatches = batches?.filter((b) => {
    const batchDate = new Date(b.batchDate);
    return isTomorrow(batchDate) && b.status !== "cancelled";
  }) || [];

  const getProductName = (productId: string) => {
    return products?.find(p => p.id === productId)?.name || "Unknown";
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case "planned": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "in_progress": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "completed": return "bg-green-500/10 text-green-600 border-green-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here's what's happening today.
        </p>
      </div>

      {/* Quick Actions */}
      {(pendingOrders.length > 0 || todayBatches.some(b => b.status === "planned")) && (
        <Card className="border-gold/20 bg-gold/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-gold" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {pendingOrders.length > 0 && (
              <Button 
                onClick={() => {
                  if (pendingOrders[0]) {
                    approveOrderMutation.mutate(pendingOrders[0].id);
                  }
                }}
                disabled={approveOrderMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-approve-next"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Next Order ({pendingOrders.length} pending)
              </Button>
            )}
            {todayBatches.filter(b => b.status === "planned").map((batch) => (
              <Button
                key={batch.id}
                variant="outline"
                onClick={() => updateBatchMutation.mutate({ batchId: batch.id, status: "in_progress" })}
                disabled={updateBatchMutation.isPending}
                data-testid={`button-start-batch-${batch.id}`}
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Start {batch.shift} Batch
              </Button>
            ))}
            {todayBatches.filter(b => b.status === "in_progress").map((batch) => (
              <Button
                key={batch.id}
                variant="default"
                onClick={() => updateBatchMutation.mutate({ batchId: batch.id, status: "completed" })}
                disabled={updateBatchMutation.isPending}
                className="bg-gold hover:bg-gold/90 text-black"
                data-testid={`button-complete-batch-${batch.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete {batch.shift} Batch
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-products">
              {products?.filter(p => p.isActive).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
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

      {/* Today's Bake Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Bake Schedule
          </CardTitle>
          <Link href="/bakehouse/production">
            <Badge variant="outline" className="hover-elevate cursor-pointer">
              View Production
              <ArrowRight className="h-3 w-3 ml-1" />
            </Badge>
          </Link>
        </CardHeader>
        <CardContent>
          {batchesLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : todayBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No batches scheduled for today</p>
              <Link href="/bakehouse/production">
                <Button variant="outline" size="sm" className="mt-4" data-testid="button-schedule-batch">
                  Schedule a Batch
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {todayBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-4 rounded-lg border bg-card"
                  data-testid={`batch-card-${batch.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getBatchStatusColor(batch.status)}>
                        {batch.status.replace("_", " ")}
                      </Badge>
                      <span className="font-medium capitalize">{batch.shift} Shift</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(batch.batchDate), "h:mm a")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {batch.items?.map((item: any) => (
                      <Badge key={item.id} variant="secondary" className="text-xs">
                        {item.quantity}x {getProductName(item.productId)}
                      </Badge>
                    ))}
                  </div>
                  {batch.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">{batch.notes}</p>
                  )}
                </div>
              ))}
              {upcomingBatches.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Tomorrow's Schedule:</p>
                  {upcomingBatches.map((batch) => (
                    <div key={batch.id} className="text-sm">
                      <span className="capitalize">{batch.shift}</span> - {batch.items?.length || 0} products
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif">Pending Orders</CardTitle>
            <Link href="/bakehouse/orders">
              <Badge variant="outline" className="hover-elevate cursor-pointer">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
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
              <div className="space-y-3">
                {pendingOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`order-row-${order.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.fulfillmentDate), "MMM d")} - {order.fulfillmentWindow}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-gold">${parseFloat(order.total).toFixed(2)}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => approveOrderMutation.mutate(order.id)}
                        disabled={approveOrderMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`button-approve-${order.id}`}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif">Low Stock Alerts</CardTitle>
            <Link href="/bakehouse/ingredients">
              <Badge variant="outline" className="hover-elevate cursor-pointer">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
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
