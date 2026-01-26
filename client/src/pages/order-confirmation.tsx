import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Order } from "@shared/schema";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  baking: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  ready: "bg-primary/10 text-gold border-primary/20",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function OrderConfirmationPage() {
  const params = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useQuery<Order & { location: { name: string }; items: any[] }>({
    queryKey: ["/api/orders", params.orderId],
    enabled: !!params.orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="py-12">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Order not found</p>
            <Link href="/order">
              <Button>Place New Order</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
              <span className="font-serif text-lg font-bold text-black">D</span>
            </div>
            <span className="font-serif text-xl tracking-wide text-gold">D'havi.co</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full gold-gradient mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-black" />
            </div>
            <CardTitle className="font-serif text-2xl">Order Confirmed!</CardTitle>
            <p className="text-muted-foreground mt-2">
              Thank you for your order. We'll notify you when it's ready for pickup.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono font-medium" data-testid="text-order-id">{order.id.slice(0, 8)}</p>
              </div>
              <Badge variant="outline" className={statusColors[order.status]} data-testid="badge-status">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>

            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gold mt-0.5" />
                <div>
                  <p className="font-medium">Pickup Location</p>
                  <p className="text-muted-foreground">{order.location?.name || "Location"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gold mt-0.5" />
                <div>
                  <p className="font-medium">Pickup Date</p>
                  <p className="text-muted-foreground">
                    {format(new Date(order.fulfillmentDate), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gold mt-0.5" />
                <div>
                  <p className="font-medium">Time Window</p>
                  <p className="text-muted-foreground capitalize">{order.fulfillmentWindow}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-3">Order Items</h3>
              <div className="space-y-2">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.product?.name || "Product"} x{item.quantity}</span>
                    <span className="font-medium">${parseFloat(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4 flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-gold">${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Payment Status:</strong> Your card has been authorized. 
                Payment will be captured when your order is approved by our team.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Link href="/order">
            <Button variant="outline" data-testid="button-new-order">
              Place Another Order
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
