import type { Invoice } from "@grimes/common/model";
import { AbstractNetClient } from "@grimes/common/net-client";
import type { WebLNProvider } from "@webbtc/webln-types";
import { setIntervalAsync } from "set-interval-async/dynamic";
import _ from "lodash";

class ViewerNetClient extends AbstractNetClient {
  public async startViewerSession(viewerName: string) {
    return this.httpPostRequest("start_viewer_session", { viewerName });
  }

  public async stopViewerSession(viewerName: string) {
    return this.httpPostRequest("stop_viewer_session", { viewerName });
  }

  public async getPaidInvoices(viewerName: string) {
    return this.httpGetRequest("get_paid_invoice", { viewerName }).then(
      (res) => res.paidInvoices,
    );
  }
  public async getPendingInvoices(viewerName: string): Promise<Array<Invoice>> {
    return this.httpGetRequest("get_pending_invoice", { viewerName }).then(
      (res) => res.pendingInvoices,
    );
  }
  public async getAllInvoices(viewerName: string): Promise<Array<Invoice>> {
    return this.httpGetRequest("get_all_invoice", { viewerName }).then(
      (res) => res.allInvoices,
    );
  }
}

class EventEmitter {
  on = (eventName, callback) =>
    window.addEventListener(eventName, callback, false);
  off = (eventName, callback) =>
    window.removeEventListener(eventName, callback, false);
  emit = (eventName, data) =>
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
}

export class PaidStreamingViewer extends EventEmitter {
  private netClient: ViewerNetClient;
  private autoPayEnabled: boolean = false;
  private paidInvoiceIds: Array<string> = [];

  constructor(
    private streamerBaseUrl: string,
    private viewerName: string,
    private webln: WebLNProvider,
  ) {
    super();
    this.netClient = new ViewerNetClient(streamerBaseUrl);
  }

  public async start() {
    const session = await this.netClient.startViewerSession(this.viewerName);
    console.log(session);

    setIntervalAsync(this.runloop.bind(this), 1000);
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

      const paidInvoices = await this.netClient.getPaidInvoices(
        this.viewerName,
      );
      const pendingInvoices = await this.netClient.getPendingInvoices(
        this.viewerName,
      );

      for (const invoice of paidInvoices) {
        if (!this.paidInvoiceIds.includes(invoice.id)) {
          this.paidInvoiceIds.push(invoice.id);
        }
      }

      const unpaidInvoices = pendingInvoices.filter(
        (invoice) => !this.paidInvoiceIds.includes(invoice.id),
      );

      // console.log("unpaidInvoices", unpaidInvoices);
      if (unpaidInvoices.length > 0 && this.autoPayEnabled) {
        this.payInvoices(unpaidInvoices[0]);
      }

      this.emit(
        "onUpdateInvoices",
        _.sortBy([...paidInvoices, ...pendingInvoices], (e) => -e.seq).map(
          (invoice) => ({
            seqNum: invoice.seq,
            dueAmount: invoice.amount,
            issuedAt: invoice.createdAt,
            paymentReq: invoice.request,
            isPaid: this.paidInvoiceIds.includes(invoice.id),
          }),
        ),
      );


    } catch (error) {
      console.log(error);
    }
  }

  private async payInvoices(invoice: Invoice) {
    this.webln
      .sendPayment(invoice.request)
      .then((res) => {
        console.log(res);
        console.log("paid invoice", invoice);
        this.paidInvoiceIds.push(invoice.id);
      })
      .catch((err) => {
        if (err.message.includes("paid")) {
          console.log("already paid invoice. ignore.");
        }
        else {
          console.log(err);
        }
      });
  }
}
