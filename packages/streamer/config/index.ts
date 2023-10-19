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
export interface IServiceConfig {
  rootPath: string;
  domain: string;
  http: IConfigHttp;
  nginx: IConfigNginx;
  ln: IConfigLN;
}
export class StreamerConfig implements IServiceConfig {
  
  public readonly rootPath: string;
  public readonly domain: string;
  public readonly http: IConfigHttp;
  public readonly nginx: IConfigNginx;
  public readonly ln: IConfigLN;

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
