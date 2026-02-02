import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Timer, Play, Pause, RotateCcw, CheckCircle, ChefHat, 
  Snowflake, Package, Flame, Clock, StickyNote,
  ThermometerSun, Eye
} from "lucide-react";
import { format } from "date-fns";
import type { Product, Ingredient, BillOfMaterial, Order } from "@shared/schema";
import bagelTileImage from "../../assets/images/bagel-tile.jpg";

const BAKE_STEPS = [
  { id: "gather", name: "Gather Ingredients", hasTimer: false, hint: "Check all ingredients are available and fresh" },
  { id: "prep", name: "Prep", hasTimer: false, hint: "Measure and prepare all ingredients" },
  { id: "dough", name: "Make Dough", hasTimer: false, hint: "Mix until smooth and elastic" },
  { id: "rise", name: "Rise Dough", hasTimer: true, defaultMinutes: 90, hint: "Cover and let rise until doubled" },
  { id: "shape", name: "Shape", hasTimer: false, hint: "Form bagel rings, uniform size" },
  { id: "boil", name: "Boil", hasTimer: true, defaultMinutes: 2, hint: "Water at 212°F - 1 min each side" },
  { id: "toppings", name: "Apply Toppings", hasTimer: false, hint: "Seeds, everything mix, etc." },
  { id: "bake", name: "Bake", hasTimer: true, defaultMinutes: 20, hint: "Oven at 450°F until golden" },
  { id: "cool", name: "Cool", hasTimer: true, defaultMinutes: 15, hint: "Rest on rack before storing" },
  { id: "cleaning", name: "Cleaning", hasTimer: false, hint: "Clean equipment and workspace" },
];

interface BakeSession {
  productId: string;
  productName: string;
  quantity: number;
  startedAt: Date;
  completedSteps: string[];
  stepNotes: Record<string, string>;
  stepTimers: Record<string, { running: boolean; timeLeft: number; totalTime: number }>;
}

const STORAGE_KEY = "dhavi-bake-session";

function loadSession(): BakeSession | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.startedAt = new Date(parsed.startedAt);
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load session", e);
  }
  return null;
}

