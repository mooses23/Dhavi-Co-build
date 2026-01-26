import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Factory, Plus, CalendarIcon, Play, CheckCircle, Package } from "lucide-react";
import type { Batch, Product } from "@shared/schema";

const batchFormSchema = z.object({
  batchDate: z.date({ required_error: "Batch date is required" }),
  shift: z.string().min(1, "Shift is required"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(0),
  })),
});

type BatchFormData = z.infer<typeof batchFormSchema>;

const statusColors: Record<string, string> = {
  planned: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  in_progress: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminProduction() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<Record<string, number>>({});

  const { data: batches, isLoading } = useQuery<(Batch & { items: any[] })[]>({
    queryKey: ["/api/admin/batches"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      shift: "",
      notes: "",
      items: [],
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: BatchFormData) => {
      const items = Object.entries(batchItems)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity }));
      return await apiRequest("POST", "/api/admin/batches", { ...data, items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batches"] });
      toast({ title: "Batch Created", description: "Production batch has been scheduled" });
      setIsDialogOpen(false);
      form.reset();
      setBatchItems({});
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateBatchStatusMutation = useMutation({
    mutationFn: async ({ batchId, status }: { batchId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/batches/${batchId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ingredients"] });
      toast({ title: "Batch Updated", description: "Batch status has been updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activeProducts = products?.filter((p) => p.isActive) || [];

  const onSubmit = (data: BatchFormData) => {
    createBatchMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Production</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage batch production</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-batch">
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Batches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !batches || batches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No batches scheduled</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                Schedule First Batch
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border gap-4"
                  data-testid={`batch-card-${batch.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold">
                        {format(new Date(batch.batchDate), "MMM d, yyyy")}
                      </span>
                      <Badge variant="outline">{batch.shift}</Badge>
                      <Badge variant="outline" className={statusColors[batch.status]}>
                        {batch.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {batch.notes && (
                      <p className="text-sm text-muted-foreground">{batch.notes}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {batch.items?.map((item: any, index: number) => (
                        <Badge key={index} variant="secondary">
                          {item.product?.name}: {item.quantity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {batch.status === "planned" && (
                      <Button
                        onClick={() => updateBatchStatusMutation.mutate({ batchId: batch.id, status: "in_progress" })}
                        disabled={updateBatchStatusMutation.isPending}
                        data-testid={`button-start-${batch.id}`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </Button>
                    )}
                    {batch.status === "in_progress" && (
                      <Button
                        onClick={() => updateBatchStatusMutation.mutate({ batchId: batch.id, status: "completed" })}
                        disabled={updateBatchStatusMutation.isPending}
                        data-testid={`button-complete-${batch.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Schedule New Batch</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batchDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Batch Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
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
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="afternoon">Afternoon</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Products to Bake</FormLabel>
                <div className="space-y-2 mt-2">
                  {activeProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span>{product.name}</span>
                      <Input
                        type="number"
                        min="0"
                        className="w-24"
                        value={batchItems[product.id] || 0}
                        onChange={(e) => setBatchItems(prev => ({
                          ...prev,
                          [product.id]: parseInt(e.target.value) || 0
                        }))}
                        data-testid={`input-qty-${product.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any special notes for this batch" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBatchMutation.isPending}>
                  {createBatchMutation.isPending ? "Creating..." : "Create Batch"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
