import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { insertProductSchema } from "../../shared/schema.js";

export async function getPublicProducts(req: Request, res: Response) {
  try {
    const products = await storage.getProducts();
    const activeProducts = products.filter(p => p.isActive);
    res.json(activeProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
}

export async function getAllProducts(req: Request, res: Response) {
  try {
    const products = await storage.getProducts();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const { bom, ...productData } = req.body;
    const parseResult = insertProductSchema.safeParse(productData);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid product data",
        errors: parseResult.error.errors 
      });
    }

    const product = await storage.createProduct(parseResult.data);
    
    if (bom && Array.isArray(bom) && bom.length > 0) {
      for (const item of bom) {
        if (item.ingredientId && item.quantity > 0) {
          await storage.createBom({
            productId: product.id,
            ingredientId: item.ingredientId,
            quantity: item.quantity.toString(),
          });
        }
      }
    }
    
    res.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const updateSchema = insertProductSchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid product data",
        errors: parseResult.error.errors 
      });
    }
    const product = await storage.updateProduct(req.params.id as string, parseResult.data);
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    await storage.deleteProduct(req.params.id as string);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
}

export async function getProductBom(req: Request, res: Response) {
  try {
    const bom = await storage.getBomForProduct(req.params.id as string);
    res.json(bom);
  } catch (error) {
    console.error("Error fetching product BOM:", error);
    res.status(500).json({ message: "Failed to fetch product BOM" });
  }
}

export async function updateProductBom(req: Request, res: Response) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    await storage.deleteBomForProduct(req.params.id as string);
    
    for (const item of items) {
      if (item.ingredientId && item.quantity > 0) {
        await storage.createBom({
          productId: req.params.id as string,
          ingredientId: item.ingredientId,
          quantity: item.quantity.toString(),
        });
      }
    }

    const bom = await storage.getBomForProduct(req.params.id as string);
    res.json(bom);
  } catch (error) {
    console.error("Error updating product BOM:", error);
    res.status(500).json({ message: "Failed to update product BOM" });
  }
}
