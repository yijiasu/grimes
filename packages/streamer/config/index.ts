import { envWithDefault, mustDefineEnv } from "@grimes/common";
import { Logger } from "@grimes/common/logger";
import fs from "node:fs";

const logger = new Logger("Config");

interface IConfigNginx {
  configFile: string;
}

interface IConfigHttp {
  port: number;
}
export interface IServiceConfig {
  http: IConfigHttp;
  nginx: IConfigNginx;
}
export class StreamerConfig implements IServiceConfig {
  public readonly http: IConfigHttp;
  public readonly nginx: IConfigNginx;

  constructor(config: IServiceConfig) {
    Object.assign(this, config);
  }

  static createFromNull(): StreamerConfig {
    return new StreamerConfig({} as any);
  }

  static createFromEnv(): StreamerConfig {
    return new StreamerConfig({
      http: {
        port: envWithDefault("HTTP_PORT", 8083),
      },
      nginx: {
        configFile: mustDefineEnv("NGINX_CONFIG_FILE"),
      },
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
