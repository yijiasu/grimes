import { Invoice } from "@grimes/common/model";
import { AbstractNetClient } from "@grimes/common/net-client";
import { setIntervalAsync } from "set-interval-async/dynamic";

class ViewerNetClient extends AbstractNetClient {

  public async startViewerSession(viewerName: string) {
    return this.httpPostRequest("start_viewer_session", { viewerName });
  }

  public async stopViewerSession(viewerName: string) {
    return this.httpPostRequest("stop_viewer_session", { viewerName });
  }

  public async getPendingInvoices(viewerName: string) {
    return this.httpGetRequest("get_pending_invoice", { viewerName }).then(res => res.pendingInvoices);
  }
  public async getPaidInvoices(viewerName: string) {
    return this.httpGetRequest("get_paid_invoice", { viewerName }).then(res => res.paidInvoices);
  }
}

class EventEmitter {
  on = (eventName, callback) => window.addEventListener(eventName, callback, false)
  off = (eventName, callback) => window.removeEventListener(eventName, callback, false)
  emit = (eventName, data) => window.dispatchEvent(new CustomEvent(eventName, { detail: data }))
}

export class PaidStreamingViewer extends EventEmitter {
  private netClient: ViewerNetClient;
  private autoPayEnabled: boolean = false;
  private paidInvoiceIds: Array<string> = [];

  constructor(private streamerBaseUrl: string, private viewerName: string) {
    super();
    this.netClient = new ViewerNetClient(streamerBaseUrl);
  }

  public async start() {
    const session = await this.netClient.startViewerSession(this.viewerName);
    console.log(session);

    setIntervalAsync(this.runloop.bind(this), 5000);
    return session.playlist;
  }

  public enableAutoPay() {
    console.log("enableAutoPay");
    this.autoPayEnabled = true;
  }

  public disableAutoPay() {
    console.log("disableAutoPay");
    this.autoPayEnabled = false;
  }

  private async runloop() {
    try {
      const pendingInvoices = await this.netClient
        .getPendingInvoices(this.viewerName)
        .then((invoices) =>
          invoices.filter(
            (invoice) => !this.paidInvoiceIds.includes(invoice.id)
          )
        );
      const paidInvoices = await this.netClient.getPaidInvoices(this.viewerName);

      this.emit("onUpdatePendingInvoices", pendingInvoices);
      this.emit("onUpdatePaidInvoices", paidInvoices);
      if (pendingInvoices.length > 0 && this.autoPayEnabled) {
        this.payInvoices(pendingInvoices);
      }
    } catch (error) {
      console.log(error);
    }
  }

  private async payInvoices(invoices: Array<Invoice>) {
    const invoice = invoices.shift();
    window.webln.sendPayment(invoice.request).then(res => {
      console.log(res);
      console.log("paid invoice", invoice);
      this.paidInvoiceIds.push(invoice.id);
    }).catch(err => {
      console.log(err);
    });
  }

}
