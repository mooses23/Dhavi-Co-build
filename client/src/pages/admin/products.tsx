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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Plus, Pencil, Copy, Trash2 } from "lucide-react";
import { insertProductSchema } from "@shared/schema";
import type { Product, Ingredient } from "@shared/schema";

const productFormSchema = insertProductSchema.extend({
  name: z.string().min(1, "Name is required"),
  price: z.string().min(1, "Price is required"),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function AdminProducts() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [bomItems, setBomItems] = useState<Record<string, string>>({});

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: ingredients } = useQuery<Ingredient[]>({
    queryKey: ["/api/admin/ingredients"],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      isActive: true,
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData & { bom: { ingredientId: string; quantity: number }[] }) => {
      if (editingProduct) {
        return await apiRequest("PATCH", `/api/admin/products/${editingProduct.id}`, data);
      }
      return await apiRequest("POST", "/api/admin/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: editingProduct ? "Product Updated" : "Product Created" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return await apiRequest("DELETE", `/api/admin/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "Product Deleted" });
      setDeleteProduct(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    form.reset();
    setBomItems({});
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      imageUrl: product.imageUrl || "",
      isActive: product.isActive,
    });
    setIsDialogOpen(true);
  };

  const duplicateProduct = (product: Product) => {
    setEditingProduct(null);
    form.reset({
      name: `${product.name} (Copy)`,
      description: product.description || "",
      price: product.price,
      imageUrl: product.imageUrl || "",
      isActive: false,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: ProductFormData) => {
    const bom = Object.entries(bomItems)
      .filter(([_, qty]) => parseFloat(qty) > 0)
      .map(([ingredientId, quantity]) => ({ ingredientId, quantity: parseFloat(quantity) }));
    createProductMutation.mutate({ ...data, bom });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-products-heading">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your bagel menu</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-product">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Catalog
            {products && <Badge variant="secondary" className="ml-2" data-testid="badge-product-count">{products.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-products">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No products yet</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-product">
                Add First Product
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden" data-testid={`product-card-${product.id}`}>
                  {product.imageUrl && (
                    <div className="h-32 overflow-hidden bg-muted">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        data-testid={`img-product-${product.id}`}
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-product-description-${product.id}`}>
                          {product.description || "No description"}
                        </p>
                      </div>
                      {!product.isActive && (
                        <Badge variant="secondary" className="ml-2 shrink-0" data-testid={`badge-inactive-${product.id}`}>Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-serif text-xl text-gold font-semibold" data-testid={`text-product-price-${product.id}`}>
                        ${parseFloat(product.price).toFixed(2)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateProduct(product)}
                          title="Duplicate"
                          data-testid={`button-duplicate-${product.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteProduct(product)}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif" data-testid="text-product-dialog-title">
              {editingProduct ? "Edit Product" : "Add New Product"}
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
                      <Input {...field} placeholder="Plain Spelt Bagel" data-testid="input-product-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Classic plain bagel made with organic spelt flour" data-testid="input-product-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="3.50" data-testid="input-product-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="/images/bagel.jpeg" data-testid="input-product-image-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <FormLabel className="mb-0">Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Available for ordering</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-product-active" />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!editingProduct && ingredients && ingredients.length > 0 && (
                <div>
                  <FormLabel>Bill of Materials (per bagel)</FormLabel>
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                    {ingredients.map((ingredient) => (
                      <div key={ingredient.id} className="flex items-center justify-between p-2 rounded border border-border">
                        <span className="text-sm">{ingredient.name} ({ingredient.unit})</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24"
                          placeholder="0"
                          value={bomItems[ingredient.id] || ""}
                          onChange={(e) => setBomItems(prev => ({
                            ...prev,
                            [ingredient.id]: e.target.value
                          }))}
                          data-testid={`input-bom-${ingredient.id}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel-product">
                  Cancel
                </Button>
                <Button type="submit" disabled={createProductMutation.isPending} data-testid="button-submit-product">
                  {createProductMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-dialog-description">
              Are you sure you want to delete "{deleteProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProduct && deleteProductMutation.mutate(deleteProduct.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
