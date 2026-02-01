import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FreezerStock {
  productId: string;
  productName: string;
  quantity: number;
}

interface Freezer {
  id: string;
  name: string;
  stock: FreezerStock[];
}

interface FreezerDoorProps {
  freezer: Freezer;
  isOpen: boolean;
  onToggle: () => void;
  onUpdateStock: (productId: string, quantity: number) => void;
}

export function FreezerDoor({ freezer, isOpen, onToggle, onUpdateStock }: FreezerDoorProps) {
  const totalItems = freezer.stock.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col" data-testid={`freezer-container-${freezer.id}`}>
      <div className="relative h-80 w-full rounded-lg overflow-hidden bg-gradient-to-b from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-900 border border-gray-300/50 dark:border-zinc-600/50">
        <div className="absolute inset-0 p-4 flex flex-col gap-2">
          {freezer.stock.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-zinc-500">
              <span className="text-sm">Empty</span>
            </div>
          ) : (
            freezer.stock.map((item) => (
              <Card
                key={item.productId}
                className="p-3 bg-white/90 dark:bg-zinc-800/90"
                data-testid={`product-card-${freezer.id}-${item.productId}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate flex-1" data-testid={`product-name-${freezer.id}-${item.productId}`}>
                    {item.productName}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.quantity > 0) {
                          onUpdateStock(item.productId, item.quantity - 1);
                        }
                      }}
                      disabled={item.quantity <= 0}
                      data-testid={`button-decrease-${freezer.id}-${item.productId}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span
                      className="w-8 text-center text-sm font-semibold"
                      data-testid={`quantity-${freezer.id}-${item.productId}`}
                    >
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStock(item.productId, item.quantity + 1);
                      }}
                      data-testid={`button-increase-${freezer.id}-${item.productId}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div
          className={cn(
            "absolute inset-0 cursor-pointer transition-transform duration-500 ease-in-out",
            "bg-gradient-to-b from-white/60 to-gray-200/70 dark:from-zinc-700/60 dark:to-zinc-800/70",
            "backdrop-blur-md border border-gray-300/60 dark:border-zinc-600/60",
            "flex flex-col items-center justify-center",
            isOpen ? "-translate-x-full" : "translate-x-0"
          )}
          onClick={onToggle}
          data-testid={`door-panel-${freezer.id}`}
        >
          <div 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-20 rounded-full bg-zinc-900 dark:bg-zinc-950 shadow-lg"
            style={{
              boxShadow: "inset 0 2px 4px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.3)"
            }}
          />
          
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">
              {totalItems} items
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className="text-sm font-medium text-muted-foreground" data-testid={`freezer-name-${freezer.id}`}>
          {freezer.name}
        </span>
      </div>
    </div>
  );
}
