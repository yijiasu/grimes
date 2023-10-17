import { Logger } from "@grimes/common/logger";

import { IServiceConfig, StreamerConfig } from "../config";
import * as AllServices from ".";
import { ServiceManager } from "./service-manager";

export type ServiceName = Exclude<
  keyof typeof AllServices,
  "BaseService" | "ServiceManager"
>;


export abstract class BaseService {
  public readonly name: string;
  public abstract dependencies(): Array<ServiceName>;

  protected started = false;

  protected readonly config: IServiceConfig;

  protected readonly logger: Logger;

  protected serviceManager: ServiceManager;

  protected abstract onServiceStart(): Promise<void>;
  protected abstract onServiceStop(): Promise<void>;

  protected constructor(config: StreamerConfig, name: string) {
    this.config = config;
    this.name = name;
    this.logger = new Logger(name);
  }

  public async startService(serviceManager: ServiceManager): Promise<void> {
    if (!this.started) {
      this.serviceManager = serviceManager;
      this.logger.info(`Service started: ${this.name}`);
      await this.onServiceStart();
      this.started = true;
    }
  }

  public async stopService(): Promise<void> {
    this.logger.info(`Service stopped: ${this.name}`);
    await this.onServiceStop();
    this.started = false;
  }
}

