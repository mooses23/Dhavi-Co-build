import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wheat, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Ingredient } from "@shared/schema";

interface LowStockAlertsProps {
  lowStockIngredients: Ingredient[];
  isLoading: boolean;
}

export function LowStockAlerts({ lowStockIngredients, isLoading }: LowStockAlertsProps) {
  return (
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
        {isLoading ? (
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
  );
}
