import { BaseService, ServiceName } from "./base";
import { StreamerConfig } from "../config";
import * as AllServices from ".";

export class ServiceManager {
  private services: Map<string, BaseService> = new Map();

  constructor(private ServiceConfig: StreamerConfig) {}

  public registerService(service: BaseService) {
    if (this.services.has(service.name)) {
      throw new Error(`Service ${service.name} already registered`);
    }
    this.services.set(service.name, service);
  }

  public unregisterService(service: BaseService) {
    if (!this.services.has(service.name)) {
      throw new Error(`Service ${service.name} not registered`);
    }
    this.services.delete(service.name);
  }

  public getService<K extends ServiceName>(
    name: K
  ): InstanceType<(typeof AllServices)[K]> {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not registered`);
    }
    return this.services.get(name)! as InstanceType<(typeof AllServices)[K]>;
  }

  public async startAllServices() {
    const services = Array.from(this.services.values());
    for (const service of services) {
      await this.startService(service);
    }
  }

  public async stopAllServices() {
    const services = Array.from(this.services.values());
    for (const service of services) {
      await this.stopService(service);
    }
  }

  public async startService(serviceNameOrObject: ServiceName | BaseService) {
    const service =
      typeof serviceNameOrObject === "string"
        ? this.getService(serviceNameOrObject)
        : serviceNameOrObject;
    const deps = service.dependencies();
    for (const dep of deps) {
      await this.startService(dep);
    }
    await service.startService(this);
  }

  public async stopService(serviceNameOrObject: ServiceName | BaseService) {
    const service =
      typeof serviceNameOrObject === "string"
        ? this.getService(serviceNameOrObject)
        : serviceNameOrObject;
    await service.stopService();
  }

  public async isServiceActive(serviceNameOrObject: ServiceName | BaseService) {
    const service =
      typeof serviceNameOrObject === "string"
        ? this.getService(serviceNameOrObject)
        : serviceNameOrObject;
    return this.services.has(service.name);
  }
}
