import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminStore } from '@/stores/adminStore';
import type { Order, Ingredient, Batch, Product, Location } from '@shared/schema';

export function useAdminData() {
  const { 
    setOrders, 
    setIngredients, 
    setBatches, 
    setProducts, 
    setLocations,
    setLoading,
    orders,
    ingredients,
    batches,
    products,
    locations,
    isLoading,
    getPendingOrders,
    getLowStockIngredients,
    getTodayBatches,
    getActiveProducts,
  } = useAdminStore();

  const ordersQuery = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  const ingredientsQuery = useQuery<Ingredient[]>({
    queryKey: ["/api/admin/ingredients"],
  });

  const batchesQuery = useQuery<(Batch & { items: any[] })[]>({
    queryKey: ["/api/admin/batches"],
  });

  const productsQuery = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const locationsQuery = useQuery<Location[]>({
    queryKey: ["/api/admin/locations"],
  });

  const statsQuery = useQuery<{
    todayOrders: number;
    pendingOrders: number;
    todayRevenue: number;
    lowStockCount: number;
  }>({
    queryKey: ["/api/admin/stats/dashboard"],
  });

  useEffect(() => {
    if (ordersQuery.data) setOrders(ordersQuery.data);
    setLoading('orders', ordersQuery.isLoading);
  }, [ordersQuery.data, ordersQuery.isLoading, setOrders, setLoading]);

  useEffect(() => {
    if (ingredientsQuery.data) setIngredients(ingredientsQuery.data);
    setLoading('ingredients', ingredientsQuery.isLoading);
  }, [ingredientsQuery.data, ingredientsQuery.isLoading, setIngredients, setLoading]);

  useEffect(() => {
    if (batchesQuery.data) setBatches(batchesQuery.data);
    setLoading('batches', batchesQuery.isLoading);
  }, [batchesQuery.data, batchesQuery.isLoading, setBatches, setLoading]);

  useEffect(() => {
    if (productsQuery.data) setProducts(productsQuery.data);
    setLoading('products', productsQuery.isLoading);
  }, [productsQuery.data, productsQuery.isLoading, setProducts, setLoading]);

  useEffect(() => {
    if (locationsQuery.data) setLocations(locationsQuery.data);
    setLoading('locations', locationsQuery.isLoading);
  }, [locationsQuery.data, locationsQuery.isLoading, setLocations, setLoading]);

  return {
    orders,
    ingredients,
    batches,
    products,
    locations,
    stats: statsQuery.data,
    isLoading: {
      ...isLoading,
      stats: statsQuery.isLoading,
    },
    pendingOrders: getPendingOrders(),
    lowStockIngredients: getLowStockIngredients(),
    todayBatches: getTodayBatches(),
    activeProducts: getActiveProducts(),
    refetch: {
      orders: ordersQuery.refetch,
      ingredients: ingredientsQuery.refetch,
      batches: batchesQuery.refetch,
      products: productsQuery.refetch,
      locations: locationsQuery.refetch,
      stats: statsQuery.refetch,
    },
  };
}
