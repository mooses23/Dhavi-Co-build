import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  FileText,
  Receipt,
  Inbox,
  Loader2,
  XCircle,
  Plus,
  Trash2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Order, Product, Location } from "@shared/schema";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  new: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock, label: "New" },
  approved: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Check, label: "Approved" },
  baking: { color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: ChefHat, label: "Baking" },
  ready: { color: "bg-primary/10 text-gold border-primary/20", icon: Package, label: "Ready" },
  completed: { color: "bg-muted text-muted-foreground border-border", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: X, label: "Cancelled" },
};

type WorkflowTab = "incoming" | "in-progress" | "completed" | "cancelled";

const workflowTabConfig: Record<WorkflowTab, { label: string; icon: any; statuses: string[] }> = {
  "incoming": { label: "Incoming", icon: Inbox, statuses: ["new"] },
  "in-progress": { label: "In Progress", icon: Loader2, statuses: ["approved", "baking", "ready"] },
  "completed": { label: "Completed", icon: CheckCircle, statuses: ["completed"] },
  "cancelled": { label: "Cancelled", icon: XCircle, statuses: ["cancelled"] },
};

const fulfillmentWindowOptions = [
  { value: "Morning (8am-12pm)", label: "Morning (8am-12pm)" },
  { value: "Afternoon (12pm-5pm)", label: "Afternoon (12pm-5pm)" },
  { value: "Evening (5pm-8pm)", label: "Evening (5pm-8pm)" },
];

const newOrderFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  deliveryCity: z.string().min(1, "City is required"),
  deliveryState: z.string().min(1, "State is required"),
  deliveryZip: z.string().min(1, "ZIP code is required"),
  deliveryInstructions: z.string().optional(),
  fulfillmentDate: z.date({ required_error: "Fulfillment date is required" }),
  fulfillmentWindow: z.string().min(1, "Fulfillment window is required"),
  locationId: z.string().optional(),
  notes: z.string().optional(),
});

type NewOrderFormData = z.infer<typeof newOrderFormSchema>;

interface NewOrderItem {
  productId: string;
  quantity: number;
}

