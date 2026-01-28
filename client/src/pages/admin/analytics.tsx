import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Order, Ingredient, Batch } from "@shared/schema";
import { format, subDays, startOfDay } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Snowflake, Factory, TrendingUp, Package, AlertTriangle } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

type FreezerStock = {
  id: string;
  productId: string;
  quantity: number;
  batchId?: string;
  createdAt: string;
  product: { name: string };
};

export default function Analytics() {
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

  const { data: freezerStock, isLoading: freezerLoading } = useQuery<FreezerStock[]>({
    queryKey: ["/api/admin/freezer"],
  });

  const { data: freezerStats } = useQuery<{
    totalItems: number;
    uniqueProducts: number;
    productBreakdown: { productId: string; productName: string; totalQuantity: number }[];
  }>({
    queryKey: ["/api/admin/stats/freezer"],
  });

  const { data: activityLogs } = useQuery<any[]>({
    queryKey: ["/api/admin/activity/recent"],
  });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, "MMM d"),
      fullDate: startOfDay(date),
    };
  });

  const ordersByDay = last7Days.map((day) => {
    const dayOrders = orders?.filter((order) => {
      if (!order.createdAt) return false;
      const orderDate = startOfDay(new Date(order.createdAt));
      return orderDate.getTime() === day.fullDate.getTime();
    }) || [];

    return {
      date: day.date,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, o) => sum + parseFloat(o.total), 0),
    };
  });

  const ordersByStatus = orders?.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const statusData = Object.entries(ordersByStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  const batchesByStatus = batches?.reduce((acc, batch) => {
    acc[batch.status] = (acc[batch.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const batchStatusData = Object.entries(batchesByStatus).map(([status, count]) => ({
    name: status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
    value: count,
  }));

  const batchesByDay = last7Days.map((day) => {
    const dayBatches = batches?.filter((batch) => {
      if (!batch.batchDate) return false;
      const batchDate = startOfDay(new Date(batch.batchDate));
      return batchDate.getTime() === day.fullDate.getTime();
    }) || [];

    const completedBatches = dayBatches.filter(b => b.status === "completed");
    const totalQuantity = completedBatches.reduce((sum, b) => {
      return sum + (b.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0);
    }, 0);

    return {
      date: day.date,
      batches: dayBatches.length,
      completed: completedBatches.length,
      produced: totalQuantity,
    };
  });

  const freezerByProduct = freezerStock?.reduce((acc, item) => {
    const productName = item.product?.name || "Unknown";
    if (!acc[productName]) {
      acc[productName] = 0;
    }
    acc[productName] += item.quantity;
    return acc;
  }, {} as Record<string, number>) || {};

  const freezerChartData = Object.entries(freezerByProduct)
    .map(([name, quantity]) => ({
      name: name.length > 15 ? name.substring(0, 15) + "..." : name,
      fullName: name,
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const lowStockIngredients = ingredients?.filter(i => 
    parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
  ) || [];

  const ingredientUsageData = ingredients?.slice(0, 8).map((ing) => ({
    name: ing.name.length > 12 ? ing.name.substring(0, 12) + "..." : ing.name,
    fullName: ing.name,
    onHand: parseFloat(ing.onHand),
    reorderAt: parseFloat(ing.reorderThreshold),
    unit: ing.unit,
  })) || [];

  const totalFreezerItems = freezerStock?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const uniqueProductsInFreezer = new Set(freezerStock?.map(item => item.productId) || []).size;

  const isLoading = ordersLoading || ingredientsLoading || batchesLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold" data-testid="text-analytics-title">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Business insights and performance metrics
        </p>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList data-testid="tabs-analytics">
          <TabsTrigger value="orders" data-testid="tab-orders">
            <TrendingUp className="h-4 w-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="freezer" data-testid="tab-freezer">
            <Snowflake className="h-4 w-4 mr-2" />
            Freezer
          </TabsTrigger>
          <TabsTrigger value="bake" data-testid="tab-bake">
            <Factory className="h-4 w-4 mr-2" />
            Bake
          </TabsTrigger>
        </TabsList>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-orders-7-days">
              <CardHeader>
                <CardTitle data-testid="title-orders-7-days">Orders (Last 7 Days)</CardTitle>
                <CardDescription>Daily order volume</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ordersByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-revenue-7-days">
              <CardHeader>
                <CardTitle data-testid="title-revenue-7-days">Revenue (Last 7 Days)</CardTitle>
                <CardDescription>Daily revenue trend</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={ordersByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary)/0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-order-status-distribution">
            <CardHeader>
              <CardTitle data-testid="title-order-status-distribution">Order Status Distribution</CardTitle>
              <CardDescription>Current status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : statusData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No orders yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FREEZER TAB */}
        <TabsContent value="freezer" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-freezer-total">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="label-freezer-total">Total Units</CardTitle>
                <Snowflake className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-freezer-total">{totalFreezerItems}</div>
                <p className="text-xs text-muted-foreground">bagels in freezer</p>
              </CardContent>
            </Card>
            <Card data-testid="card-freezer-products">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="label-freezer-products">Product Types</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-freezer-products">{uniqueProductsInFreezer}</div>
                <p className="text-xs text-muted-foreground">different products</p>
              </CardContent>
            </Card>
            <Card data-testid="card-stock-status">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="label-stock-status">Stock Status</CardTitle>
                {totalFreezerItems > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div 
                  className={`text-2xl font-bold ${totalFreezerItems > 0 ? "text-green-500" : "text-muted-foreground"}`} 
                  data-testid="text-freezer-status"
                >
                  {totalFreezerItems > 0 ? "Stocked" : "Empty"}
                </div>
                <p className="text-xs text-muted-foreground">freezer inventory level</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-freezer-stock-product">
              <CardHeader>
                <CardTitle data-testid="title-freezer-stock-product">Freezer Stock by Product</CardTitle>
                <CardDescription>Finished goods inventory breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {freezerLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : freezerChartData.length === 0 ? (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Snowflake className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No items in freezer</p>
                      <p className="text-sm">Complete batches to stock the freezer</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={freezerChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string, props: any) => [
                          `${value} units`,
                          props.payload.fullName
                        ]}
                      />
                      <Bar dataKey="quantity" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-freezer-inventory-list">
              <CardHeader>
                <CardTitle data-testid="title-freezer-inventory-list">Freezer Inventory List</CardTitle>
                <CardDescription>All items currently in storage</CardDescription>
              </CardHeader>
              <CardContent>
                {freezerLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : !freezerStock || freezerStock.length === 0 ? (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No freezer stock entries
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {freezerStock.slice(0, 15).map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                        data-testid={`freezer-item-${index}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.product?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {format(new Date(item.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {item.quantity} units
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BAKE TAB */}
        <TabsContent value="bake" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card data-testid="card-total-batches">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="label-total-batches">Total Batches</CardTitle>
                <Factory className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-batches">{batches.length}</div>
                <p className="text-xs text-muted-foreground">all time</p>
              </CardContent>
            </Card>
            <Card data-testid="card-completed-batches">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="label-completed-batches">Completed</CardTitle>
                <Package className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500" data-testid="text-completed-batches">
                  {batches.filter(b => b.status === "completed").length}
                </div>
                <p className="text-xs text-muted-foreground">finished batches</p>
              </CardContent>
            </Card>
            <Card data-testid="card-inprogress-batches">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="label-inprogress-batches">In Progress</CardTitle>
                <Factory className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500" data-testid="text-inprogress-batches">
                  {batches.filter(b => b.status === "in_progress").length}
                </div>
                <p className="text-xs text-muted-foreground">currently baking</p>
              </CardContent>
            </Card>
            <Card data-testid="card-low-stock-alerts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="label-low-stock-alerts">Low Stock Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-low-stock">
                  {lowStockIngredients.length}
                </div>
                <p className="text-xs text-muted-foreground">ingredients need reorder</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-production-chart">
              <CardHeader>
                <CardTitle data-testid="title-production-chart">Production (Last 7 Days)</CardTitle>
                <CardDescription>Daily batch activity</CardDescription>
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={batchesByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="batches" fill="hsl(var(--primary))" name="Scheduled" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-batch-status-distribution">
              <CardHeader>
                <CardTitle data-testid="title-batch-status-distribution">Batch Status Distribution</CardTitle>
                <CardDescription>Current batch states</CardDescription>
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : batchStatusData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Factory className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No batches scheduled</p>
                      <p className="text-sm">Create a batch to start production</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={batchStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {batchStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-ingredient-stock-levels">
            <CardHeader>
              <CardTitle data-testid="title-ingredient-stock-levels">Ingredient Stock Levels</CardTitle>
              <CardDescription>Current on-hand vs reorder threshold</CardDescription>
            </CardHeader>
            <CardContent>
              {ingredientsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : ingredientUsageData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No ingredients tracked yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ingredientUsageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} ${props.payload.unit}`,
                        name === "onHand" ? "On Hand" : "Reorder At"
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="onHand" fill="hsl(var(--primary))" name="On Hand" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="reorderAt" fill="hsl(var(--destructive))" name="Reorder At" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {lowStockIngredients.length > 0 && (
            <Card className="border-destructive/50" data-testid="card-low-stock-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive" data-testid="title-low-stock-section">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>Ingredients below reorder threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lowStockIngredients.map((ing) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between p-3 rounded-md bg-destructive/10 border border-destructive/20"
                      data-testid={`low-stock-${ing.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{ing.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ing.onHand} / {ing.reorderThreshold} {ing.unit}
                        </p>
                      </div>
                      <Badge variant="destructive" className="ml-2">Low</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
