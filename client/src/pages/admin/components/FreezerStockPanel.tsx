import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Snowflake } from "lucide-react";

type FreezerStock = {
  id: string;
  productId: string;
  quantity: number;
  batchId?: string;
  createdAt: string;
  product: { name: string };
};

export function FreezerStockPanel() {
  const { data: freezerStock, isLoading } = useQuery<FreezerStock[]>({
    queryKey: ["/api/admin/freezer"],
  });

  const { data: stats } = useQuery<{
    totalItems: number;
    uniqueProducts: number;
  }>({
    queryKey: ["/api/admin/stats/freezer"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            Freezer Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const groupedStock = freezerStock?.reduce((acc, item) => {
    const key = item.productId;
    if (!acc[key]) {
      acc[key] = {
        productName: item.product?.name || "Unknown",
        totalQuantity: 0,
        items: [],
      };
    }
    acc[key].totalQuantity += item.quantity;
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { productName: string; totalQuantity: number; items: FreezerStock[] }>) || {};

  const stockEntries = Object.entries(groupedStock);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Snowflake className="h-5 w-5 text-blue-400" />
          Freezer Stock
        </CardTitle>
        <CardDescription>
          {stats?.totalItems || 0} items across {stats?.uniqueProducts || 0} products
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stockEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items in freezer</p>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {stockEntries.map(([productId, data]) => (
              <div
                key={productId}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                data-testid={`freezer-item-${productId}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{data.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.items.length} batch{data.items.length !== 1 ? "es" : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {data.totalQuantity} units
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
