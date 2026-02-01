import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { Order, Ingredient, Batch, Product, FreezerStock } from "@shared/schema";
import { isToday } from "date-fns";
import { format } from "date-fns";
import {
  ShoppingCart,
  Snowflake,
  ChefHat,
  Warehouse,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Play,
  Package,
} from "lucide-react";

type FreezerStockWithProduct = FreezerStock & { product?: Product };

function WorkflowCard({
  title,
  icon: Icon,
  count,
  subtitle,
  href,
  status,
  isLoading,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  subtitle: string;
  href: string;
  status: "good" | "warning" | "action" | "neutral";
  isLoading: boolean;
  children?: React.ReactNode;
}) {
  const statusColors = {
    good: "border-green-500/30 bg-green-500/5",
    warning: "border-orange-500/30 bg-orange-500/5",
    action: "border-blue-500/30 bg-blue-500/5",
    neutral: "border-border",
  };

  const iconColors = {
    good: "text-green-600",
    warning: "text-orange-600",
    action: "text-blue-600",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className={`${statusColors[status]} transition-all`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${iconColors[status]}`} />
            <span className="text-base font-medium">{title}</span>
          </div>
          <Link href={href}>
            <Button variant="ghost" size="sm" data-testid={`link-${title.toLowerCase()}`}>
              View
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" data-testid={`count-${title.toLowerCase()}`}>
                {count}
              </span>
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            </div>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FlowArrow() {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <ArrowRight className="h-6 w-6 text-muted-foreground/40" />
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery<{ orders: Order[]; pagination: any } | Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const orders = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.orders || []);

  const { data: ingredients, isLoading: ingredientsLoading } = useQuery<Ingredient[]>({
    queryKey: ["/api/admin/ingredients"],
  });

  const { data: batchesResponse, isLoading: batchesLoading } = useQuery<{ batches: (Batch & { items: any[] })[]; pagination: any } | (Batch & { items: any[] })[]>({
    queryKey: ["/api/admin/batches"],
  });

  const batches = Array.isArray(batchesResponse) ? batchesResponse : (batchesResponse?.batches || []);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: freezerStock, isLoading: freezerLoading } = useQuery<FreezerStockWithProduct[]>({
    queryKey: ["/api/admin/freezer"],
  });

  const approveOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("PATCH", `/api/admin/orders/${orderId}/status`, { status: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats/dashboard"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freezer"] });
      toast({ title: "Batch Updated", description: "Batch status has been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update batch", variant: "destructive" });
    },
  });

  // Calculate metrics
  const pendingOrders = orders?.filter((o) => o.status === "new") || [];
  const approvedOrders = orders?.filter((o) => o.status === "approved") || [];
  const totalFreezerItems = freezerStock?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const lowStockIngredients = ingredients?.filter(
    (i) => parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
  ) || [];

  const todayBatches = batches?.filter((b) => {
    const batchDate = new Date(b.batchDate);
    return isToday(batchDate) && b.status !== "cancelled";
  }) || [];

  const inProgressBatches = todayBatches.filter(b => b.status === "in_progress");
  const plannedBatches = todayBatches.filter(b => b.status === "planned");

  // Determine statuses for workflow cards
  const ordersStatus = pendingOrders.length > 0 ? "action" : approvedOrders.length > 0 ? "warning" : "good";
  const freezerStatus = totalFreezerItems < 10 ? "warning" : "good";
  const bakeStatus = inProgressBatches.length > 0 ? "action" : plannedBatches.length > 0 ? "warning" : "neutral";
  const pantryStatus = lowStockIngredients.length > 0 ? "warning" : "good";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your bakehouse workflow at a glance
        </p>
      </div>

      {/* Workflow Pipeline */}
      <div className="grid gap-4 lg:grid-cols-[1fr,auto,1fr,auto,1fr,auto,1fr]">
        <WorkflowCard
          title="Orders"
          icon={ShoppingCart}
          count={pendingOrders.length}
          subtitle="pending"
          href="/bakehouse/orders"
          status={ordersStatus}
          isLoading={ordersLoading}
        >
          {pendingOrders.length > 0 && (
            <Button
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => approveOrderMutation.mutate(pendingOrders[0].id)}
              disabled={approveOrderMutation.isPending}
              data-testid="button-approve-next-order"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve Next
            </Button>
          )}
          {approvedOrders.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {approvedOrders.length} approved, awaiting fulfillment
            </div>
          )}
        </WorkflowCard>

        <FlowArrow />

        <WorkflowCard
          title="Freezer"
          icon={Snowflake}
          count={totalFreezerItems}
          subtitle="bags in stock"
          href="/bakehouse/freezer"
          status={freezerStatus}
          isLoading={freezerLoading}
        >
          {freezerStock && freezerStock.length > 0 && (
            <div className="space-y-1">
              {freezerStock.slice(0, 3).map((stock) => (
                <div key={stock.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{stock.product?.name ?? "Unknown"}</span>
                  <Badge variant="secondary" className="ml-2">
                    {stock.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {totalFreezerItems < 10 && totalFreezerItems > 0 && (
            <div className="flex items-center gap-1 text-sm text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              Low stock
            </div>
          )}
        </WorkflowCard>

        <FlowArrow />

        <WorkflowCard
          title="Bake"
          icon={ChefHat}
          count={inProgressBatches.length}
          subtitle="active bakes"
          href="/bakehouse/bake"
          status={bakeStatus}
          isLoading={batchesLoading}
        >
          {inProgressBatches.length > 0 && (
            <div className="space-y-2">
              {inProgressBatches.slice(0, 2).map((batch) => (
                <div key={batch.id} className="flex items-center justify-between">
                  <Badge variant="outline" className="text-orange-600 border-orange-500/30">
                    <Play className="h-3 w-3 mr-1" />
                    {batch.shift}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateBatchMutation.mutate({ batchId: batch.id, status: "completed" })}
                    disabled={updateBatchMutation.isPending}
                    data-testid={`button-complete-batch-${batch.id}`}
                  >
                    Complete
                  </Button>
                </div>
              ))}
            </div>
          )}
          {plannedBatches.length > 0 && inProgressBatches.length === 0 && (
            <div className="text-sm text-muted-foreground">
              {plannedBatches.length} batch{plannedBatches.length > 1 ? "es" : ""} scheduled
            </div>
          )}
        </WorkflowCard>

        <FlowArrow />

        <WorkflowCard
          title="Pantry"
          icon={Warehouse}
          count={ingredients?.length ?? 0}
          subtitle="ingredients"
          href="/bakehouse/pantry"
          status={pantryStatus}
          isLoading={ingredientsLoading}
        >
          {lowStockIngredients.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-orange-600 mb-2">
                <AlertTriangle className="h-3 w-3" />
                {lowStockIngredients.length} low stock
              </div>
              {lowStockIngredients.slice(0, 2).map((ing) => (
                <div key={ing.id} className="text-sm text-muted-foreground truncate">
                  {ing.name}
                </div>
              ))}
            </div>
          )}
        </WorkflowCard>
      </div>

      {/* Quick Actions Panel */}
      {(pendingOrders.length > 0 || inProgressBatches.length > 0 || plannedBatches.length > 0) && (
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
                onClick={() => approveOrderMutation.mutate(pendingOrders[0].id)}
                disabled={approveOrderMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-quick-approve"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Next Order ({pendingOrders.length} pending)
              </Button>
            )}
            {plannedBatches.map((batch) => (
              <Link key={batch.id} href="/bakehouse/bake">
                <Button variant="outline" data-testid={`button-start-batch-${batch.id}`}>
                  <ChefHat className="h-4 w-4 mr-2" />
                  Start {batch.shift} Batch
                </Button>
              </Link>
            ))}
            {inProgressBatches.map((batch) => (
              <Button
                key={batch.id}
                variant="default"
                onClick={() => updateBatchMutation.mutate({ batchId: batch.id, status: "completed" })}
                disabled={updateBatchMutation.isPending}
                className="bg-gold hover:bg-gold/90 text-black"
                data-testid={`button-quick-complete-batch-${batch.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete {batch.shift} Batch
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Products Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products
            {products && (
              <Badge variant="secondary" className="ml-2">
                {products.filter(p => p.isActive).length} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!products || products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No products configured yet</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.filter(p => p.isActive).map((product) => {
                const stockItem = freezerStock?.find(s => s.productId === product.id);
                const stockQty = stockItem?.quantity ?? 0;
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                    data-testid={`product-card-${product.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                        <ChefHat className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${parseFloat(product.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={stockQty > 0 ? "default" : "secondary"}>
                      {stockQty} in freezer
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
