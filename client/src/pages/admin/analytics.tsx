import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Order, Ingredient, Batch } from "@shared/schema";
import { format, subDays, startOfDay, isWithinInterval } from "date-fns";
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
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted))", "#10b981", "#f59e0b", "#ef4444"];

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
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  const inventoryData = ingredients?.slice(0, 10).map((ing) => ({
    name: ing.name.length > 12 ? ing.name.substring(0, 12) + "..." : ing.name,
    onHand: parseFloat(ing.onHand),
    reorderAt: parseFloat(ing.reorderThreshold),
  })) || [];

  const freezerData = freezerStats?.productBreakdown?.slice(0, 8).map((item) => ({
    name: item.productName.length > 15 ? item.productName.substring(0, 15) + "..." : item.productName,
    quantity: item.totalQuantity,
  })) || [];

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
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          <TabsTrigger value="production" data-testid="tab-production">Production</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Orders (Last 7 Days)</CardTitle>
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

            <Card>
              <CardHeader>
                <CardTitle>Revenue (Last 7 Days)</CardTitle>
                <CardDescription>Daily revenue trend</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={ordersByDay}>
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
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <CardDescription>Current status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
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

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ingredient Stock Levels</CardTitle>
                <CardDescription>Current on-hand vs reorder threshold</CardDescription>
              </CardHeader>
              <CardContent>
                {ingredientsLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={inventoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="onHand" fill="hsl(var(--primary))" name="On Hand" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="reorderAt" fill="hsl(var(--destructive))" name="Reorder At" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Freezer Stock</CardTitle>
                <CardDescription>Finished goods inventory</CardDescription>
              </CardHeader>
              <CardContent>
                {!freezerStats ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : freezerData.length === 0 ? (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No freezer stock data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={freezerData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="quantity" fill="hsl(var(--accent))" name="Quantity" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Batch Status</CardTitle>
                <CardDescription>Production batch distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : batchStatusData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No batch data available
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

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events</CardDescription>
              </CardHeader>
              <CardContent>
                {!activityLogs ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : activityLogs.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    No activity recorded yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {activityLogs.slice(0, 10).map((log: any, index: number) => (
                      <div
                        key={log.id || index}
                        className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                        data-testid={`activity-log-${index}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {log.actionType.replace(".", " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
