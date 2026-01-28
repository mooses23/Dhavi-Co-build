import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChefHat, ArrowRight } from "lucide-react";
import { format, isTomorrow } from "date-fns";
import { Link } from "wouter";
import type { Batch, Product } from "@shared/schema";

interface BakeScheduleProps {
  todayBatches: (Batch & { items: any[] })[];
  allBatches: (Batch & { items: any[] })[];
  products: Product[];
  isLoading: boolean;
}

export function BakeSchedule({ todayBatches, allBatches, products, isLoading }: BakeScheduleProps) {
  const upcomingBatches = allBatches.filter((b) => {
    const batchDate = new Date(b.batchDate);
    return isTomorrow(batchDate) && b.status !== "cancelled";
  });

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "Unknown";
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case "planned": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "in_progress": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "completed": return "bg-green-500/10 text-green-600 border-green-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Today's Bake Schedule
        </CardTitle>
        <Link href="/bakehouse/production">
          <Badge variant="outline" className="hover-elevate cursor-pointer">
            View Production
            <ArrowRight className="h-3 w-3 ml-1" />
          </Badge>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : todayBatches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No batches scheduled for today</p>
            <Link href="/bakehouse/production">
              <Button variant="outline" size="sm" className="mt-4" data-testid="button-schedule-batch">
                Schedule a Batch
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {todayBatches.map((batch) => (
              <div
                key={batch.id}
                className="p-4 rounded-lg border bg-card"
                data-testid={`batch-card-${batch.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className={getBatchStatusColor(batch.status)}>
                      {batch.status.replace("_", " ")}
                    </Badge>
                    <span className="font-medium capitalize">{batch.shift} Shift</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(batch.batchDate), "h:mm a")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {batch.items?.map((item: any) => (
                    <Badge key={item.id} variant="secondary" className="text-xs">
                      {item.quantity}x {getProductName(item.productId)}
                    </Badge>
                  ))}
                </div>
                {batch.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{batch.notes}</p>
                )}
              </div>
            ))}
            {upcomingBatches.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Tomorrow's Schedule:</p>
                {upcomingBatches.map((batch) => (
                  <div key={batch.id} className="text-sm">
                    <span className="capitalize">{batch.shift}</span> - {batch.items?.length || 0} products
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
