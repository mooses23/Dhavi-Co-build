import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarIcon, MapPin, Minus, Plus, ShoppingBag } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const orderFormSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().min(5, "Street address is required"),
  deliveryCity: z.string().min(2, "City is required"),
  deliveryState: z.string().min(2, "State is required"),
  deliveryZip: z.string().min(5, "Valid zip code is required"),
  deliveryInstructions: z.string().optional(),
  fulfillmentDate: z.date({ required_error: "Please select a delivery date" }),
  fulfillmentWindow: z.string().min(1, "Please select a delivery window"),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

export default function OrderPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [cart, setCart] = useState<Record<string, number>>({});

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery<Record<string, number>>({
    queryKey: ["/api/freezer/availability"],
  });

  const getAvailableStock = (productId: string): number => {
    return availability?.[productId] ?? 0;
  };

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      deliveryAddress: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryInstructions: "",
      fulfillmentWindow: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormData & { items: { productId: string; quantity: number }[] }) => {
      const response = await apiRequest("POST", "/api/orders", data);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Order Created!",
        description: "Redirecting to payment...",
      });
      if (data.clientSecret) {
        navigate(`/checkout/${data.orderId}?secret=${data.clientSecret}`);
      } else {
        navigate(`/order/confirmation/${data.orderId}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const updateQuantity = (productId: string, delta: number) => {
    const maxAvailable = getAvailableStock(productId);
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(current + delta, maxAvailable));
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const cartItems = Object.entries(cart).filter(([_, qty]) => qty > 0);
  const subtotal = cartItems.reduce((sum, [productId, qty]) => {
    const product = products?.find((p) => p.id === productId);
    return sum + (product ? parseFloat(product.price) * qty : 0);
  }, 0);

  const onSubmit = (data: OrderFormData) => {
    if (cartItems.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add some bagels to your order",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      ...data,
      items: cartItems.map(([productId, quantity]) => ({ productId, quantity })),
    });
  };

  const activeProducts = products?.filter((p) => p.isActive) || [];

  const minDate = addDays(new Date(), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md gold-gradient flex items-center justify-center">
                  <span className="font-serif text-lg font-bold text-black">D</span>
                </div>
                <span className="font-serif text-xl tracking-wide text-gold">D'havi.co</span>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium" data-testid="text-cart-count">
                {cartItems.reduce((sum, [_, qty]) => sum + qty, 0)} items
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold">Order Fresh Bagels</h1>
          <p className="text-muted-foreground mt-2">
            Select your bagels and enter your delivery address
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="font-serif text-xl font-semibold mb-4">Select Bagels</h2>
              {productsLoading || availabilityLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {activeProducts.map((product) => {
                    const stock = getAvailableStock(product.id);
                    const isOutOfStock = stock === 0;
                    const currentQty = cart[product.id] || 0;
                    const canAddMore = currentQty < stock;

                    return (
                      <Card 
                        key={product.id} 
                        className={`overflow-hidden ${isOutOfStock ? 'opacity-60' : ''}`} 
                        data-testid={`card-product-${product.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">{product.description}</p>
                              {isOutOfStock ? (
                                <span className="text-sm font-medium text-destructive" data-testid={`text-stock-${product.id}`}>
                                  Out of Stock
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground" data-testid={`text-stock-${product.id}`}>
                                  {stock} available
                                </span>
                              )}
                            </div>
                            <span className="font-serif text-lg text-gold font-semibold">
                              ${parseFloat(product.price).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(product.id, -1)}
                              disabled={!cart[product.id] || isOutOfStock}
                              data-testid={`button-minus-${product.id}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium" data-testid={`text-qty-${product.id}`}>
                              {cart[product.id] || 0}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(product.id, 1)}
                              disabled={isOutOfStock || !canAddMore}
                              data-testid={`button-plus-${product.id}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              {!productsLoading && activeProducts.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No products available right now</p>
                  </CardContent>
                </Card>
              )}
            </section>

            <section>
              <h2 className="font-serif text-xl font-semibold mb-4">Delivery Details</h2>
              <Card>
                <CardContent className="p-6">
                  <Form {...form}>
                    <form className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" {...field} data-testid="input-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="your@email.com" {...field} data-testid="input-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (optional)</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="(555) 123-4567" {...field} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="pt-2 pb-1 flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-4 w-4 text-gold" />
                        <span>Delivery Address</span>
                      </div>

                      <FormField
                        control={form.control}
                        name="deliveryAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street, Apt 4B" {...field} data-testid="input-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="deliveryCity"
                          render={({ field }) => (
                            <FormItem className="col-span-2 sm:col-span-1">
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="Brooklyn" {...field} data-testid="input-city" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="deliveryState"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input placeholder="NY" {...field} data-testid="input-state" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="deliveryZip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input placeholder="11201" {...field} data-testid="input-zip" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="deliveryInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Instructions (optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Gate code, buzzer number, leave at door, etc." 
                                className="resize-none"
                                {...field} 
                                data-testid="input-instructions" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fulfillmentDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Delivery Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal"
                                      data-testid="button-date"
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < minDate}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fulfillmentWindow"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Window</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-time">
                                    <SelectValue placeholder="Select time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="morning">Morning (8am - 12pm)</SelectItem>
                                  <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                                  <SelectItem value="evening">Evening (5pm - 8pm)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Your cart is empty
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {cartItems.map(([productId, qty]) => {
                        const product = products?.find((p) => p.id === productId);
                        if (!product) return null;
                        return (
                          <div key={productId} className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{product.name}</span>
                              <span className="text-muted-foreground ml-2">x{qty}</span>
                            </div>
                            <span className="font-medium">
                              ${(parseFloat(product.price) * qty).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-gold" data-testid="text-total">${subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={createOrderMutation.isPending || cartItems.length === 0}
                    data-testid="button-submit-order"
                  >
                    {createOrderMutation.isPending ? "Processing..." : "Continue to Payment"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
