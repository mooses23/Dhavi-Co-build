import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderId.trim()) {
      // Navigate to the order confirmation page with the entered order ID
      navigate(`/order/confirmation/${orderId.trim()}`);
    }
  };

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

      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full gold-gradient mx-auto flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-black" />
            </div>
            <CardTitle className="font-serif text-2xl">Track Your Order</CardTitle>
            <p className="text-muted-foreground mt-2">
              Enter your order ID to check the status of your delivery
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  type="text"
                  placeholder="Enter your order ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                  data-testid="input-order-id"
                />
                <p className="text-sm text-muted-foreground">
                  You can find your order ID in the confirmation email
                </p>
              </div>
              <Button type="submit" className="w-full" data-testid="button-track-submit">
                Track Order
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Link href="/order">
                <Button variant="link" data-testid="button-new-order-link">
                  Place a new order instead
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
