import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, AlertCircle } from "lucide-react";
import type { Product } from "@shared/schema";

export default function AdminMarketing() {
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const productsWithoutImages = products?.filter((p) => !p.imageUrl) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Marketing</h1>
        <p className="text-muted-foreground mt-1">Manage brand assets and imagery</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Missing Product Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : productsWithoutImages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All products have images</p>
              </div>
            ) : (
              <div className="space-y-3">
                {productsWithoutImages.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-orange-500/20 bg-orange-500/5"
                  >
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                      No Image
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Brand Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Color Palette</h4>
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg gold-gradient" />
                  <span className="text-xs text-muted-foreground">Gold</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-[#0f0e0d]" />
                  <span className="text-xs text-muted-foreground">Black</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-[#f5f0e8]" />
                  <span className="text-xs text-muted-foreground">Cream</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Typography</h4>
              <p className="font-serif text-2xl mb-1">Playfair Display</p>
              <p className="text-sm text-muted-foreground">Headlines & branding</p>
              <p className="font-sans mt-3 mb-1">Inter</p>
              <p className="text-sm text-muted-foreground">Body text & UI</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Brand Voice</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Premium & artisanal</li>
                <li>Honest & authentic</li>
                <li>Warm & welcoming</li>
                <li>Craft-focused</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
