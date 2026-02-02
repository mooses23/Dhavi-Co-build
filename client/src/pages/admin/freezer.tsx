import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus } from "lucide-react";
import { FreezerDoor } from "@/components/FreezerDoor";
import type { Product } from "@shared/schema";

interface FreezerStock {
  productId: string;
  productName: string;
  quantity: number;
}

interface Freezer {
  id: string;
  name: string;
  createdAt: string;
  stock: FreezerStock[];
}

interface FreezersResponse {
  freezers: Freezer[];
}

export default function AdminFreezer() {
  const { toast } = useToast();
  const [openDoors, setOpenDoors] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newFreezerName, setNewFreezerName] = useState("");

  const { data: freezersData, isLoading } = useQuery<FreezersResponse>({
    queryKey: ["/api/admin/freezers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const createFreezerMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/admin/freezers", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freezers"] });
      setAddDialogOpen(false);
      setNewFreezerName("");
      toast({ title: "Freezer Created", description: "New freezer has been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const renameFreezerMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/admin/freezers/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freezers"] });
      toast({ title: "Freezer Renamed", description: "Freezer name has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFreezerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/freezers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freezers"] });
      toast({ title: "Freezer Deleted", description: "Freezer has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ freezerId, productId, quantity }: { freezerId: string; productId: string; quantity: number }) => {
      return await apiRequest("PATCH", `/api/admin/freezers/${freezerId}/stock/${productId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freezers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async ({ freezerId, productId, quantity }: { freezerId: string; productId: string; quantity: number }) => {
      return await apiRequest("POST", `/api/admin/freezers/${freezerId}/stock`, { productId, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freezers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleDoor = (freezerId: string) => {
    setOpenDoors((prev) => {
      const next = new Set(prev);
      if (next.has(freezerId)) {
        next.delete(freezerId);
      } else {
        next.add(freezerId);
      }
      return next;
    });
  };

  const closeDoor = (freezerId: string) => {
    setOpenDoors((prev) => {
      const next = new Set(prev);
      next.delete(freezerId);
      return next;
    });
  };

  const handleUpdateStock = (freezerId: string, productId: string, quantity: number) => {
    const freezer = freezersData?.freezers.find(f => f.id === freezerId);
    const existingStock = freezer?.stock.find(s => s.productId === productId);
    
    if (existingStock) {
      updateStockMutation.mutate({ freezerId, productId, quantity });
    } else {
      addStockMutation.mutate({ freezerId, productId, quantity });
    }
  };

  const handleRenameFreezer = (freezerId: string, newName: string) => {
    renameFreezerMutation.mutate({ id: freezerId, name: newName });
  };

  const handleDeleteFreezer = (freezerId: string) => {
    deleteFreezerMutation.mutate(freezerId);
    closeDoor(freezerId);
  };

  const handleCreateFreezer = () => {
    if (newFreezerName.trim()) {
      createFreezerMutation.mutate(newFreezerName.trim());
    }
  };

  const freezers = freezersData?.freezers ?? [];
  const totalItems = freezers.reduce(
    (sum, freezer) => sum + freezer.stock.reduce((s, item) => s + item.quantity, 0),
    0
  );

  const freezersWithAllProducts = freezers.map(freezer => {
    const stockMap = new Map(freezer.stock.map(s => [s.productId, s]));
    const allStock: FreezerStock[] = (products ?? []).map(product => ({
      productId: product.id,
      productName: product.name,
      quantity: stockMap.get(product.id)?.quantity ?? 0,
    }));
    return { ...freezer, stock: allStock };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-freezer-heading">
            Freezer Storage
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage bagel inventory across freezer units
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-total-count">
            {totalItems} total items
          </Badge>
          <Button
            onClick={() => setAddDialogOpen(true)}
            size="icon"
            data-testid="button-add-freezer"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-80 w-full rounded-lg" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      ) : freezers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground" data-testid="text-no-freezers">
          <div className="h-16 w-16 mx-auto mb-4 opacity-50 rounded-lg bg-gradient-to-b from-gray-200 to-gray-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
            <div className="w-2 h-10 rounded-full bg-zinc-800 dark:bg-zinc-950" />
          </div>
          <p className="text-lg font-medium">No freezers configured</p>
          <p className="text-sm mt-1">
            Add a freezer to start tracking inventory
          </p>
          <Button
            className="mt-6"
            onClick={() => setAddDialogOpen(true)}
            data-testid="button-add-first-freezer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Freezer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="freezer-grid">
          {freezersWithAllProducts.map((freezer) => (
            <FreezerDoor
              key={freezer.id}
              freezer={freezer}
              isOpen={openDoors.has(freezer.id)}
              onToggle={() => toggleDoor(freezer.id)}
              onUpdateStock={(productId, quantity) => handleUpdateStock(freezer.id, productId, quantity)}
              onRename={(newName) => handleRenameFreezer(freezer.id, newName)}
              onDelete={() => handleDeleteFreezer(freezer.id)}
              onClose={() => closeDoor(freezer.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent data-testid="dialog-add-freezer">
          <DialogHeader>
            <DialogTitle>Add New Freezer</DialogTitle>
            <DialogDescription>
              Enter a name for the new freezer unit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="freezer-name">Freezer Name</Label>
              <Input
                id="freezer-name"
                placeholder="e.g., Basement Freezer 1"
                value={newFreezerName}
                onChange={(e) => setNewFreezerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFreezerName.trim()) {
                    handleCreateFreezer();
                  }
                }}
                data-testid="input-freezer-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              data-testid="button-cancel-add"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFreezer}
              disabled={!newFreezerName.trim() || createFreezerMutation.isPending}
              data-testid="button-confirm-add"
            >
              {createFreezerMutation.isPending ? "Creating..." : "Add Freezer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
