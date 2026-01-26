import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  FileText,
  Printer,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Download
} from "lucide-react";
import type { Invoice, InvoiceItem } from "@shared/schema";

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  draft: { color: "bg-muted text-muted-foreground border-border", icon: Clock, label: "Draft" },
  sent: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Send, label: "Sent" },
  paid: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle, label: "Paid" },
  cancelled: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle, label: "Cancelled" },
};

export default function AdminInvoices() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);

  const { data: invoices, isLoading } = useQuery<InvoiceWithItems[]>({
    queryKey: ["/api/admin/invoices"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/admin/invoices/${invoiceId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({ title: "Invoice Updated", description: "Invoice status has been updated" });
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredInvoices = invoices?.filter((i) => 
    statusFilter === "all" || i.status === statusFilter
  ) || [];

  const handlePrint = (invoice: InvoiceWithItems) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Georgia, serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #c4a052; padding-bottom: 20px; }
          .logo { font-size: 32px; font-weight: bold; color: #1a1a1a; }
          .logo-accent { color: #c4a052; }
          .invoice-info { text-align: right; }
          .invoice-number { font-size: 24px; font-weight: bold; color: #1a1a1a; }
          .invoice-date { color: #666; margin-top: 5px; }
          .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .address-block { }
          .address-label { font-weight: bold; color: #666; margin-bottom: 10px; text-transform: uppercase; font-size: 12px; }
          .address-content { line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; color: #666; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .qty { text-align: center; }
          .price { text-align: right; }
          .totals { margin-left: auto; width: 250px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .totals-row.total { border-top: 2px solid #c4a052; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px; }
          .footer { margin-top: 60px; text-align: center; color: #666; font-size: 14px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">D'havi<span class="logo-accent">.co</span></div>
          <div class="invoice-info">
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <div class="invoice-date">Issued: ${format(new Date(invoice.issuedAt!), "MMM d, yyyy")}</div>
          </div>
        </div>
        <div class="addresses">
          <div class="address-block">
            <div class="address-label">From</div>
            <div class="address-content">
              D'havi.co Premium Spelt Bagels<br>
              Brooklyn, NY
            </div>
          </div>
          <div class="address-block">
            <div class="address-label">Deliver To</div>
            <div class="address-content">
              ${invoice.customerName}<br>
              ${invoice.deliveryAddress}<br>
              ${invoice.deliveryCity}, ${invoice.deliveryState} ${invoice.deliveryZip}
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="qty">Qty</th>
              <th class="price">Unit Price</th>
              <th class="price">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td class="qty">${item.quantity}</td>
                <td class="price">$${parseFloat(item.unitPrice).toFixed(2)}</td>
                <td class="price">$${parseFloat(item.total).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>$${parseFloat(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Tax</span>
            <span>$${parseFloat(invoice.tax).toFixed(2)}</span>
          </div>
          <div class="totals-row total">
            <span>Total</span>
            <span>$${parseFloat(invoice.total).toFixed(2)}</span>
          </div>
        </div>
        <div class="footer">
          <p>Thank you for choosing D'havi.co Premium Spelt Bagels!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage customer invoices</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => {
                const config = statusConfig[invoice.status];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={invoice.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border hover-elevate gap-4"
                    data-testid={`invoice-card-${invoice.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono font-semibold">{invoice.invoiceNumber}</span>
                        <Badge variant="outline" className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.customerName} - {invoice.customerEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Issued: {format(new Date(invoice.issuedAt!), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gold text-lg">
                          ${parseFloat(invoice.total).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.items.length} items
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedInvoice(invoice)}
                          data-testid={`button-view-${invoice.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePrint(invoice)}
                          data-testid={`button-print-${invoice.id}`}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedInvoice.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.customerEmail}</p>
                </div>
                <Badge variant="outline" className={statusConfig[selectedInvoice.status].color}>
                  {statusConfig[selectedInvoice.status].label}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                <p className="text-sm">
                  {selectedInvoice.deliveryAddress}<br />
                  {selectedInvoice.deliveryCity}, {selectedInvoice.deliveryState} {selectedInvoice.deliveryZip}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Line Items</p>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.productName} x{item.quantity}</span>
                      <span className="font-medium">${parseFloat(item.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${parseFloat(selectedInvoice.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-gold">${parseFloat(selectedInvoice.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handlePrint(selectedInvoice)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                {selectedInvoice.status === "sent" && (
                  <Button
                    className="flex-1"
                    onClick={() => updateStatusMutation.mutate({ 
                      invoiceId: selectedInvoice.id, 
                      status: "paid" 
                    })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