export default function AdminOrders() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<WorkflowTab>("incoming");
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
  
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [newOrderItems, setNewOrderItems] = useState<NewOrderItem[]>([{ productId: "", quantity: 1 }]);
  
  const newOrderForm = useForm<NewOrderFormData>({
    resolver: zodResolver(newOrderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      deliveryAddress: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryInstructions: "",
      fulfillmentDate: new Date(),
      fulfillmentWindow: "Morning (8am-12pm)",
      locationId: "",
      notes: "",
    },
  });

  const { data: ordersResponse, isLoading } = useQuery<{ orders: (Order & { location: { name: string }; items: any[] })[]; pagination: any } | (Order & { location: { name: string }; items: any[] })[]>({
    queryKey: ["/api/admin/orders"],
  });

  const orders = Array.isArray(ordersResponse) ? ordersResponse : (ordersResponse?.orders || []);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/admin/locations"],
  });

  const createManualOrderMutation = useMutation({
    mutationFn: async (data: {
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      deliveryAddress: string;
      deliveryCity: string;
      deliveryState: string;
      deliveryZip: string;
      deliveryInstructions?: string;
      fulfillmentDate: string;
      fulfillmentWindow: string;
      locationId?: string;
      notes?: string;
      items: { productId: string; quantity: number }[];
    }) => {
      return await apiRequest("POST", "/api/admin/orders/manual", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order Created", description: "Manual order has been created successfully" });
      setShowNewOrderDialog(false);
      resetNewOrderForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetNewOrderForm = () => {
    newOrderForm.reset({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      deliveryAddress: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryInstructions: "",
      fulfillmentDate: new Date(),
      fulfillmentWindow: "Morning (8am-12pm)",
      locationId: "",
      notes: "",
    });
    setNewOrderItems([{ productId: "", quantity: 1 }]);
  };

  const handleAddOrderItem = () => {
    setNewOrderItems([...newOrderItems, { productId: "", quantity: 1 }]);
  };

  const handleRemoveOrderItem = (index: number) => {
    if (newOrderItems.length > 1) {
      setNewOrderItems(newOrderItems.filter((_, i) => i !== index));
    }
  };

  const handleOrderItemChange = (index: number, field: keyof NewOrderItem, value: string | number) => {
    const updatedItems = [...newOrderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewOrderItems(updatedItems);
  };

  const handleCreateOrder = (data: NewOrderFormData) => {
    const validItems = newOrderItems.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Missing Items", description: "Please add at least one product", variant: "destructive" });
      return;
    }

    createManualOrderMutation.mutate({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone || undefined,
      deliveryAddress: data.deliveryAddress,
      deliveryCity: data.deliveryCity,
      deliveryState: data.deliveryState,
      deliveryZip: data.deliveryZip,
      deliveryInstructions: data.deliveryInstructions || undefined,
      fulfillmentDate: data.fulfillmentDate.toISOString(),
      fulfillmentWindow: data.fulfillmentWindow,
      locationId: data.locationId || undefined,
      notes: data.notes || undefined,
      items: validItems,
    });
  };

  const calculateOrderTotal = () => {
    let total = 0;
    for (const item of newOrderItems) {
      if (item.productId && item.quantity > 0) {
        const product = products?.find(p => p.id === item.productId);
        if (product) {
          total += parseFloat(product.price) * item.quantity;
        }
      }
    }
    return total;
  };

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

  const handleGenerateInvoice = () => {
    if (!selectedOrder) return;
    const invoiceDate = format(new Date(), "MMMM d, yyyy");
    const orderDate = format(new Date(selectedOrder.createdAt || new Date()), "MMMM d, yyyy");
    const invoiceNumber = `INV-${selectedOrder.id.slice(0, 8).toUpperCase()}`;
    
    const invoiceContent = `
      <html>
        <head>
          <title>Invoice ${invoiceNumber} - D'Havi Spelt Bagels</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #d4a017; }
            .brand { font-size: 28px; font-weight: bold; color: #1a1a1a; }
            .brand-tagline { color: #666; font-size: 14px; margin-top: 4px; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { font-size: 32px; color: #d4a017; margin-bottom: 8px; }
            .invoice-number { color: #666; font-size: 14px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .detail-section { flex: 1; }
            .detail-section h3 { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 1px; }
            .detail-section p { margin-bottom: 4px; line-height: 1.5; }
            .detail-section .name { font-weight: 600; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            thead { background: #f8f8f8; }
            th { text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0; }
            th:last-child { text-align: right; }
            td { padding: 16px 12px; border-bottom: 1px solid #eee; }
            td:last-child { text-align: right; font-weight: 500; }
            .item-name { font-weight: 500; }
            .item-desc { color: #666; font-size: 13px; margin-top: 2px; }
            .totals { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-row.subtotal { border-bottom: 1px solid #eee; }
            .total-row.grand-total { font-size: 20px; font-weight: 700; color: #d4a017; border-top: 2px solid #333; padding-top: 16px; margin-top: 8px; }
            .footer { margin-top: 60px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 13px; }
            .footer p { margin-bottom: 4px; }
            .payment-note { background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 30px; }
            .payment-note h4 { font-size: 14px; margin-bottom: 8px; }
            .payment-note p { color: #666; font-size: 13px; }
            @media print {
              body { padding: 20px; }
              .invoice-header { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div>
              <div class="brand">D'Havi Spelt Bagels</div>
              <div class="brand-tagline">Artisan Spelt Bagels</div>
            </div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <div class="invoice-number">${invoiceNumber}</div>
            </div>
          </div>
          
          <div class="invoice-details">
            <div class="detail-section">
              <h3>Bill To</h3>
              <p class="name">${selectedOrder.customerName}</p>
              <p>${selectedOrder.customerEmail}</p>
              ${selectedOrder.customerPhone ? `<p>${selectedOrder.customerPhone}</p>` : ''}
              <p>${selectedOrder.deliveryAddress}</p>
              <p>${selectedOrder.deliveryCity}, ${selectedOrder.deliveryState} ${selectedOrder.deliveryZip}</p>
            </div>
            <div class="detail-section" style="text-align: right;">
              <h3>Invoice Details</h3>
              <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
              <p><strong>Order Date:</strong> ${orderDate}</p>
              <p><strong>Order ID:</strong> #${selectedOrder.id.slice(0, 8)}</p>
              <p><strong>Fulfillment:</strong> ${format(new Date(selectedOrder.fulfillmentDate), "MMM d, yyyy")}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(selectedOrder as any).items?.map((item: any) => `
                <tr>
                  <td>
                    <div class="item-name">${item.product?.name || "Product"}</div>
                    ${item.product?.description ? `<div class="item-desc">${item.product.description.slice(0, 50)}...</div>` : ''}
                  </td>
                  <td>${item.quantity}</td>
                  <td>$${(parseFloat(item.total) / item.quantity).toFixed(2)}</td>
                  <td>$${parseFloat(item.total).toFixed(2)}</td>
                </tr>
              `).join("") || ""}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row subtotal">
              <span>Subtotal</span>
              <span>$${parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax</span>
              <span>$${(parseFloat(selectedOrder.total) - parseFloat(selectedOrder.subtotal)).toFixed(2)}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total</span>
              <span>$${parseFloat(selectedOrder.total).toFixed(2)}</span>
            </div>
          </div>
          
          <div class="payment-note">
            <h4>Payment Information</h4>
            <p>Payment has been processed via Stripe. Thank you for your order!</p>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing D'Havi Spelt Bagels!</p>
            <p>Questions? Contact us at orders@dhavibagels.com</p>
          </div>
        </body>
      </html>
    `;
    
    const invoiceWindow = window.open("", "_blank");
    if (invoiceWindow) {
      invoiceWindow.document.write(invoiceContent);
      invoiceWindow.document.close();
      invoiceWindow.print();
    }
  };

  const getOrderCountByTab = (tab: WorkflowTab) => {
    const statuses = workflowTabConfig[tab].statuses;
    return orders?.filter((o) => statuses.includes(o.status)).length || 0;
  };

  const filteredOrders = orders?.filter((o) => {
    const matchesTab = workflowTabConfig[activeTab].statuses.includes(o.status);
    const matchesSearch = searchQuery === "" || 
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[250px]"
              data-testid="input-search"
            />
          </div>
          <Button size="icon" onClick={() => setShowNewOrderDialog(true)} data-testid="button-new-order">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WorkflowTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(workflowTabConfig) as WorkflowTab[]).map((tab) => {
            const TabIcon = workflowTabConfig[tab].icon;
            const count = getOrderCountByTab(tab);
            return (
              <TabsTrigger 
                key={tab} 
                value={tab} 
                className="flex items-center gap-2"
                data-testid={`tab-${tab}`}
              >
                <TabIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{workflowTabConfig[tab].label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(workflowTabConfig) as WorkflowTab[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {workflowTabConfig[tab].label} Orders
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
                    <p>No {workflowTabConfig[tab].label.toLowerCase()} orders found</p>
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
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selectedOrder} onOpenChange={() => { setSelectedOrder(null); setEditMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-serif">Order Details</DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateInvoice}
                  data-testid="button-invoice"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Invoice
                </Button>
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

      <Dialog open={showNewOrderDialog} onOpenChange={(open) => { if (!open) resetNewOrderForm(); setShowNewOrderDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Create New Order</DialogTitle>
          </DialogHeader>
          
          <Form {...newOrderForm}>
            <form onSubmit={newOrderForm.handleSubmit(handleCreateOrder)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={newOrderForm.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John Doe" data-testid="input-new-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newOrderForm.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="john@example.com" data-testid="input-new-customer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newOrderForm.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(555) 555-5555" data-testid="input-new-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Delivery Address</h3>
                <FormField
                  control={newOrderForm.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main St" data-testid="input-new-delivery-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={newOrderForm.control}
                    name="deliveryCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="New York" data-testid="input-new-delivery-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newOrderForm.control}
                    name="deliveryState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="NY" data-testid="input-new-delivery-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newOrderForm.control}
                    name="deliveryZip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="10001" data-testid="input-new-delivery-zip" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={newOrderForm.control}
                  name="deliveryInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Instructions (optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Leave at door, ring doorbell, etc." data-testid="input-new-delivery-instructions" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Fulfillment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={newOrderForm.control}
                    name="fulfillmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fulfillment Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                data-testid="button-fulfillment-date"
                              >
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newOrderForm.control}
                    name="fulfillmentWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fulfillment Window *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-fulfillment-window">
                              <SelectValue placeholder="Select window" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fulfillmentWindowOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newOrderForm.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Location (optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations?.map((location) => (
                              <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Order Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOrderItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {newOrderItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Select value={item.productId} onValueChange={(v) => handleOrderItemChange(index, "productId", v)}>
                        <SelectTrigger className="flex-1" data-testid={`select-product-${index}`}>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.filter(p => p.isActive).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ${parseFloat(product.price).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleOrderItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                        className="w-20"
                        data-testid={`input-quantity-${index}`}
                      />
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveOrderItem(index)}
                        disabled={newOrderItems.length === 1}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {calculateOrderTotal() > 0 && (
                  <div className="text-right font-semibold text-lg">
                    Total: <span className="text-gold">${calculateOrderTotal().toFixed(2)}</span>
                  </div>
                )}
              </div>

              <FormField
                control={newOrderForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="border-t pt-4">
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Special instructions, baker notes, etc." data-testid="input-new-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewOrderDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createManualOrderMutation.isPending} data-testid="button-create-order">
                  {createManualOrderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Order
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
