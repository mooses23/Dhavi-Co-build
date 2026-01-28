import type { Request, Response } from "express";
import { storage } from "../storage.js";

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const [orders, ingredients] = await Promise.all([
      storage.getOrders(),
      storage.getIngredients(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingOrders = orders.filter(o => o.status === "new").length;
    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt || 0);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    }).length;

    const todayRevenue = orders
      .filter(o => {
        const orderDate = new Date(o.createdAt || 0);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime() && o.status === "approved";
      })
      .reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);

    const lowStockCount = ingredients.filter(i => 
      parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
    ).length;

    res.json({
      todayOrders,
      pendingOrders,
      todayRevenue,
      lowStockCount,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
}

export async function getOrderStats(req: Request, res: Response) {
  try {
    const orders = await storage.getOrders();
    
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRevenue = orders
      .filter(o => o.status === "approved" || o.status === "completed")
      .reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentOrders = orders.filter(o => 
      new Date(o.createdAt || 0) >= last30Days
    );

    res.json({
      statusCounts,
      totalRevenue,
      totalOrders: orders.length,
      recentOrdersCount: recentOrders.length,
    });
  } catch (error) {
    console.error("Error fetching order stats:", error);
    res.status(500).json({ message: "Failed to fetch order stats" });
  }
}

export async function getInventoryStats(req: Request, res: Response) {
  try {
    const ingredients = await storage.getIngredients();
    
    const lowStock = ingredients.filter(i => 
      parseFloat(i.onHand) <= parseFloat(i.reorderThreshold)
    );

    const totalValue = ingredients.reduce((sum, i) => 
      sum + parseFloat(i.onHand) * parseFloat(i.costPerUnit || "0"), 0
    );

    res.json({
      totalIngredients: ingredients.length,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.map(i => ({
        id: i.id,
        name: i.name,
        onHand: i.onHand,
        reorderThreshold: i.reorderThreshold,
        unit: i.unit,
      })),
      totalInventoryValue: totalValue.toFixed(2),
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    res.status(500).json({ message: "Failed to fetch inventory stats" });
  }
}