function saveSession(session: BakeSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

interface BagelCardProps {
  product: Product;
  onViewRecipe: (product: Product) => void;
  onBake: (product: Product) => void;
}

function BagelCard({ product, onViewRecipe, onBake }: BagelCardProps) {
  return (
    <Card 
      className="overflow-hidden"
      data-testid={`card-${product.id}`}
    >
      <div className="flex aspect-[16/9]">
        <div className="w-1/2 relative">
          <img
            src={product.imageUrl || bagelTileImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-1/2 p-4 flex flex-col justify-center">
          <h3 className="font-serif text-xl font-bold mb-4">{product.name}</h3>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => onViewRecipe(product)}
              data-testid={`button-view-recipe-${product.id}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Recipe
            </Button>
            <Button
              onClick={() => onBake(product)}
              data-testid={`button-bake-${product.id}`}
            >
              <Flame className="h-4 w-4 mr-2" />
              Bake
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface RecipeModalProps {
  product: Product;
  onClose: () => void;
}

function RecipeModal({ product, onClose }: RecipeModalProps) {
  const { data: bom, isLoading } = useQuery<(BillOfMaterial & { ingredient: Ingredient })[]>({
    queryKey: ["/api/admin/products", product.id, "bom"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/products/${product.id}/bom`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch BOM");
      return response.json();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{product.name} Recipe</DialogTitle>
          <DialogDescription>Ingredients needed for this bagel</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading ingredients...</p>
          ) : bom && bom.length > 0 ? (
            <div className="space-y-2">
              {bom.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <span className="font-medium">{item.ingredient.name}</span>
                  <Badge variant="secondary">
                    {parseFloat(item.quantity).toFixed(2)} {item.ingredient.unit}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No ingredients defined for this product</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ClockWidgetProps {
  activeTimerStep: string | null;
  stepTimers: Record<string, { running: boolean; timeLeft: number; totalTime: number }>;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

function ClockWidget({ activeTimerStep, stepTimers, onStart, onPause, onReset }: ClockWidgetProps) {
  const activeTimer = activeTimerStep ? stepTimers[activeTimerStep] : null;
  const activeStep = activeTimerStep ? BAKE_STEPS.find(s => s.id === activeTimerStep) : null;
  
  const timeLeft = activeTimer?.timeLeft ?? 0;
  const totalTime = activeTimer?.totalTime ?? 1;
  const isRunning = activeTimer?.running ?? false;
  
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl border border-border"
      data-testid="clock-widget"
    >
      <div className="relative w-48 h-48 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={isRunning ? "text-orange-500 transition-all duration-1000" : "text-primary transition-all duration-300"}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {activeTimerStep ? (
            <>
              <div className="font-mono text-4xl font-bold tabular-nums">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{activeStep?.name}</div>
            </>
          ) : (
            <div className="text-center text-muted-foreground px-4">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a timer below</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        {isRunning ? (
          <Button size="lg" variant="outline" onClick={onPause} disabled={!activeTimerStep}>
            <Pause className="h-5 w-5 mr-2" />
            Pause
          </Button>
        ) : (
          <Button size="lg" onClick={onStart} disabled={!activeTimerStep || timeLeft === 0}>
            <Play className="h-5 w-5 mr-2" />
            Start
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={onReset} disabled={!activeTimerStep}>
          <RotateCcw className="h-5 w-5 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}

interface BakeChecklistProps {
  session: BakeSession;
  onUpdateSession: (session: BakeSession) => void;
  onComplete: () => void;
  scaledIngredients: Array<{ name: string; quantity: number; unit: string }>;
}

function BakeChecklist({ session, onUpdateSession, onComplete, scaledIngredients }: BakeChecklistProps) {
  const { toast } = useToast();
  const audioContextRef = useRef<AudioContext | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [activeTimerStep, setActiveTimerStep] = useState<string | null>(null);

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log("Audio play failed:", e);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      let updated = false;
      const newTimers = { ...session.stepTimers };
      
      for (const stepId of Object.keys(newTimers)) {
        const timer = newTimers[stepId];
        if (timer.running && timer.timeLeft > 0) {
          timer.timeLeft -= 1;
          updated = true;
          
          if (timer.timeLeft === 0) {
            timer.running = false;
            toast({
              title: "Timer Complete!",
              description: `${BAKE_STEPS.find(s => s.id === stepId)?.name} timer finished`,
            });
            playBeep();
          }
        }
      }
      
      if (updated) {
        onUpdateSession({ ...session, stepTimers: newTimers });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, onUpdateSession, toast]);

  const toggleStep = (stepId: string) => {
    const completed = session.completedSteps.includes(stepId);
    const newCompleted = completed
      ? session.completedSteps.filter(s => s !== stepId)
      : [...session.completedSteps, stepId];
    onUpdateSession({ ...session, completedSteps: newCompleted });
  };

  const updateNote = (stepId: string, note: string) => {
    onUpdateSession({
      ...session,
      stepNotes: { ...session.stepNotes, [stepId]: note },
    });
  };

  const startActiveTimer = () => {
    if (!activeTimerStep) return;
    const newTimers = { ...session.stepTimers };
    if (newTimers[activeTimerStep]) {
      newTimers[activeTimerStep].running = true;
    }
    onUpdateSession({ ...session, stepTimers: newTimers });
  };

  const pauseActiveTimer = () => {
    if (!activeTimerStep) return;
    const newTimers = { ...session.stepTimers };
    if (newTimers[activeTimerStep]) {
      newTimers[activeTimerStep].running = false;
    }
    onUpdateSession({ ...session, stepTimers: newTimers });
  };

  const resetActiveTimer = () => {
    if (!activeTimerStep) return;
    const step = BAKE_STEPS.find(s => s.id === activeTimerStep);
    const newTimers = { ...session.stepTimers };
    if (newTimers[activeTimerStep] && step?.defaultMinutes) {
      newTimers[activeTimerStep] = {
        running: false,
        timeLeft: step.defaultMinutes * 60,
        totalTime: step.defaultMinutes * 60,
      };
    }
    onUpdateSession({ ...session, stepTimers: newTimers });
  };

  const selectTimer = (stepId: string) => {
    setActiveTimerStep(stepId);
  };

  const completedCount = session.completedSteps.length;
  const progressPercent = (completedCount / BAKE_STEPS.length) * 100;
  const allComplete = completedCount === BAKE_STEPS.length;

  return (
    <Card className="border-orange-500/30" data-testid="bake-checklist">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
              <ChefHat className="h-6 w-6" />
              {session.productName}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-muted-foreground">
              <Badge variant="secondary">{session.quantity} bagels</Badge>
              <span className="text-sm">Started {format(session.startedAt, "h:mm a")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="font-bold">{completedCount}/{BAKE_STEPS.length}</div>
            </div>
            <div className="w-24">
              <Progress value={progressPercent} className="h-3" />
            </div>
          </div>
        </div>

        <ClockWidget
          activeTimerStep={activeTimerStep}
          stepTimers={session.stepTimers}
          onStart={startActiveTimer}
          onPause={pauseActiveTimer}
          onReset={resetActiveTimer}
        />

        <div className="space-y-3 mt-6">
          {BAKE_STEPS.map((step) => {
            const isComplete = session.completedSteps.includes(step.id);
            const timer = session.stepTimers[step.id];
            const note = session.stepNotes[step.id] || "";
            const showNotes = expandedNotes === step.id;
            const isActiveTimer = activeTimerStep === step.id;
            const isGatherStep = step.id === "gather";

            return (
              <div
                key={step.id}
                className={`p-4 rounded-lg border transition-all ${
                  isComplete
                    ? "bg-green-500/10 border-green-500/30"
                    : isActiveTimer
                    ? "bg-orange-500/10 border-orange-500/30"
                    : "bg-card border-border hover-elevate"
                }`}
                data-testid={`step-${step.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer min-h-[44px]"
                    onClick={() => toggleStep(step.id)}
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      <Checkbox
                        checked={isComplete}
                        onCheckedChange={() => toggleStep(step.id)}
                        className="h-6 w-6"
                        data-testid={`checkbox-${step.id}`}
                      />
                    </div>
                    <div className="flex-1">
                      <span className={`font-medium text-lg ${isComplete ? "line-through text-muted-foreground" : ""}`}>
                        {step.name}
                      </span>
                      <p className="text-sm text-muted-foreground">{step.hint}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-11 sm:ml-0">
                    {step.hasTimer && timer && (
                      <button
                        onClick={() => selectTimer(step.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isActiveTimer
                            ? "bg-orange-500 text-white"
                            : timer.running
                            ? "bg-orange-500/20 text-orange-600"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        data-testid={`timer-bubble-${step.id}`}
                      >
                        <Timer className="h-3.5 w-3.5" />
                        {Math.floor(timer.timeLeft / 60)}:{String(timer.timeLeft % 60).padStart(2, "0")}
                        {timer.running && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                      </button>
                    )}
                    <Button
                      size="icon"
                      variant={note ? "secondary" : "ghost"}
                      onClick={() => setExpandedNotes(showNotes ? null : step.id)}
                      data-testid={`button-notes-${step.id}`}
                    >
                      <StickyNote className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isGatherStep && scaledIngredients.length > 0 && (
                  <div className="mt-3 ml-11 p-3 rounded-lg bg-muted/50 border border-border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                      <ThermometerSun className="h-4 w-4" />
                      Scaled for {session.quantity} bagels
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {scaledIngredients.map((ing, i) => (
                        <div key={i} className="flex justify-between text-sm py-1">
                          <span>{ing.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {ing.quantity.toFixed(2)} {ing.unit}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showNotes && (
                  <div className="mt-3 ml-11">
                    <Textarea
                      placeholder="Add notes for this step..."
                      value={note}
                      onChange={(e) => updateNote(step.id, e.target.value)}
                      className="min-h-[60px]"
                      data-testid={`notes-${step.id}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allComplete && (
          <div className="mt-6">
            <Button
              size="lg"
              className="w-full"
              onClick={onComplete}
              data-testid="button-finish-bake"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Finish Bake
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CompletionDialogProps {
  session: BakeSession;
  onClose: () => void;
  onComplete: (destination: "freezer" | "order" | "split", orderId?: string, freezerQty?: number, orderQty?: number) => void;
  isPending: boolean;
}

function CompletionDialog({ session, onClose, onComplete, isPending }: CompletionDialogProps) {
  const [destination, setDestination] = useState<"freezer" | "order" | "split">("freezer");
  const [freezerQty, setFreezerQty] = useState(session.quantity);
  const [orderQty, setOrderQty] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const { data: ordersResponse } = useQuery<{ orders: (Order & { items: any[] })[]; pagination: any }>({
    queryKey: ["/api/admin/orders"],
  });

  const pendingOrders = ordersResponse?.orders?.filter(
    (o) => o.status === "new" || o.status === "approved"
  ) || [];

  useEffect(() => {
    if (destination === "split") {
      setOrderQty(session.quantity - freezerQty);
    }
  }, [freezerQty, destination, session.quantity]);

  const handleConfirm = () => {
    if (destination === "order" && !selectedOrderId) return;
    onComplete(destination, selectedOrderId, freezerQty, orderQty);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Bake Complete!
          </DialogTitle>
          <DialogDescription>Choose where to store the finished bagels</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-between">
              <span className="font-medium">{session.productName}</span>
              <Badge>{session.quantity} bagels</Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                destination === "freezer" ? "border-primary bg-primary/5" : "border-border hover-elevate"
              }`}
              onClick={() => setDestination("freezer")}
              data-testid="option-freezer"
            >
              <div className="flex items-center gap-3">
                <Snowflake className="h-5 w-5 text-blue-500" />
                <div>
                  <span className="font-medium">Add to Freezer</span>
                  <p className="text-sm text-muted-foreground">Store for later orders</p>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                destination === "order" ? "border-primary bg-primary/5" : "border-border hover-elevate"
              }`}
              onClick={() => setDestination("order")}
              data-testid="option-order"
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-orange-500" />
                <div>
                  <span className="font-medium">Fulfill Order</span>
                  <p className="text-sm text-muted-foreground">Apply to pending order</p>
                </div>
              </div>
              {destination === "order" && (
                <div className="mt-3">
                  {pendingOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending orders</p>
                  ) : (
                    <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                      <SelectTrigger data-testid="select-order">
                        <SelectValue placeholder="Select order..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.customerName} - {format(new Date(order.fulfillmentDate), "MMM d")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            <div
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                destination === "split" ? "border-primary bg-primary/5" : "border-border hover-elevate"
              }`}
              onClick={() => setDestination("split")}
              data-testid="option-split"
            >
              <div className="flex items-center gap-3">
                <div className="flex">
                  <Snowflake className="h-5 w-5 text-blue-500 -mr-1" />
                  <Package className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <span className="font-medium">Split</span>
                  <p className="text-sm text-muted-foreground">Some to freezer, some to order</p>
                </div>
              </div>
              {destination === "split" && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Snowflake className="h-4 w-4 text-blue-500" />
                    <Input
                      type="number"
                      min={0}
                      max={session.quantity}
                      value={freezerQty}
                      onChange={(e) => setFreezerQty(Math.min(session.quantity, parseInt(e.target.value) || 0))}
                      className="w-20"
                      data-testid="input-freezer-qty"
                    />
                    <span className="text-sm text-muted-foreground">to freezer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-orange-500" />
                    <span className="w-20 text-center font-medium">{orderQty}</span>
                    <span className="text-sm text-muted-foreground">to order</span>
                  </div>
                  {orderQty > 0 && (
                    <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                      <SelectTrigger data-testid="select-split-order">
                        <SelectValue placeholder="Select order..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.customerName} - {format(new Date(order.fulfillmentDate), "MMM d")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || (destination === "order" && !selectedOrderId) || (destination === "split" && orderQty > 0 && !selectedOrderId)}
            data-testid="button-confirm-complete"
          >
            {isPending ? "Completing..." : "Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface QuantityDialogProps {
  product: Product;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

function QuantityDialog({ product, onConfirm, onClose }: QuantityDialogProps) {
  const [quantity, setQuantity] = useState(12);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">How many {product.name}?</DialogTitle>
          <DialogDescription>Set the quantity for this batch</DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setQuantity(Math.max(1, quantity - 6))}
              data-testid="button-qty-decrease"
            >
              -6
            </Button>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-24 text-center text-2xl font-bold"
              data-testid="input-quantity"
            />
            <Button
              size="lg"
              variant="outline"
              onClick={() => setQuantity(quantity + 6)}
              data-testid="button-qty-increase"
            >
              +6
            </Button>
          </div>
          <p className="text-center text-muted-foreground mt-3">bagels</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(quantity)} data-testid="button-start-baking">
            <Flame className="h-4 w-4 mr-2" />
            Start Baking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBake() {
  const { toast } = useToast();
  const [session, setSession] = useState<BakeSession | null>(loadSession);
  const [quantityProduct, setQuantityProduct] = useState<Product | null>(null);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [scaledIngredients, setScaledIngredients] = useState<Array<{ name: string; quantity: number; unit: string }>>([]);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const activeProducts = products?.filter((p) => p.isActive) || [];
  const displayProducts = activeProducts.slice(0, 3);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    async function fetchScaledIngredients() {
      if (!session) return;
      
      try {
        const response = await fetch(`/api/admin/products/${session.productId}/bom`, {
          credentials: "include",
        });
        if (response.ok) {
          const bom: (BillOfMaterial & { ingredient: Ingredient })[] = await response.json();
          const scaled = bom.map((item) => ({
            name: item.ingredient.name,
            quantity: parseFloat(item.quantity) * session.quantity,
            unit: item.ingredient.unit,
          }));
          setScaledIngredients(scaled);
        }
      } catch (error) {
        console.error("Failed to fetch BOM", error);
      }
    }
    
    fetchScaledIngredients();
  }, [session?.productId, session?.quantity]);

  const createBatchMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number }) => {
      return await apiRequest("POST", "/api/admin/batches", {
        batchDate: new Date(),
        shift: "morning",
        items: [{ productId: data.productId, quantity: data.quantity }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/batches"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
  });

  const addToFreezerMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number }) => {
      return await apiRequest("POST", "/api/admin/freezer", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/freezer"] });
    },
  });

  const handleViewRecipe = (product: Product) => {
    setRecipeProduct(product);
  };

  const handleBake = (product: Product) => {
    setQuantityProduct(product);
  };

  const handleStartBake = (quantity: number) => {
    if (!quantityProduct) return;

    const timers: Record<string, { running: boolean; timeLeft: number; totalTime: number }> = {};
    for (const step of BAKE_STEPS) {
      if (step.hasTimer && step.defaultMinutes) {
        timers[step.id] = {
          running: false,
          timeLeft: step.defaultMinutes * 60,
          totalTime: step.defaultMinutes * 60,
        };
      }
    }

    const newSession: BakeSession = {
      productId: quantityProduct.id,
      productName: quantityProduct.name,
      quantity,
      startedAt: new Date(),
      completedSteps: [],
      stepNotes: {},
      stepTimers: timers,
    };

    setSession(newSession);
    setQuantityProduct(null);
    
    createBatchMutation.mutate({ productId: quantityProduct.id, quantity });
    
    toast({
      title: "Bake Started!",
      description: `Starting ${quantity} ${quantityProduct.name}`,
    });
  };

  const handleUpdateSession = (updated: BakeSession) => {
    setSession(updated);
  };

  const handleComplete = () => {
    setShowCompletion(true);
  };

  const handleConfirmComplete = async (
    destination: "freezer" | "order" | "split",
    orderId?: string,
    freezerQty?: number,
    orderQty?: number
  ) => {
    if (!session) return;

    try {
      if (destination === "freezer") {
        await addToFreezerMutation.mutateAsync({
          productId: session.productId,
          quantity: session.quantity,
        });
        toast({ title: "Added to Freezer", description: `${session.quantity} ${session.productName} added to freezer` });
      } else if (destination === "order" && orderId) {
        await updateOrderStatusMutation.mutateAsync({ orderId, status: "baking" });
        toast({ title: "Order Updated", description: "Order marked as baking" });
      } else if (destination === "split") {
        if (freezerQty && freezerQty > 0) {
          await addToFreezerMutation.mutateAsync({
            productId: session.productId,
            quantity: freezerQty,
          });
        }
        if (orderId && orderQty && orderQty > 0) {
          await updateOrderStatusMutation.mutateAsync({ orderId, status: "baking" });
        }
        toast({ title: "Split Complete", description: `${freezerQty} to freezer, ${orderQty} to order` });
      }

      setSession(null);
      setShowCompletion(false);
      setScaledIngredients([]);
    } catch (error) {
      toast({ title: "Error", description: "Failed to complete bake", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
            <ChefHat className="h-8 w-8" />
            Bake
          </h1>
          <p className="text-muted-foreground mt-1">Your baking control center</p>
        </div>
        {session && (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <Timer className="h-3 w-3 mr-1" />
            Bake in Progress
          </Badge>
        )}
      </div>

      {!session ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayProducts.length > 0 ? (
            displayProducts.map((product) => (
              <BagelCard
                key={product.id}
                product={product}
                onViewRecipe={handleViewRecipe}
                onBake={handleBake}
              />
            ))
          ) : (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[16/9] rounded-xl border-2 border-dashed border-border flex items-center justify-center"
              >
                <p className="text-muted-foreground text-sm text-center p-4">
                  No products yet
                </p>
              </div>
            ))
          )}
        </div>
      ) : (
        <BakeChecklist
          session={session}
          onUpdateSession={handleUpdateSession}
          onComplete={handleComplete}
          scaledIngredients={scaledIngredients}
        />
      )}

      {recipeProduct && (
        <RecipeModal
          product={recipeProduct}
          onClose={() => setRecipeProduct(null)}
        />
      )}

      {quantityProduct && (
        <QuantityDialog
          product={quantityProduct}
          onConfirm={handleStartBake}
          onClose={() => setQuantityProduct(null)}
        />
      )}

      {showCompletion && session && (
        <CompletionDialog
          session={session}
          onClose={() => setShowCompletion(false)}
          onComplete={handleConfirmComplete}
          isPending={addToFreezerMutation.isPending || updateOrderStatusMutation.isPending}
        />
      )}
    </div>
  );
}
