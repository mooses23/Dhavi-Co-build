import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import type { Order } from "@shared/schema";

interface PendingOrdersPanelProps {
  pendingOrders: Order[];
  isLoading: boolean;
  onApproveOrder: (orderId: string) => void;
  isApproving: boolean;
}

export function PendingOrdersPanel({
  pendingOrders,
  isLoading,
  onApproveOrder,
  isApproving,
}: PendingOrdersPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif">Pending Orders</CardTitle>
        <Link href="/bakehouse/orders">
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
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No pending orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                data-testid={`order-row-${order.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.fulfillmentDate), "MMM d")} - {order.fulfillmentWindow}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-gold">${parseFloat(order.total).toFixed(2)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onApproveOrder(order.id)}
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid={`button-approve-${order.id}`}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
