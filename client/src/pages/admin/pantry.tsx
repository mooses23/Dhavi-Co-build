import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Minus, 
  Save, 
  RotateCcw, 
  Wheat, 
  Droplets, 
  Cookie, 
  Package, 
  Leaf,
  X,
  AlertTriangle
} from "lucide-react";
import type { Ingredient } from "@shared/schema";

const units = ["oz", "lb", "kg", "g", "count", "tsp", "tbsp", "cup", "quart", "gallon"];

function getIngredientIcon(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("flour") || lowerName.includes("meal")) return Wheat;
  if (lowerName.includes("oil") || lowerName.includes("honey")) return Droplets;
  if (lowerName.includes("seed") || lowerName.includes("yeast")) return Leaf;
  if (lowerName.includes("bag") || lowerName.includes("box")) return Package;
  return Cookie;
}

interface FlipTileProps {
  ingredient: Ingredient;
  isFlipped: boolean;
  onFlip: () => void;
  onSave: (id: string, data: { onHand?: string; reorderThreshold?: string; costPerUnit?: string }) => void;
  onQuickAdjust: (id: string, amount: number) => void;
  isSaving: boolean;
}

function FlipTile({ ingredient, isFlipped, onFlip, onSave, onQuickAdjust, isSaving }: FlipTileProps) {
  const [editedQuantity, setEditedQuantity] = useState(ingredient.onHand);
  const isLowStock = parseFloat(ingredient.onHand) <= parseFloat(ingredient.reorderThreshold);
  const Icon = getIngredientIcon(ingredient.name);

  useEffect(() => {
    setEditedQuantity(ingredient.onHand);
  }, [ingredient.onHand]);

  const handleSave = () => {
    onSave(ingredient.id, { onHand: editedQuantity });
    onFlip();
  };

  const handleQuickAdjust = (amount: number) => {
    onQuickAdjust(ingredient.id, amount);
  };

  const adjustLocal = (delta: number) => {
    const current = parseFloat(editedQuantity) || 0;
    setEditedQuantity(Math.max(0, current + delta).toString());
  };

  return (
    <div 
      className="relative w-full aspect-square"
      style={{ perspective: "1000px" }}
    >
      <div
        className={`relative w-full h-full transition-all duration-500 ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className={`absolute inset-0 rounded-lg backdrop-blur-md bg-background/60 dark:bg-background/40 border border-border/50 p-4 flex flex-col items-center justify-center cursor-pointer overflow-visible hover-elevate ${
            isLowStock ? "ring-2 ring-destructive/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : ""
          }`}
          style={{ backfaceVisibility: "hidden" }}
          onClick={onFlip}
          data-testid={`tile-front-${ingredient.id}`}
        >
          {isLowStock && (
            <div className="absolute top-2 right-2">
              <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
            </div>
          )}
          <Icon className={`h-12 w-12 mb-3 ${isLowStock ? "text-destructive" : "text-gold"}`} />
          <h3 className="font-medium text-center text-sm leading-tight mb-2">{ingredient.name}</h3>
          <p className={`text-2xl font-bold ${isLowStock ? "text-destructive" : ""}`}>
            {parseFloat(ingredient.onHand).toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">{ingredient.unit}</p>
        </div>

        <div
          className="absolute inset-0 rounded-lg backdrop-blur-md bg-background/60 dark:bg-background/40 border border-border/50 p-3 flex flex-col [transform:rotateY(180deg)]"
          style={{ backfaceVisibility: "hidden" }}
          data-testid={`tile-back-${ingredient.id}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm truncate flex-1">{ingredient.name}</h4>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onFlip}
              className="h-6 w-6 flex-shrink-0"
              data-testid={`button-close-${ingredient.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 mb-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => adjustLocal(-1)}
              className="h-8 w-8"
              data-testid={`button-minus-${ingredient.id}`}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={editedQuantity}
              onChange={(e) => setEditedQuantity(e.target.value)}
              className="h-8 text-center text-lg font-bold"
              data-testid={`input-quantity-${ingredient.id}`}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => adjustLocal(1)}
              className="h-8 w-8"
              data-testid={`button-plus-${ingredient.id}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-1 mb-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => handleQuickAdjust(10)}
              className="text-xs h-7"
              data-testid={`button-add10-${ingredient.id}`}
            >
              +10
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => handleQuickAdjust(25)}
              className="text-xs h-7"
              data-testid={`button-add25-${ingredient.id}`}
            >
              +25
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => handleQuickAdjust(50)}
              className="text-xs h-7"
              data-testid={`button-add50-${ingredient.id}`}
            >
              +50
            </Button>
          </div>

          <div className="text-xs text-muted-foreground mb-1 space-y-0.5">
            <p>Reorder at: {parseFloat(ingredient.reorderThreshold).toFixed(1)} {ingredient.unit}</p>
            {ingredient.costPerUnit && (
              <p>Cost: ${parseFloat(ingredient.costPerUnit).toFixed(4)}/{ingredient.unit}</p>
            )}
          </div>

          <div className="mt-auto">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-8"
              data-testid={`button-save-${ingredient.id}`}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddNewTileProps {
  isFlipped: boolean;
  onFlip: () => void;
  onSave: (data: { name: string; unit: string; onHand: string; reorderThreshold: string; costPerUnit?: string }) => void;
  isSaving: boolean;
}

function AddNewTile({ isFlipped, onFlip, onSave, isSaving }: AddNewTileProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [onHand, setOnHand] = useState("");
  const [reorderThreshold, setReorderThreshold] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");

  const handleSave = () => {
    if (!name || !unit || !onHand || !reorderThreshold) return;
    onSave({ name, unit, onHand, reorderThreshold, costPerUnit: costPerUnit || undefined });
    setName("");
    setUnit("");
    setOnHand("");
    setReorderThreshold("");
    setCostPerUnit("");
    onFlip();
  };

  const handleCancel = () => {
    setName("");
    setUnit("");
    setOnHand("");
    setReorderThreshold("");
    setCostPerUnit("");
    onFlip();
  };

  return (
    <div 
      className="relative w-full aspect-square"
      style={{ perspective: "1000px" }}
    >
      <div
        className={`relative w-full h-full transition-all duration-500 ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0 rounded-lg backdrop-blur-md bg-background/60 dark:bg-background/40 border-2 border-dashed border-border/50 p-4 flex flex-col items-center justify-center cursor-pointer overflow-visible hover-elevate"
          style={{ backfaceVisibility: "hidden" }}
          onClick={onFlip}
          data-testid="tile-add-new-front"
        >
          <div className="rounded-full bg-primary/10 p-4 mb-3">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <p className="font-medium text-center">Add Ingredient</p>
        </div>

        <div
          className="absolute inset-0 rounded-lg backdrop-blur-md bg-background/60 dark:bg-background/40 border border-border/50 p-3 flex flex-col [transform:rotateY(180deg)] overflow-y-auto"
          style={{ backfaceVisibility: "hidden" }}
          data-testid="tile-add-new-back"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">New Ingredient</h4>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleCancel}
              className="h-6 w-6"
              data-testid="button-cancel-add"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 flex-1">
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
              data-testid="input-new-name"
            />
            <Select onValueChange={setUnit} value={unit}>
              <SelectTrigger className="h-8 text-sm" data-testid="select-new-unit">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Qty"
                type="number"
                value={onHand}
                onChange={(e) => setOnHand(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-new-quantity"
              />
              <Input
                placeholder="Reorder at"
                type="number"
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-new-reorder"
              />
            </div>
            <Input
              placeholder="Cost/unit (opt)"
              type="number"
              step="0.0001"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              className="h-8 text-sm"
              data-testid="input-new-cost"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !name || !unit || !onHand || !reorderThreshold}
            className="w-full h-8 mt-2"
            data-testid="button-save-new"
          >
            <Plus className="h-4 w-4 mr-1" />
            {isSaving ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPantry() {
  const { toast } = useToast();
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [isAddNewFlipped, setIsAddNewFlipped] = useState(false);

  const { data: ingredients, isLoading } = useQuery<Ingredient[]>({
    queryKey: ["/api/admin/ingredients"],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/ingredients/seed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ingredients"] });
      toast({ title: "Pantry Stocked", description: "Basic bakery ingredients have been added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Ingredient> }) => {
      return await apiRequest("PATCH", `/api/admin/ingredients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ingredients"] });
      toast({ title: "Updated", description: "Ingredient updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const quickAdjustMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      return await apiRequest("POST", `/api/admin/ingredients/${id}/adjust`, {
        quantity: amount,
        type: "receive",
        reason: "Quick adjustment from pantry",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ingredients"] });
      toast({ title: "Adjusted", description: "Inventory updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; unit: string; onHand: string; reorderThreshold: string; costPerUnit?: string }) => {
      return await apiRequest("POST", "/api/admin/ingredients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ingredients"] });
      toast({ title: "Added", description: "New ingredient added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFlip = (id: string) => {
    setFlippedId(flippedId === id ? null : id);
    if (isAddNewFlipped) setIsAddNewFlipped(false);
  };

  const handleAddNewFlip = () => {
    setIsAddNewFlipped(!isAddNewFlipped);
    if (flippedId) setFlippedId(null);
  };

  const handleSave = (id: string, data: { onHand?: string; reorderThreshold?: string; costPerUnit?: string }) => {
    updateMutation.mutate({ id, data });
  };

  const handleQuickAdjust = (id: string, amount: number) => {
    quickAdjustMutation.mutate({ id, amount });
  };

  const handleCreate = (data: { name: string; unit: string; onHand: string; reorderThreshold: string; costPerUnit?: string }) => {
    createMutation.mutate(data);
  };

  const lowStockCount = ingredients?.filter(
    (i) => parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
  ).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Pantry</h1>
          <p className="text-muted-foreground mt-1">
            Track your inventory
            {lowStockCount > 0 && (
              <span className="ml-2 text-destructive font-medium">
                ({lowStockCount} low stock)
              </span>
            )}
          </p>
        </div>
        {ingredients && ingredients.length === 0 && (
          <Button 
            onClick={() => seedMutation.mutate()} 
            disabled={seedMutation.isPending}
            variant="outline"
            data-testid="button-seed-pantry"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${seedMutation.isPending ? "animate-spin" : ""}`} />
            {seedMutation.isPending ? "Stocking..." : "Stock Basic Items"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {ingredients?.map((ingredient) => (
            <FlipTile
              key={ingredient.id}
              ingredient={ingredient}
              isFlipped={flippedId === ingredient.id}
              onFlip={() => handleFlip(ingredient.id)}
              onSave={handleSave}
              onQuickAdjust={handleQuickAdjust}
              isSaving={updateMutation.isPending}
            />
          ))}
          <AddNewTile
            isFlipped={isAddNewFlipped}
            onFlip={handleAddNewFlip}
            onSave={handleCreate}
            isSaving={createMutation.isPending}
          />
        </div>
      )}

      {ingredients && ingredients.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <Wheat className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg mb-2">Your pantry is empty</p>
          <p className="text-sm mb-4">Click "Stock Basic Items" to add common bakery ingredients, or add your own!</p>
        </div>
      )}
    </div>
  );
}
