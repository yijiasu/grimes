import { Logger } from "@grimes/common/logger";
import { zbd } from "@zbd/node";
import {
  setIntervalAsync,
  clearIntervalAsync,
  SetIntervalAsyncTimer,
} from "set-interval-async/dynamic";

interface InvoicePaymentInfo {
  id: string;
  unit: string;
  amount: string;
  createdAt: string;
  internalId: string;
  callbackUrl: string;
  description: string;
  expiresAt: string;
  confirmedAt: string;
  status: string;
}
interface Invoice {
  id: string;
  request: string;
  paymentInfo?: InvoicePaymentInfo
}

export class PaymentCollector {
  private zbd: zbd;
  private readonly batchId: string;
  private ctr: number = 0;
  private invoices: Array<Invoice> = [];
  private paidInvoices: Array<Invoice> = [];
  private unpaidInvoices: Array<Invoice> = [];

  private runloopInterval: SetIntervalAsyncTimer<any>;

  private logger = new Logger("PaymentCollector");

  constructor(zbdApiKey: string) {
    this.zbd = new zbd(zbdApiKey);
    this.batchId = Math.random().toString(36).substring(2, 8);
    this.runloopInterval = setIntervalAsync(this.runloop.bind(this), 10000);
  }
  public async createInvoice() {
    this.ctr++;
    const invoiceResp = await this.zbd.createCharge({
      expiresIn: 600,
      amount: "20000",
      internalId: `${this.batchId}-${this.ctr}`,
      description: `Video streaming invoice #${this.ctr}`,
      callbackUrl: "",
    });
    const { id, invoice } = invoiceResp.data;
    this.invoices.push({ id, request: invoice.request });
    this.unpaidInvoices.push({ id, request: invoice.request });

    return invoice as Invoice;
  }

  public printStatus() {
    this.logger.info(
      `TotalCreatedInv=${this.invoices.length}; Paid=${this.paidInvoices.length}; Unpaid=${this.unpaidInvoices.length}`
    );
  }

  private async runloop() {
    try {
      for (const invoice of this.unpaidInvoices) {
        const checkInvoiceResp = await this.zbd.getCharge(invoice.id);
        if (checkInvoiceResp.data.status === "completed") {
          this.paidInvoices.push({ ...invoice, paymentInfo: checkInvoiceResp.data });
          this.unpaidInvoices = this.unpaidInvoices.filter(
            (i) => i.id !== invoice.id
          );
        }
      }
    } catch (error) {
      this.logger.error(error);
    }
  }
}
