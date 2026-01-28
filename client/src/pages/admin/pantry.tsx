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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wheat, Plus, Pencil, AlertTriangle, History, Package, Trash2, Wrench, Factory } from "lucide-react";
import type { Ingredient, InventoryAdjustment } from "@shared/schema";

const ingredientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  onHand: z.string().min(1, "On hand quantity is required"),
  reorderThreshold: z.string().min(1, "Reorder threshold is required"),
  costPerUnit: z.string().optional(),
});

type IngredientFormData = z.infer<typeof ingredientFormSchema>;

const adjustmentFormSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  adjustmentType: z.enum(["receive", "waste", "correction", "production"]),
  quantity: z.number(),
  reason: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentFormSchema>;

const units = ["oz", "lb", "kg", "g", "count", "tsp", "tbsp", "cup", "quart", "gallon"];

const adjustmentTypeConfig: Record<string, { color: string; icon: any; label: string }> = {
  receive: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Package, label: "Received" },
  waste: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: Trash2, label: "Waste" },
  correction: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Wrench, label: "Correction" },
  production: { color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Factory, label: "Production" },
};

export default function AdminPantry() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [selectedIngredientForHistory, setSelectedIngredientForHistory] = useState<Ingredient | null>(null);

  const { data: ingredients, isLoading } = useQuery<Ingredient[]>({
    queryKey: ["/api/admin/ingredients"],
  });

  const { data: adjustments, isLoading: adjustmentsLoading } = useQuery<(InventoryAdjustment & { ingredient: Ingredient })[]>({
    queryKey: ["/api/admin/inventory-adjustments", selectedIngredientForHistory?.id],
    enabled: !!selectedIngredientForHistory,
  });

  const form = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientFormSchema),
    defaultValues: {
      name: "",
      unit: "",
      onHand: "",
      reorderThreshold: "",
      costPerUnit: "",
    },
  });

  const adjustmentForm = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      ingredientId: "",
      adjustmentType: "receive",
      quantity: 0,
      reason: "",
    },
  });

  const createIngredientMutation = useMutation({
    mutationFn: async (data: IngredientFormData) => {
      if (editingIngredient) {
        return await apiRequest("PATCH", `/api/admin/ingredients/${editingIngredient.id}`, data);
      }
      return await apiRequest("POST", "/api/admin/ingredients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ingredients"] });
      toast({ title: editingIngredient ? "Ingredient Updated" : "Ingredient Added" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      return await apiRequest("POST", "/api/admin/inventory-adjustments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inventory-adjustments"] });
      toast({ title: "Adjustment Recorded", description: "Inventory has been updated" });
      closeAdjustmentDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingIngredient(null);
    form.reset();
  };

  const closeAdjustmentDialog = () => {
    setIsAdjustmentDialogOpen(false);
    adjustmentForm.reset();
  };

  const openAdjustmentDialog = (ingredient?: Ingredient) => {
    if (ingredient) {
      adjustmentForm.setValue("ingredientId", ingredient.id);
    }
    setIsAdjustmentDialogOpen(true);
  };

  const openHistoryDialog = (ingredient: Ingredient) => {
    setSelectedIngredientForHistory(ingredient);
    setIsHistoryDialogOpen(true);
  };

  const closeHistoryDialog = () => {
    setIsHistoryDialogOpen(false);
    setSelectedIngredientForHistory(null);
  };

  const openEditDialog = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    form.reset({
      name: ingredient.name,
      unit: ingredient.unit,
      onHand: ingredient.onHand,
      reorderThreshold: ingredient.reorderThreshold,
      costPerUnit: ingredient.costPerUnit || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: IngredientFormData) => {
    createIngredientMutation.mutate(data);
  };

  const onAdjustmentSubmit = (data: AdjustmentFormData) => {
    createAdjustmentMutation.mutate(data);
  };

  const filteredAdjustments = selectedIngredientForHistory
    ? adjustments?.filter(a => a.ingredientId === selectedIngredientForHistory.id) || []
    : [];

  const lowStockIngredients = ingredients?.filter(
    (i) => parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Pantry</h1>
          <p className="text-muted-foreground mt-1">Track your inventory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openAdjustmentDialog()} data-testid="button-record-adjustment">
            <History className="h-4 w-4 mr-2" />
            Record Adjustment
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-ingredient">
            <Plus className="h-4 w-4 mr-2" />
            Add Ingredient
          </Button>
        </div>
      </div>

      {lowStockIngredients.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockIngredients.map((ingredient) => (
                <Badge
                  key={ingredient.id}
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20"
                >
                  {ingredient.name}: {parseFloat(ingredient.onHand).toFixed(1)} {ingredient.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5" />
            Ingredient Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !ingredients || ingredients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wheat className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No ingredients yet</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                Add First Ingredient
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {ingredients.map((ingredient) => {
                const isLowStock = parseFloat(ingredient.onHand) <= parseFloat(ingredient.reorderThreshold);
                return (
                  <div
                    key={ingredient.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isLowStock ? "border-destructive/50 bg-destructive/5" : "border-border"
                    }`}
                    data-testid={`ingredient-row-${ingredient.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      <div>
                        <p className="font-medium">{ingredient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Reorder at {parseFloat(ingredient.reorderThreshold).toFixed(1)} {ingredient.unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-semibold ${isLowStock ? "text-destructive" : ""}`}>
                          {parseFloat(ingredient.onHand).toFixed(1)} {ingredient.unit}
                        </p>
                        {ingredient.costPerUnit && (
                          <p className="text-xs text-muted-foreground">
                            ${parseFloat(ingredient.costPerUnit).toFixed(4)}/{ingredient.unit}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openAdjustmentDialog(ingredient)}
                          data-testid={`button-adjust-${ingredient.id}`}
                          title="Adjust inventory"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openHistoryDialog(ingredient)}
                          data-testid={`button-history-${ingredient.id}`}
                          title="View history"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(ingredient)}
                          data-testid={`button-edit-${ingredient.id}`}
                          title="Edit ingredient"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingIngredient ? "Edit Ingredient" : "Add New Ingredient"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Spelt Flour" data-testid="input-ingredient-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="onHand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>On Hand</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="50" data-testid="input-on-hand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reorderThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder At</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="10" data-testid="input-reorder" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="costPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per Unit (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.0001" placeholder="0.05" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createIngredientMutation.isPending}>
                  {createIngredientMutation.isPending ? "Saving..." : editingIngredient ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdjustmentDialogOpen} onOpenChange={closeAdjustmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Record Inventory Adjustment</DialogTitle>
          </DialogHeader>
          <Form {...adjustmentForm}>
            <form onSubmit={adjustmentForm.handleSubmit(onAdjustmentSubmit)} className="space-y-4">
              <FormField
                control={adjustmentForm.control}
                name="ingredientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingredient</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-adjustment-ingredient">
                          <SelectValue placeholder="Select ingredient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ingredients?.map((ingredient) => (
                          <SelectItem key={ingredient.id} value={ingredient.id}>
                            {ingredient.name} ({parseFloat(ingredient.onHand).toFixed(1)} {ingredient.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={adjustmentForm.control}
                name="adjustmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-adjustment-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="receive">Receive (Add inventory)</SelectItem>
                        <SelectItem value="waste">Waste (Remove - spoilage/damage)</SelectItem>
                        <SelectItem value="correction">Correction (Adjust count)</SelectItem>
                        <SelectItem value="production">Production (Used in production)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={adjustmentForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantity Change 
                      <span className="text-muted-foreground text-xs ml-1">
                        (positive to add, negative to remove)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="10 or -5" 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ""}
                        data-testid="input-adjustment-quantity" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={adjustmentForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Received from supplier / Expired / Count correction" 
                        className="resize-none"
                        data-testid="input-adjustment-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeAdjustmentDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAdjustmentMutation.isPending}>
                  {createAdjustmentMutation.isPending ? "Saving..." : "Record Adjustment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryDialogOpen} onOpenChange={closeHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <History className="h-5 w-5" />
              {selectedIngredientForHistory?.name} History
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {adjustmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredAdjustments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No adjustments recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAdjustments.map((adjustment) => {
                  const config = adjustmentTypeConfig[adjustment.adjustmentType];
                  const AdjustIcon = config?.icon || History;
                  const quantityNum = parseFloat(adjustment.quantity);
                  return (
                    <div
                      key={adjustment.id}
                      className="p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className={config?.color || ""}>
                          <AdjustIcon className="h-3 w-3 mr-1" />
                          {config?.label || adjustment.adjustmentType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(adjustment.createdAt!), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {parseFloat(adjustment.previousQuantity).toFixed(1)} 
                          <span className="text-muted-foreground mx-1">→</span>
                          {parseFloat(adjustment.newQuantity).toFixed(1)} {selectedIngredientForHistory?.unit}
                        </span>
                        <span className={`font-medium ${quantityNum >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {quantityNum >= 0 ? "+" : ""}{quantityNum.toFixed(1)}
                        </span>
                      </div>
                      {adjustment.reason && (
                        <p className="text-xs text-muted-foreground mt-1">{adjustment.reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
