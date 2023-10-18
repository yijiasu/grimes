import { Logger } from "@grimes/common/logger";

export class NetClient {
  private logger = new Logger("NetClient");

  constructor(private baseUrl: string) {}

  public async connectivityCheck() {
    return this.httpGetRequest("metadata");
  }

  public async getStreamerMetadata() {
    return this.httpGetRequest("metadata");
  }
  
  public async startStream(clientName: string) {
    return this.httpPostRequest("start", { clientName });
  }

  public async sendInvoice(invoiceRequest: string) {
    return this.httpPostRequest("send_invoice", { invoiceRequest });
  }

  private async httpGetRequest(subpath: string) {
    return fetch(`${this.baseUrl}/${subpath}`, { method: "GET" }).then(
      this.responseHandler
    );
  }

  private async httpPostRequest(subpath: string, body: Record<string, any>) {
    return fetch(`${this.baseUrl}/${subpath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then(this.responseHandler);
  }

  private async responseHandler(resp: Response) {
    const respText = await resp.text();
    let respJson: Record<string, any>;
    try {
      respJson = JSON.parse(respText);
    } catch (err) {
      this.logger.error(`Failed to parse response: ${respText}`);
    }
    if (resp.status !== 200) {
      throw new Error(
        `NetClient Error: Code=${resp.status}; Error=${respText}`
      );
    }
    return respJson;
  }
}
