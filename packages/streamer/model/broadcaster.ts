export class Broadcaster {
  private clientName: string;
  private rmtpBaseUrl: string;
  public readonly pushId: string;
  constructor (clientName: string, rmtpBaseUrl: string) {
    this.clientName = clientName;
    this.rmtpBaseUrl = rmtpBaseUrl;
    this.pushId = this.generatePushId();
  }
  private generatePushId(): string {
    return "broadcast-" + Math.random().toString(36).substring(2, 8);
  }

  public getRmtpUrl(): string {
    return `${this.rmtpBaseUrl}${this.pushId}`
  }
}