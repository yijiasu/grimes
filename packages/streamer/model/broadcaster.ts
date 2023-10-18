export class Broadcaster {
  private clientName: string;
  private rtmpBaseUrl: string;
  public readonly pushId: string;
  constructor (clientName: string, rtmpBaseUrl: string) {
    this.clientName = clientName;
    this.rtmpBaseUrl = rtmpBaseUrl;
    this.pushId = this.generatePushId();
  }
  private generatePushId(): string {
    return "broadcast-" + Math.random().toString(36).substring(2, 8);
  }

  public getrtmpUrl(): string {
    return `${this.rtmpBaseUrl}${this.pushId}`
  }
}