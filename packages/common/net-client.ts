import { Logger } from "./logger";

export abstract class AbstractNetClient {
  private logger = new Logger("NetClient");

  constructor(private baseUrl: string) {}

  protected async httpGetRequest(
    subpath: string,
    query?: Record<string, any> | undefined
  ) {
    const querystring = query
      ? new URLSearchParams(query).toString()
      : undefined;

    return fetch(
      `${this.baseUrl}/${subpath}` + (querystring ? `?${querystring}` : ""),
      { method: "GET" }
    ).then(this.responseHandler);
  }

  protected async httpPostRequest(subpath: string, body: Record<string, any>) {
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
