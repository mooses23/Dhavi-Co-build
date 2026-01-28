import { create } from 'zustand';
import type { Order, Ingredient, Batch, Product, Location } from '@shared/schema';

interface AdminState {
  orders: Order[];
  ingredients: Ingredient[];
  batches: (Batch & { items: any[] })[];
  products: Product[];
  locations: Location[];
  
  isLoading: {
    orders: boolean;
    ingredients: boolean;
    batches: boolean;
    products: boolean;
    locations: boolean;
  };

  setOrders: (orders: Order[]) => void;
  setIngredients: (ingredients: Ingredient[]) => void;
  setBatches: (batches: (Batch & { items: any[] })[]) => void;
  setProducts: (products: Product[]) => void;
  setLocations: (locations: Location[]) => void;
  setLoading: (key: keyof AdminState['isLoading'], value: boolean) => void;

  getPendingOrders: () => Order[];
  getLowStockIngredients: () => Ingredient[];
  getTodayBatches: () => (Batch & { items: any[] })[];
  getActiveProducts: () => Product[];
}

export const useAdminStore = create<AdminState>((set, get) => ({
  orders: [],
  ingredients: [],
  batches: [],
  products: [],
  locations: [],
  
  isLoading: {
    orders: false,
    ingredients: false,
    batches: false,
    products: false,
    locations: false,
  },

  setOrders: (orders) => set({ orders }),
  setIngredients: (ingredients) => set({ ingredients }),
  setBatches: (batches) => set({ batches }),
  setProducts: (products) => set({ products }),
  setLocations: (locations) => set({ locations }),
  setLoading: (key, value) => set((state) => ({
    isLoading: { ...state.isLoading, [key]: value }
  })),

  getPendingOrders: () => {
    return get().orders.filter((o) => o.status === "new");
  },

  getLowStockIngredients: () => {
    return get().ingredients.filter(
      (i) => parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
    );
  },

  getTodayBatches: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return get().batches.filter((b) => {
      const batchDate = new Date(b.batchDate);
      batchDate.setHours(0, 0, 0, 0);
      return batchDate.getTime() === today.getTime() && b.status !== "cancelled";
    });
  },

  getActiveProducts: () => {
    return get().products.filter((p) => p.isActive);
  },
}));
