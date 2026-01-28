import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { statusSchema } from "../lib/validation.js";

export async function getAllInvoices(req: Request, res: Response) {
  try {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
}

export async function getInvoice(req: Request, res: Response) {
  try {
    const invoice = await storage.getInvoice(req.params.id as string);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
}

export async function updateInvoiceStatus(req: Request, res: Response) {
  try {
    const parseResult = statusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const invoice = await storage.updateInvoiceStatus(req.params.id as string, parseResult.data.status);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.json(invoice);
  } catch (error) {
    console.error("Error updating invoice status:", error);
    res.status(500).json({ message: "Failed to update invoice status" });
  }
}
