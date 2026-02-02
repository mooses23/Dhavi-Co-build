import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Minus, Plus, MoreVertical, Pencil, Trash2, X } from "lucide-react";
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
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onClose?: () => void;
}

export function FreezerDoor({ 
  freezer, 
  isOpen, 
  onToggle, 
  onUpdateStock,
  onRename,
  onDelete,
  onClose
}: FreezerDoorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(freezer.name);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const totalItems = freezer.stock.reduce((sum, item) => sum + item.quantity, 0);

  const handleRename = () => {
    if (editName.trim() && onRename) {
      onRename(editName.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setEditName(freezer.name);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    if (editName.trim()) {
      handleRename();
    } else {
      setEditName(freezer.name);
      setIsEditing(false);
    }
  };

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

        {isOpen && onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            data-testid={`button-close-door-${freezer.id}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="h-7 text-sm text-center w-32"
              autoFocus
              data-testid={`input-rename-${freezer.id}`}
            />
          </div>
        ) : (
          <>
            <span className="text-sm font-medium text-muted-foreground" data-testid={`freezer-name-${freezer.id}`}>
              {freezer.name}
            </span>
            {(onRename || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    data-testid={`button-freezer-menu-${freezer.id}`}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {onRename && (
                    <DropdownMenuItem 
                      onClick={() => setIsEditing(true)}
                      data-testid={`menu-rename-${freezer.id}`}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                        data-testid={`menu-delete-${freezer.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Freezer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{freezer.name}"? 
              {totalItems > 0 && " This freezer still has items in it."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`button-cancel-delete-${freezer.id}`}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid={`button-confirm-delete-${freezer.id}`}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
