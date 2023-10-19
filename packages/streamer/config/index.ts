import { envWithDefault, mustDefineEnv } from "@grimes/common";
import { Logger } from "@grimes/common/logger";
import fs from "node:fs";

const logger = new Logger("Config");

interface IConfigNginx {
  port: number;
  configFile: string;
  rtmpUrl: string;
}

interface IConfigLN {
  zbdApiKey: string;
}

interface IConfigHttp {
  port: number;
}

interface IConfigViewer {
  invoiceInterval: number;
  staleViewerTimeout: number;
}

export interface IServiceConfig {
  rootPath: string;
  domain: string;
  http: IConfigHttp;
  nginx: IConfigNginx;
  ln: IConfigLN;
  viewer: IConfigViewer;
}
export class StreamerConfig implements IServiceConfig {
  
  public readonly rootPath: string;
  public readonly domain: string;
  public readonly http: IConfigHttp;
  public readonly nginx: IConfigNginx;
  public readonly ln: IConfigLN;
  public readonly viewer: IConfigViewer;

  constructor(config: IServiceConfig) {
    Object.assign(this, config);
  }

  static createFromNull(): StreamerConfig {
    return new StreamerConfig({} as any);
  }

  static createFromEnv(): StreamerConfig {
    return new StreamerConfig({
      domain: envWithDefault("DOMAIN", "localhost"),
      rootPath: require("app-root-path").toString(),
      http: {
        port: Number(envWithDefault("HTTP_PORT", 8083)),
      },
      nginx: {
        port: Number(envWithDefault("NGINX_PORT", 8084)),
        configFile: mustDefineEnv("NGINX_CONFIG_FILE"),
        rtmpUrl: envWithDefault("RTMP_URL", "rtmp://localhost/rtmp_push/"),
      },
      ln: {
        zbdApiKey: mustDefineEnv("ZBD_API_KEY"),
      },
      viewer: {
        // This is how frequently the streamer will send invoices to the viewer
        invoiceInterval: Number(envWithDefault("INVOICE_INTERVAL", 5000)),
        staleViewerTimeout: Number(envWithDefault("STALE_VIEWER_TIMEOUT", 120000)),
      }
    });
  }

  static createFromConfigFile(configFile: any): StreamerConfig {
    let configJson: IServiceConfig = {} as any;
    try {
      configJson = JSON.parse(fs.readFileSync(configFile, "utf8"));
    } catch (err) {
      console.log(err);
      logger.panic(`Failed to load config file. ${err.message}`);
    }
    return new StreamerConfig(configJson);
  }
}
