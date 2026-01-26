import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order/confirmation/${orderId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "requires_capture") {
      toast({
        title: "Payment Authorized!",
        description: "Your order has been placed successfully.",
      });
      navigate(`/order/confirmation/${orderId}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement />
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!stripe || isProcessing}
            data-testid="button-pay"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Authorize Payment"
            )}
          </Button>
        </CardFooter>
      </Card>
      <p className="text-sm text-muted-foreground text-center mt-4">
        Your card will be authorized but not charged until your order is approved.
      </p>
    </form>
  );
}

export default function CheckoutPage() {
  const params = useParams<{ orderId: string }>();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const clientSecret = searchParams.get("secret");

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Invalid checkout session</p>
            <Link href="/order">
              <Button>Start New Order</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#d4a017",
        colorBackground: "#0f0e0d",
        colorText: "#f5f0e8",
        colorDanger: "#ef4444",
        borderRadius: "8px",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/order" className="flex items-center gap-2">
            <Button variant="ghost" size="icon" data-testid="button-back-checkout">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
                <span className="font-serif text-lg font-bold text-black">D</span>
              </div>
              <span className="font-serif text-xl tracking-wide text-gold">D'havi.co</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold">Complete Your Order</h1>
          <p className="text-muted-foreground mt-2">
            Enter your payment details to complete the order
          </p>
        </div>

        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm orderId={params.orderId || ""} />
        </Elements>
      </main>
    </div>
  );
}
