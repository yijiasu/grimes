import { zbd } from "@zbd/node";
import { StreamerConfig } from "../config";
import { BaseService, ServiceName } from "./base";
import { Invoice } from "@grimes/common/model";

export class PaymentService extends BaseService {
  private zbd: zbd;
  constructor(config: StreamerConfig) {
    super(config, "PaymentService");
    this.zbd = new zbd(config.ln.zbdApiKey);
  }

  public dependencies(): Array<ServiceName> {
    return [];
  }
  protected async onServiceStart(): Promise<void> {}
  protected async onServiceStop(): Promise<void> {}

  public async payInvoice(invoiceRequest: string) {
    await this.zbd.sendPayment({
      invoice: invoiceRequest,
      description: "",
      internalId: "",
      callbackUrl: "",
      amount: "",
    });
  }

  public async createInvoice(seq: number, amount: number, internalId: string): Promise<Invoice> {
    const invoiceResp = await this.zbd.createCharge({
      expiresIn: 600,
      amount: (amount * 1000).toString(),
      internalId,
      description: `Viewer streaming invoice #${internalId}`,
      callbackUrl: "",
    });
    const { id, invoice } = invoiceResp.data;
    
    return { seq, id, createdAt: (new Date()).toISOString(), amount: amount.toString(), request: invoice.request };
  }

  public async checkInvoicePaid(invoice: Invoice): Promise<boolean> {
    const invoiceResp = await this.zbd.getCharge(invoice.id);
    return invoiceResp.data.status === "completed";
  }
}
