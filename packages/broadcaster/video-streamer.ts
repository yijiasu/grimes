import { Logger } from "@grimes/common/logger";
import fs from "node:fs";
import shelljs from "shelljs";
import { ChildProcess, spawn } from "node:child_process";
import split2 from "split2";

export class VideoStreamer {
  private logger = new Logger("VideoStreamer");
  private ffmpegLogger = new Logger("FFmpeg");
  private rtmpUrl: string;
  private ffmpeg: ChildProcess;

  constructor(private filePath: string, private mode: "file" | "camera") {
    // ensure FFmpeg is installed
    if (!shelljs.which("ffmpeg")) {
      throw new Error("FFmpeg is not installed");
    }
  }

  public static createFromFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (!fs.lstatSync(filePath).isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }
    if (!filePath.endsWith(".mp4")) {
      throw new Error(`Not a video file: ${filePath}`);
    }
    return new VideoStreamer(filePath, "file");
  }

  public static createFromCamera() {
    throw new Error("Not yet implemented");
  }

  public attachRtmp(rtmpUrl: string) {
    if (!rtmpUrl.startsWith("rtmp://")) {
      throw new Error("Bad rtmp url format");
    }
    this.rtmpUrl = rtmpUrl;
  }

  public start() {
    if (this.ffmpeg) {
      throw new Error("FFmpeg is already running");
    }
    if (!this.rtmpUrl) {
      throw new Error("rtmpUrl is not defined");
    }
    // -loglevel error -hide_banner -progress pipe:1
    // ffmpeg -re -i 1.mp4 -c:v copy -c:a aac -strict -2 -f flv rtmp://localhost/rtmp_push/default
    this.ffmpeg = spawn("ffmpeg", [
      "-loglevel", "error",
      "-hide_banner",
      "-progress", "pipe:1",
      "-re", "-i",
      this.filePath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-strict", "-2",
      "-f", "flv", this.rtmpUrl
    ], { stdio: "pipe" });

    this.ffmpeg.stderr.pipe(split2()).on("data", (data) => {
      this.ffmpegLogger.error(data);
    });

    let pendingData: Array<string> = [];
    this.ffmpeg.stdout.pipe(split2()).on("data", (data) => {
      // this.ffmpegLogger.info(data);
      pendingData.push(data);
      if (data.startsWith("progress=")) {
        const progress = Object.fromEntries(pendingData.map(l => l.split("=")));
        this.progressHandler(progress);
        pendingData = [];
      }
    });
  }

  public stop() {
    this.ffmpeg.kill();
  }

  private progressHandler(progress: Record<string, any>) {
    const { frame, fps, out_time, bitrate } = progress;
    this.logger.info(`frame=${frame}; fps=${fps}; out_time=${out_time}; bitrate=${bitrate}`);
  }
}
