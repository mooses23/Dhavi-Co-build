import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order, Ingredient, Batch, Product } from "@shared/schema";
import { isToday } from "date-fns";

import {
  StatsCards,
  QuickActions,
  BakeSchedule,
  PendingOrdersPanel,
  LowStockAlerts,
  FreezerStockPanel,
  ActivityLogPanel,
} from "./components";

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

  const todayBatches = batches?.filter((b) => {
    const batchDate = new Date(b.batchDate);
    return isToday(batchDate) && b.status !== "cancelled";
  }) || [];

  const handleApproveOrder = (orderId: string) => {
    approveOrderMutation.mutate(orderId);
  };

  const handleUpdateBatch = (batchId: string, status: string) => {
    updateBatchMutation.mutate({ batchId, status });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here's what's happening today.
        </p>
      </div>

      <QuickActions
        pendingOrders={pendingOrders}
        todayBatches={todayBatches}
        onApproveOrder={handleApproveOrder}
        onUpdateBatch={handleUpdateBatch}
        isApproving={approveOrderMutation.isPending}
        isUpdatingBatch={updateBatchMutation.isPending}
      />

      <StatsCards
        pendingOrdersCount={pendingOrders.length}
        todayRevenue={stats?.todayRevenue || 0}
        activeProductsCount={products?.filter(p => p.isActive).length || 0}
        lowStockCount={lowStockIngredients.length}
        isLoading={{
          orders: ordersLoading,
          ingredients: ingredientsLoading,
          products: false,
        }}
      />

      <BakeSchedule
        todayBatches={todayBatches}
        allBatches={batches || []}
        products={products || []}
        isLoading={batchesLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <PendingOrdersPanel
          pendingOrders={pendingOrders}
          isLoading={ordersLoading}
          onApproveOrder={handleApproveOrder}
          isApproving={approveOrderMutation.isPending}
        />

        <LowStockAlerts
          lowStockIngredients={lowStockIngredients}
          isLoading={ingredientsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FreezerStockPanel />
        <ActivityLogPanel />
      </div>
    </div>
  );
}
