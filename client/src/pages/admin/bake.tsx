import { useState, useEffect, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Timer, Plus, CalendarIcon, Play, CheckCircle, Pause, RotateCcw, ChefHat, ClipboardList } from "lucide-react";
import type { Batch, Product, Ingredient, BillOfMaterial } from "@shared/schema";

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

const TIMER_PRESETS = [
  { label: "15 min", seconds: 15 * 60 },
  { label: "20 min", seconds: 20 * 60 },
  { label: "25 min", seconds: 25 * 60 },
  { label: "30 min", seconds: 30 * 60 },
];

function BakingTimer() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            toast({
              title: "Timer Complete",
              description: "Your baking timer has finished!",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const selectPreset = (seconds: number, index: number) => {
    setTimeLeft(seconds);
    setSelectedPreset(index);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    if (timeLeft > 0) {
      setIsRunning(!isRunning);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setSelectedPreset(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Baking Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TIMER_PRESETS.map((preset, index) => (
            <Button
              key={preset.label}
              variant={selectedPreset === index ? "default" : "outline"}
              size="sm"
              onClick={() => selectPreset(preset.seconds, index)}
              data-testid={`button-timer-preset-${preset.seconds}`}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center justify-center py-6">
          <div className="text-5xl font-mono font-bold tabular-nums" data-testid="timer-display">
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <Button
            onClick={toggleTimer}
            disabled={timeLeft === 0}
            data-testid="button-timer-toggle"
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={resetTimer}
            disabled={timeLeft === 0 && !isRunning}
            data-testid="button-timer-reset"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {isRunning && (
          <div className="text-center text-sm text-muted-foreground">
            Timer is running...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface IngredientChecklistProps {
  batch: Batch & { items: any[] };
  onClose: () => void;
  onConfirmStart: () => void;
  isPending: boolean;
}

function IngredientChecklist({ batch, onClose, onConfirmStart, isPending }: IngredientChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [aggregatedIngredients, setAggregatedIngredients] = useState<
    Array<{ ingredientId: string; name: string; quantity: number; unit: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchIngredients() {
      setIsLoading(true);
      const ingredientMap: Record<string, { name: string; quantity: number; unit: string }> = {};

      for (const item of batch.items || []) {
        if (item.quantity > 0 && item.productId) {
          try {
            const response = await fetch(`/api/admin/products/${item.productId}/bom`, {
              credentials: "include",
            });
            if (response.ok) {
              const bom: (BillOfMaterial & { ingredient: Ingredient })[] = await response.json();
              for (const bomItem of bom) {
                const qty = parseFloat(bomItem.quantity) * item.quantity;
                if (ingredientMap[bomItem.ingredientId]) {
                  ingredientMap[bomItem.ingredientId].quantity += qty;
                } else {
                  ingredientMap[bomItem.ingredientId] = {
                    name: bomItem.ingredient.name,
                    quantity: qty,
                    unit: bomItem.ingredient.unit,
                  };
                }
              }
            }
          } catch (error) {
            console.error("Failed to fetch BOM for product:", item.productId);
          }
        }
      }

      const ingredients = Object.entries(ingredientMap).map(([ingredientId, data]) => ({
        ingredientId,
        ...data,
      }));
      setAggregatedIngredients(ingredients);
      setIsLoading(false);
    }

    fetchIngredients();
  }, [batch.items]);

  const toggleItem = (ingredientId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [ingredientId]: !prev[ingredientId],
    }));
  };

  const allChecked = aggregatedIngredients.length > 0 && 
    aggregatedIngredients.every((item) => checkedItems[item.ingredientId]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <ClipboardList className="h-5 w-5" />
            Ingredient Checklist
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Verify all ingredients are ready before starting the batch:
          </p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : aggregatedIngredients.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">
              No ingredients required for this batch.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {aggregatedIngredients.map((item) => (
                <div
                  key={item.ingredientId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover-elevate cursor-pointer"
                  onClick={() => toggleItem(item.ingredientId)}
                  data-testid={`ingredient-check-${item.ingredientId}`}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checkedItems[item.ingredientId] || false}
                      onCheckedChange={() => toggleItem(item.ingredientId)}
                    />
                  </div>
                  <div className="flex-1">
                    <span className={checkedItems[item.ingredientId] ? "line-through text-muted-foreground" : ""}>
                      {item.name}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {item.quantity.toFixed(2)} {item.unit}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirmStart}
            disabled={isPending || (!allChecked && aggregatedIngredients.length > 0)}
            data-testid="button-confirm-start-batch"
          >
            {isPending ? "Starting..." : "Start Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBake() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<Record<string, number>>({});
  const [checklistBatch, setChecklistBatch] = useState<(Batch & { items: any[] }) | null>(null);

  const { data: batchesResponse, isLoading } = useQuery<{ batches: (Batch & { items: any[] })[]; pagination: any } | (Batch & { items: any[] })[]>({
    queryKey: ["/api/admin/batches"],
  });

  const batches = Array.isArray(batchesResponse) ? batchesResponse : (batchesResponse?.batches || []);

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
      setChecklistBatch(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setChecklistBatch(null);
    },
  });

  const activeProducts = products?.filter((p) => p.isActive) || [];

  const onSubmit = (data: BatchFormData) => {
    createBatchMutation.mutate(data);
  };

  const handleStartBatch = (batch: Batch & { items: any[] }) => {
    setChecklistBatch(batch);
  };

  const confirmStartBatch = () => {
    if (checklistBatch) {
      updateBatchStatusMutation.mutate({ batchId: checklistBatch.id, status: "in_progress" });
    }
  };

  const inProgressBatches = batches.filter(b => b.status === "in_progress");
  const plannedBatches = batches.filter(b => b.status === "planned");
  const completedBatches = batches.filter(b => b.status === "completed").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
            <ChefHat className="h-8 w-8" />
            Bake
          </h1>
          <p className="text-muted-foreground mt-1">Your baking control center</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-batch">
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {inProgressBatches.length > 0 && (
            <Card className="border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Play className="h-5 w-5" />
                  Active Bakes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inProgressBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-orange-500/20 bg-orange-500/5 gap-4"
                      data-testid={`batch-card-${batch.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold">
                            {format(new Date(batch.batchDate), "MMM d, yyyy")}
                          </span>
                          <Badge variant="outline">{batch.shift}</Badge>
                          <Badge variant="outline" className={statusColors[batch.status]}>
                            in progress
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {batch.items?.map((item: any, index: number) => (
                            <Badge key={index} variant="secondary">
                              {item.product?.name}: {item.quantity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={() => updateBatchStatusMutation.mutate({ batchId: batch.id, status: "completed" })}
                        disabled={updateBatchStatusMutation.isPending}
                        data-testid={`button-complete-${batch.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Scheduled Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : plannedBatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No batches scheduled</p>
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    Schedule First Batch
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {plannedBatches.map((batch) => (
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
                            {batch.status}
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
                      <Button
                        onClick={() => handleStartBatch(batch)}
                        disabled={updateBatchStatusMutation.isPending}
                        data-testid={`button-start-${batch.id}`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {completedBatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-5 w-5" />
                  Recently Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {completedBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border opacity-75"
                      data-testid={`batch-card-${batch.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          {format(new Date(batch.batchDate), "MMM d, yyyy")}
                        </span>
                        <Badge variant="outline" className="text-xs">{batch.shift}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {batch.items?.slice(0, 3).map((item: any, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {item.product?.name}: {item.quantity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <BakingTimer />
        </div>
      </div>

      {checklistBatch && (
        <IngredientChecklist
          batch={checklistBatch}
          onClose={() => setChecklistBatch(null)}
          onConfirmStart={confirmStartBatch}
          isPending={updateBatchStatusMutation.isPending}
        />
      )}

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
