import { StreamerConfig } from "../config";
import { BaseService, ServiceName } from "./base";
import shell from "shelljs";
import { ChildProcess, spawn } from "node:child_process";
import split2 from "split2";
import { Logger } from "@grimes/common/logger";
import { Broadcaster } from "../model";
import fs from "node:fs";
import shelljs from "shelljs";
import os from "node:os";

export class VideoStreamService extends BaseService {
  private nginxProcess: ChildProcess;
  private broadcaster: Map<string, Broadcaster> = new Map();

  constructor(config: StreamerConfig) {
    super(config, "VideoStreamService");
  }

  public dependencies(): Array<ServiceName> {
    return [];
  }
  protected async onServiceStart(): Promise<void> {
    this.checkNginx();
    this.spawnNginx();
  }
  
  protected async onServiceStop(): Promise<void> {}

  private checkNginx() {
    // check if nginx is installed
    if (!shell.which("nginx")) {
      this.logger.error("nginx is not installed");
      shell.exit(1);
    }
  }

  private async spawnNginx() {
    // const configFile = this.config.nginx.configFile;
    const configFileTemplate = this.config.rootPath + "/packages/streamer/res/liveserver_template.conf";
    let configFile = fs.readFileSync(configFileTemplate, "utf8").toString();

    // TODO: replace the following two lines with the actual command
    // const RTMP_PUSH_CMD = "/opt/homebrew/bin/ffmpeg -i rtmp://localhost/rtmp_push/$name -c:v libx264 -c:a aac -strict -2 -f hls -hls_key_info_file /Users/yijiasu/workspace/ibc/grimes/nginx/hls_key/enc.keyinfo -hls_list_size 0 -hls_time 2 /tmp/hls/output.m3u8 >/dev/stdout 2>/dev/stdout";
    const nodeJsPath = shelljs.which("node").toString();
    const codecScriptPath = this.config.rootPath + "/packages/streamer/codec.js";
    const ffmpegPath = shelljs.which("ffmpeg").toString();

    // TODO: hardcoded key
    const masterKey = this.config.viewer.masterKey;
    const RTMP_PUSH_CMD = `${nodeJsPath} ${codecScriptPath} --ffmpegPath ${ffmpegPath} --streamName $name --masterKey ${masterKey} >/tmp/codec_out.log 2>/tmp/codec_err.log`;
    
    configFile = configFile.replace("<!RTMP_PUSH_CMD!>", RTMP_PUSH_CMD);
    configFile = configFile.replace("<!NGINX_PORT!>", this.config.nginx.port.toString());
    
    if (os.platform() !== "darwin") {
      configFile = "load_module modules/ngx_rtmp_module.so;\npid /tmp/nginx.pid;\n" + configFile;
    }

    const tmpConfigFile = `/tmp/liveserver.conf`;
    fs.writeFileSync(tmpConfigFile, configFile);

    this.nginxProcess = spawn("nginx", ["-c", tmpConfigFile], { stdio: "inherit" });
    
    // const nginxLogger = new Logger("Nginx");
    // this.nginxProcess.stderr.pipe(split2()).on("data", (data) => {
    //   nginxLogger.error(data);
    // });
    // if (this.config.nginx.enableLogging) {
    //   this.nginxProcess.stdout.pipe(split2()).on("data", (data) => {
    //     nginxLogger.info(data);
    //   });
    // }
  }

  public startSessionForClient(clientName: string): Broadcaster {
    if (this.broadcaster.has(clientName)) {
      return this.broadcaster.get(clientName);
    }
    const broadcaster = new Broadcaster(clientName, this.config.nginx.rtmpUrl);
    this.broadcaster.set(clientName, broadcaster);
    return broadcaster;
  }

}
