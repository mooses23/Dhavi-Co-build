import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Check, 
  X, 
  Eye, 
  Clock,
  ShoppingCart,
  ChefHat,
  Package,
  CheckCircle
} from "lucide-react";
import type { Order } from "@shared/schema";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  new: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock, label: "New" },
  approved: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Check, label: "Approved" },
  baking: { color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: ChefHat, label: "Baking" },
  ready: { color: "bg-primary/10 text-gold border-primary/20", icon: Package, label: "Ready" },
  completed: { color: "bg-muted text-muted-foreground border-border", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: X, label: "Cancelled" },
};

export default function AdminOrders() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery<(Order & { location: { name: string }; items: any[] })[]>({
    queryKey: ["/api/admin/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order Updated", description: "Order status has been updated" });
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredOrders = orders?.filter((o) => 
    statusFilter === "all" || o.status === statusFilter
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage customer orders</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="baking">Baking</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const config = statusConfig[order.status];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border hover-elevate gap-4"
                    data-testid={`order-card-${order.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold truncate">{order.customerName}</span>
                        <Badge variant="outline" className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customerEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.fulfillmentDate), "MMM d, yyyy")} - {order.fulfillmentWindow} at {order.location?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gold text-lg">
                          ${parseFloat(order.total).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.items?.length || 0} items
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedOrder(order)}
                          data-testid={`button-view-${order.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === "new" && (
                          <>
                            <Button
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "approved" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-${order.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-cancel-${order.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedOrder.customerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedOrder.customerPhone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusConfig[selectedOrder.status].color}>
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <div className="space-y-2">
                  {(selectedOrder as any).items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.product?.name || "Product"} x{item.quantity}</span>
                      <span className="font-medium">${parseFloat(item.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-4 pt-4 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-gold">${parseFloat(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedOrder?.status === "new" && (
              <div className="flex gap-2 w-full">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "cancelled" })}
                  disabled={updateStatusMutation.isPending}
                >
                  Cancel Order
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "approved" })}
                  disabled={updateStatusMutation.isPending}
                >
                  Approve Order
                </Button>
              </div>
            )}
            {selectedOrder?.status === "approved" && (
              <Button
                className="w-full"
                onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "baking" })}
                disabled={updateStatusMutation.isPending}
              >
                Start Baking
              </Button>
            )}
            {selectedOrder?.status === "baking" && (
              <Button
                className="w-full"
                onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "ready" })}
                disabled={updateStatusMutation.isPending}
              >
                Mark as Ready
              </Button>
            )}
            {selectedOrder?.status === "ready" && (
              <Button
                className="w-full"
                onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "completed" })}
                disabled={updateStatusMutation.isPending}
              >
                Complete Order
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
