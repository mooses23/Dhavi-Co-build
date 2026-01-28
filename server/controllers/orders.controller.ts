import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { getStripe } from "../lib/stripe.js";
import { orderCreateSchema, orderUpdateSchema, statusSchema } from "../lib/validation.js";

export async function createOrder(req: Request, res: Response) {
  try {
    const parseResult = orderCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid order data", 
        errors: parseResult.error.errors 
      });
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryZip,
      deliveryInstructions,
      fulfillmentDate,
      fulfillmentWindow,
      items,
    } = parseResult.data;

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await storage.getProduct(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Product not available: ${item.productId}` });
      }
      const unitPrice = parseFloat(product.price);
      const total = unitPrice * item.quantity;
      subtotal += total;
      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        total: total.toFixed(2),
      });
    }

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(subtotal * 100),
      currency: "usd",
      capture_method: "manual",
      metadata: {
        customerName,
        customerEmail,
      },
    });

    const order = await storage.createOrder({
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryZip,
      deliveryInstructions,
      fulfillmentDate: new Date(fulfillmentDate),
      fulfillmentWindow,
      subtotal: subtotal.toFixed(2),
      total: subtotal.toFixed(2),
      stripePaymentIntentId: paymentIntent.id,
      stripePaymentStatus: "pending",
      status: "new",
    });

    for (const itemData of orderItemsData) {
      await storage.createOrderItem({
        orderId: order.id,
        ...itemData,
      });
    }

    res.json({
      orderId: order.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
}

export async function getPublicOrder(req: Request, res: Response) {
  try {
    const order = await storage.getOrder(req.params.id as string);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({
      id: order.id,
      status: order.status,
      total: order.total,
      fulfillmentDate: order.fulfillmentDate,
      fulfillmentWindow: order.fulfillmentWindow,
      deliveryAddress: order.deliveryAddress,
      deliveryCity: order.deliveryCity,
      deliveryState: order.deliveryState,
      deliveryZip: order.deliveryZip,
      items: order.items.map(item => ({
        quantity: item.quantity,
        total: item.total,
        product: { name: item.product.name },
      })),
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
}

export async function getAllOrders(req: Request, res: Response) {
  try {
    const orders = await storage.getOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const parseResult = statusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const { status } = parseResult.data;
    const order = await storage.getOrder(req.params.id as string);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "approved" && order.stripePaymentIntentId) {
      try {
        await getStripe().paymentIntents.capture(order.stripePaymentIntentId);
        await storage.updateOrder(order.id, { stripePaymentStatus: "captured" });
      } catch (stripeError: any) {
        console.error("Stripe capture error:", stripeError);
        return res.status(400).json({ 
          message: "Failed to capture payment",
          error: stripeError.message 
        });
      }

      try {
        const existingInvoice = await storage.getInvoiceByOrderId(order.id);
        if (!existingInvoice) {
          const invoiceNumber = await storage.getNextInvoiceNumber();
          const invoice = await storage.createInvoice({
            invoiceNumber,
            orderId: order.id,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            deliveryAddress: order.deliveryAddress,
            deliveryCity: order.deliveryCity,
            deliveryState: order.deliveryState,
            deliveryZip: order.deliveryZip,
            subtotal: order.subtotal,
            tax: "0",
            total: order.total,
            status: "sent",
          });

          for (const item of order.items) {
            await storage.createInvoiceItem({
              invoiceId: invoice.id,
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            });
          }
        }
      } catch (invoiceError) {
        console.error("Invoice creation error:", invoiceError);
      }

      await storage.logActivity(
        "order.approved",
        "order",
        order.id,
        { customerName: order.customerName, total: order.total },
        undefined,
        "admin"
      );
    } else if (status === "cancelled" && order.stripePaymentIntentId && order.stripePaymentStatus !== "captured") {
      try {
        await getStripe().paymentIntents.cancel(order.stripePaymentIntentId);
        await storage.updateOrder(order.id, { stripePaymentStatus: "cancelled" });
      } catch (stripeError) {
        console.error("Stripe cancel error:", stripeError);
      }
    }

    const updatedOrder = await storage.updateOrderStatus(req.params.id as string, status);
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
}

export async function updateOrder(req: Request, res: Response) {
  try {
    const parseResult = orderUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid order data",
        errors: parseResult.error.errors 
      });
    }

    const order = await storage.getOrder(req.params.id as string);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updatedOrder = await storage.updateOrder(req.params.id as string, parseResult.data);
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
}
