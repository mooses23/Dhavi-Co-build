import { z } from "zod";

export const orderCreateSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().min(5),
  deliveryCity: z.string().min(2),
  deliveryState: z.string().min(2),
  deliveryZip: z.string().min(5),
  deliveryInstructions: z.string().optional(),
  fulfillmentDate: z.string(),
  fulfillmentWindow: z.string(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().min(1),
  })).min(1),
});

export const orderUpdateSchema = z.object({
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryState: z.string().optional(),
  deliveryZip: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  notes: z.string().optional(),
});

export const batchCreateSchema = z.object({
  batchDate: z.string(),
  shift: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().min(0),
  })).optional(),
});

export const statusSchema = z.object({
  status: z.string().min(1),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
export type BatchCreateInput = z.infer<typeof batchCreateSchema>;
