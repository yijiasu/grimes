import { zbd } from "@zbd/node";
import { StreamerConfig } from "../config";
import { BaseService, ServiceName } from "./base";

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
}
