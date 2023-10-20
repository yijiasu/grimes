import { Invoice } from "@grimes/common/model";
import { IServiceConfig, StreamerConfig } from "../config";
import { BaseService, ServiceName } from "./base";
import { setIntervalAsync } from "set-interval-async/dynamic";
import { PaymentService } from "./payment";

class ViewerSession {

  public createdAt: Date;
  public lastPingedAt: Date;
  public lastInvoicedAt: Date;

  public invoices: Array<Invoice> = [];
  public paidInvoices: Array<Invoice> = [];
  public unpaidInvoices: Array<Invoice> = [];

  constructor(public sessionId: string, private config: IServiceConfig) {
    this.createdAt = new Date();
    this.lastPingedAt = new Date();
    this.lastInvoicedAt = new Date();
  }
  public getPlaylistUrl() {
    return `http://${this.config.domain}:${this.config.http.port}/viewer_playlist?viewerName=${this.sessionId}`;
  }
  public ping() {
    this.lastPingedAt = new Date();
  }

  public appendInvoice(invoice: Invoice) {
    this.lastPingedAt = new Date();
    this.invoices.push(invoice);
    this.unpaidInvoices.push(invoice);
  }

  public setInvoicePaid(invoice: Invoice) {
    this.paidInvoices.push(invoice);
    this.unpaidInvoices = this.unpaidInvoices.filter((unpaidInvoice) => {
      return unpaidInvoice.id !== invoice.id;
    });
  }

  public isHealthy() {
    if (this.unpaidInvoices.length >= this.config.viewer.unhealthyInvoiceCount) {
      return false;
    }
    return true;
  }

  public invoiceCount(): number {
    return this.invoices.length;
  }


}

export class ViewerSessionService extends BaseService {
  // viewer name to session
  private sessions: Map<string, ViewerSession> = new Map();
  private ps: PaymentService;
  
  constructor(config: StreamerConfig) {
    super(config, "ViewerSessionService");
  }

  public dependencies(): Array<ServiceName> {
    return ["PaymentService"];
  }
  protected async onServiceStart(): Promise<void> {
    this.ps = this.serviceManager.getService("PaymentService");
    setIntervalAsync(this.runloop.bind(this), this.config.viewer.runloopCheckInterval);
  }
  protected async onServiceStop(): Promise<void> {}

  public startSession(viewerName: string) {
    if (this.sessions.has(viewerName)) {
      return this.sessions.get(viewerName);
    }
    const session = new ViewerSession(viewerName, this.config);
    this.sessions.set(viewerName, session);
    return session;
  }

  public stopSession(viewerName: string) {
    if (!this.sessions.has(viewerName)) {
      throw new Error(`Viewer ${viewerName} does not have a session`);
    }
    this.sessions.delete(viewerName);
  }

  // the viewer need to ping the session to keep it alive
  public pingSession(viewerName: string) {
    if (!this.sessions.has(viewerName)) {
      throw new Error(`Viewer ${viewerName} does not have a session`);
    }
    const session = this.sessions.get(viewerName);
    session.ping();
  }

  public getSession(viewerName: string) {
    if (!this.sessions.has(viewerName)) {
      throw new Error(`Viewer ${viewerName} does not have a session`);
    }
    const session = this.sessions.get(viewerName);
    return session;
  }

  public isSessionHealthy(viewerName: string) {
    if (!this.sessions.has(viewerName)) {
      throw new Error(`Viewer ${viewerName} does not have a session`);
    }
    const session = this.sessions.get(viewerName);
    return session.isHealthy();
  }

  private async runloop() {
    try {
      this.logger.info(`Running runloop`);
      for (const [viewerName, session] of this.sessions.entries()) {

        // check if unpaid invoices are paid
        for (const unpaidInvoice of session.unpaidInvoices) {
          const paid = await this.ps.checkInvoicePaid(unpaidInvoice);
          this.logger.info(`Invoice ${unpaidInvoice.id} PaidStatus: ${paid}`);
          if (paid) {
            session.setInvoicePaid(unpaidInvoice);
          }
        }

        if ((new Date()).getTime() - session.lastPingedAt.getTime() > this.config.viewer.staleViewerTimeout) {
          this.logger.error(`Viewer ${viewerName} is stale, skipping sending invoice to him`);
          continue;
        }

        if (!session.isHealthy()) {
          this.logger.error(`Viewer ${viewerName} is not healthy, skipping sending invoice to him`);
          continue;
        }

        // ask for a payment
        if ((new Date()).getTime() - session.lastInvoicedAt.getTime() < this.config.viewer.invoiceInterval) {
          continue;
        }
        const invoice = await this.ps.createInvoice(
          session.invoiceCount() + 1,
          this.config.viewer.satsPerInvoice,
          `${viewerName}-${session.invoiceCount()}`
        );

        session.appendInvoice(invoice);

      }
    } catch (error) {
      this.logger.error(error);
    }
  }
}
