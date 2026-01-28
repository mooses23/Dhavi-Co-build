import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Snowflake, Minus, Plus } from "lucide-react";
import type { FreezerStock, Product } from "@shared/schema";

type FreezerStockWithProduct = FreezerStock & {
  product?: Product;
};

export default function AdminFreezer() {
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const { data: freezerStock, isLoading } = useQuery<FreezerStockWithProduct[]>({
    queryKey: ["/api/admin/freezer"],
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      return await apiRequest("PATCH", `/api/admin/freezer/${id}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freezer"] });
      toast({ title: "Quantity Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAdjust = (stockId: string, currentQuantity: number, delta: number) => {
    const newQuantity = Math.max(0, currentQuantity + delta);
    updateQuantityMutation.mutate({ id: stockId, quantity: newQuantity });
  };

  const handleSetQuantity = (stockId: string, quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    updateQuantityMutation.mutate({ id: stockId, quantity: newQuantity });
  };

  const formatDate = (dateString: Date | string | null | undefined) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalItems = freezerStock?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-freezer-heading">
            Freezer Stock
          </h1>
          <p className="text-muted-foreground mt-1">
            Track finished bagels in freezer storage
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-total-count">
          <Snowflake className="h-4 w-4 mr-2" />
          {totalItems} total items
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            Current Inventory
            {freezerStock && (
              <Badge variant="secondary" className="ml-2" data-testid="badge-product-count">
                {freezerStock.length} entries
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !freezerStock || freezerStock.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-stock">
              <Snowflake className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No items in freezer</p>
              <p className="text-sm mt-1">
                Add stock from the Bake page after completing production batches
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {freezerStock.map((stock) => (
                  <TableRow key={stock.id} data-testid={`row-stock-${stock.id}`}>
                    <TableCell className="font-medium" data-testid={`text-product-name-${stock.id}`}>
                      {stock.product?.name ?? "Unknown Product"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleAdjust(stock.id, stock.quantity, -1)}
                          disabled={stock.quantity <= 0 || updateQuantityMutation.isPending}
                          data-testid={`button-decrease-${stock.id}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          className="w-20 text-center"
                          value={adjustments[stock.id] ?? stock.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setAdjustments((prev) => ({ ...prev, [stock.id]: value }));
                          }}
                          onBlur={() => {
                            const newQty = adjustments[stock.id];
                            if (newQty !== undefined && newQty !== stock.quantity) {
                              handleSetQuantity(stock.id, newQty);
                            }
                            setAdjustments((prev) => {
                              const { [stock.id]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newQty = adjustments[stock.id];
                              if (newQty !== undefined && newQty !== stock.quantity) {
                                handleSetQuantity(stock.id, newQty);
                              }
                              setAdjustments((prev) => {
                                const { [stock.id]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          data-testid={`input-quantity-${stock.id}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleAdjust(stock.id, stock.quantity, 1)}
                          disabled={updateQuantityMutation.isPending}
                          data-testid={`button-increase-${stock.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-date-${stock.id}`}>
                      {formatDate(stock.frozenAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate" data-testid={`text-notes-${stock.id}`}>
                      {stock.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={stock.quantity > 0 ? "default" : "secondary"}
                        data-testid={`badge-status-${stock.id}`}
                      >
                        {stock.quantity > 0 ? "In Stock" : "Empty"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
