import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat, CheckCircle } from "lucide-react";
import type { Order, Batch } from "@shared/schema";

interface QuickActionsProps {
  pendingOrders: Order[];
  todayBatches: (Batch & { items: any[] })[];
  onApproveOrder: (orderId: string) => void;
  onUpdateBatch: (batchId: string, status: string) => void;
  isApproving: boolean;
  isUpdatingBatch: boolean;
}

export function QuickActions({
  pendingOrders,
  todayBatches,
  onApproveOrder,
  onUpdateBatch,
  isApproving,
  isUpdatingBatch,
}: QuickActionsProps) {
  const plannedBatches = todayBatches.filter(b => b.status === "planned");
  const inProgressBatches = todayBatches.filter(b => b.status === "in_progress");

  if (pendingOrders.length === 0 && plannedBatches.length === 0 && inProgressBatches.length === 0) {
    return null;
  }

  return (
    <Card className="border-gold/20 bg-gold/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-gold" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {pendingOrders.length > 0 && (
          <Button
            onClick={() => {
              if (pendingOrders[0]) {
                onApproveOrder(pendingOrders[0].id);
              }
            }}
            disabled={isApproving}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-approve-next"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve Next Order ({pendingOrders.length} pending)
          </Button>
        )}
        {plannedBatches.map((batch) => (
          <Button
            key={batch.id}
            variant="outline"
            onClick={() => onUpdateBatch(batch.id, "in_progress")}
            disabled={isUpdatingBatch}
            data-testid={`button-start-batch-${batch.id}`}
          >
            <ChefHat className="h-4 w-4 mr-2" />
            Start {batch.shift} Batch
          </Button>
        ))}
        {inProgressBatches.map((batch) => (
          <Button
            key={batch.id}
            variant="default"
            onClick={() => onUpdateBatch(batch.id, "completed")}
            disabled={isUpdatingBatch}
            className="bg-gold hover:bg-gold/90 text-black"
            data-testid={`button-complete-batch-${batch.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete {batch.shift} Batch
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
