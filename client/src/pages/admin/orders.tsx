import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CheckCircle,
  Pencil,
  Printer,
  Search,
  FileText
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZip: "",
    deliveryInstructions: "",
    notes: "",
  });
  const printRef = useRef<HTMLDivElement>(null);

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

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: any }) => {
      return await apiRequest("PATCH", `/api/admin/orders/${orderId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order Updated", description: "Order details have been saved" });
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditClick = (order: Order) => {
    setEditForm({
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone || "",
      deliveryAddress: order.deliveryAddress,
      deliveryCity: order.deliveryCity,
      deliveryState: order.deliveryState,
      deliveryZip: order.deliveryZip,
      deliveryInstructions: order.deliveryInstructions || "",
      notes: order.notes || "",
    });
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (selectedOrder) {
      updateOrderMutation.mutate({ orderId: selectedOrder.id, data: editForm });
    }
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    const printContent = `
      <html>
        <head>
          <title>Order Slip - ${selectedOrder.customerName}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; max-width: 400px; }
            .header { text-align: center; border-bottom: 2px solid #d4a017; padding-bottom: 10px; margin-bottom: 20px; }
            .brand { font-size: 24px; font-weight: bold; }
            .order-id { color: #666; font-size: 12px; }
            .section { margin-bottom: 15px; }
            .label { font-weight: bold; color: #333; margin-bottom: 5px; }
            .items { border-top: 1px solid #ddd; padding-top: 10px; }
            .item { display: flex; justify-content: space-between; padding: 5px 0; }
            .total { border-top: 2px solid #333; padding-top: 10px; font-weight: bold; font-size: 18px; }
            .notes { background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">D'Havi Spelt Bagels</div>
            <div class="order-id">Order #${selectedOrder.id.slice(0, 8)}</div>
          </div>
          <div class="section">
            <div class="label">Customer</div>
            <div>${selectedOrder.customerName}</div>
            <div>${selectedOrder.customerPhone || "No phone"}</div>
          </div>
          <div class="section">
            <div class="label">Pickup</div>
            <div>${format(new Date(selectedOrder.fulfillmentDate), "EEEE, MMMM d, yyyy")}</div>
            <div>${selectedOrder.fulfillmentWindow}</div>
          </div>
          <div class="section">
            <div class="label">Delivery Address</div>
            <div>${selectedOrder.deliveryAddress}</div>
            <div>${selectedOrder.deliveryCity}, ${selectedOrder.deliveryState} ${selectedOrder.deliveryZip}</div>
          </div>
          <div class="items">
            <div class="label">Items</div>
            ${(selectedOrder as any).items?.map((item: any) => `
              <div class="item">
                <span>${item.quantity}x ${item.product?.name || "Product"}</span>
                <span>$${parseFloat(item.total).toFixed(2)}</span>
              </div>
            `).join("") || ""}
          </div>
          <div class="total">
            <div class="item">
              <span>Total</span>
              <span>$${parseFloat(selectedOrder.total).toFixed(2)}</span>
            </div>
          </div>
          ${selectedOrder.notes ? `<div class="notes"><strong>Baker Notes:</strong> ${selectedOrder.notes}</div>` : ""}
          ${selectedOrder.deliveryInstructions ? `<div class="notes"><strong>Delivery Instructions:</strong> ${selectedOrder.deliveryInstructions}</div>` : ""}
          <div class="footer">Thank you for choosing D'Havi!</div>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredOrders = orders?.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage customer orders</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Queue
            {filteredOrders.length > 0 && (
              <Badge variant="secondary" className="ml-2">{filteredOrders.length}</Badge>
            )}
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
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-semibold truncate">{order.customerName}</span>
                        <Badge variant="outline" className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        {order.notes && (
                          <Badge variant="secondary" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Has Notes
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.customerEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.fulfillmentDate), "MMM d, yyyy")} - {order.fulfillmentWindow}
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
                              className="bg-green-600 hover:bg-green-700"
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

      <Dialog open={!!selectedOrder} onOpenChange={() => { setSelectedOrder(null); setEditMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-serif">Order Details</DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  data-testid="button-print"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Slip
                </Button>
                {selectedOrder && !editMode && selectedOrder.status !== "cancelled" && selectedOrder.status !== "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(selectedOrder)}
                    data-testid="button-edit"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedOrder && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                {editMode ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Customer Name</Label>
                        <Input
                          value={editForm.customerName}
                          onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                          data-testid="input-customer-name"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={editForm.customerEmail}
                          onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                          data-testid="input-customer-email"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={editForm.customerPhone}
                          onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                          data-testid="input-customer-phone"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Delivery Address</Label>
                      <Input
                        value={editForm.deliveryAddress}
                        onChange={(e) => setEditForm({ ...editForm, deliveryAddress: e.target.value })}
                        data-testid="input-delivery-address"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>City</Label>
                        <Input
                          value={editForm.deliveryCity}
                          onChange={(e) => setEditForm({ ...editForm, deliveryCity: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input
                          value={editForm.deliveryState}
                          onChange={(e) => setEditForm({ ...editForm, deliveryState: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>ZIP</Label>
                        <Input
                          value={editForm.deliveryZip}
                          onChange={(e) => setEditForm({ ...editForm, deliveryZip: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Delivery Instructions</Label>
                      <Textarea
                        value={editForm.deliveryInstructions}
                        onChange={(e) => setEditForm({ ...editForm, deliveryInstructions: e.target.value })}
                        placeholder="Leave at door, etc."
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-gold" />
                        Baker Notes
                      </Label>
                      <Textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        placeholder="Special instructions for the baker..."
                        className="border-gold/30 focus:border-gold"
                        data-testid="input-baker-notes"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                      <Button onClick={handleSaveEdit} disabled={updateOrderMutation.isPending}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
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
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                      <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                      <p className="font-medium">{selectedOrder.deliveryCity}, {selectedOrder.deliveryState} {selectedOrder.deliveryZip}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Fulfillment Date</p>
                        <p className="font-medium">{format(new Date(selectedOrder.fulfillmentDate), "EEEE, MMMM d, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Time Window</p>
                        <p className="font-medium capitalize">{selectedOrder.fulfillmentWindow}</p>
                      </div>
                    </div>
                    {selectedOrder.deliveryInstructions && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-muted-foreground">Delivery Instructions</p>
                        <p className="font-medium">{selectedOrder.deliveryInstructions}</p>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div className="bg-gold/10 border border-gold/20 rounded-lg p-4">
                        <p className="text-sm text-gold font-medium flex items-center gap-2 mb-1">
                          <ChefHat className="h-4 w-4" />
                          Baker Notes
                        </p>
                        <p>{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="items" className="space-y-4">
                <div className="space-y-2">
                  {(selectedOrder as any).items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {item.product?.imageUrl && (
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name}
                            className="w-12 h-12 rounded-md object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{item.product?.name || "Product"}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-medium">${parseFloat(item.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-gold">${parseFloat(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            {selectedOrder?.status === "new" && !editMode && (
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
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "approved" })}
                  disabled={updateStatusMutation.isPending}
                >
                  Approve Order
                </Button>
              </div>
            )}
            {selectedOrder?.status === "approved" && !editMode && (
              <Button
                className="w-full"
                onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "baking" })}
                disabled={updateStatusMutation.isPending}
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Start Baking
              </Button>
            )}
            {selectedOrder?.status === "baking" && !editMode && (
              <Button
                className="w-full bg-gold hover:bg-gold/90 text-black"
                onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "ready" })}
                disabled={updateStatusMutation.isPending}
              >
                <Package className="h-4 w-4 mr-2" />
                Mark as Ready
              </Button>
            )}
            {selectedOrder?.status === "ready" && !editMode && (
              <Button
                className="w-full"
                onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "completed" })}
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Order
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
