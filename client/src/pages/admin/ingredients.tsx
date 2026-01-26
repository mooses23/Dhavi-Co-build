import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wheat, Plus, Pencil, AlertTriangle } from "lucide-react";
import type { Ingredient } from "@shared/schema";

const ingredientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  onHand: z.string().min(1, "On hand quantity is required"),
  reorderThreshold: z.string().min(1, "Reorder threshold is required"),
  costPerUnit: z.string().optional(),
});

type IngredientFormData = z.infer<typeof ingredientFormSchema>;

const units = ["oz", "lb", "kg", "g", "count", "tsp", "tbsp", "cup", "quart", "gallon"];

export default function AdminIngredients() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  const { data: ingredients, isLoading } = useQuery<Ingredient[]>({
    queryKey: ["/api/admin/ingredients"],
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

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingIngredient(null);
    form.reset();
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

  const lowStockIngredients = ingredients?.filter(
    (i) => parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Ingredients</h1>
          <p className="text-muted-foreground mt-1">Track your inventory</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-ingredient">
          <Plus className="h-4 w-4 mr-2" />
          Add Ingredient
        </Button>
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
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(ingredient)}
                        data-testid={`button-edit-${ingredient.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
    </div>
  );
}
