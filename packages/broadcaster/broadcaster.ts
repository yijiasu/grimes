import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Logger } from "@grimes/common/logger";
import { sleep } from "@grimes/common";
import { NetClient } from "./net-client";
import { VideoStreamer } from "./video-streamer";

const logger = new Logger("Broadcaster");


async function main(argv: Record<string, any>) {
  const { url, file } = argv;
  if (!url) {
    logger.panic("No URL provided");
  }
  if (!file) {
    logger.panic("No file provided");
  }

  const netClient = new NetClient(url);
  await netClient.connectivityCheck();

  const metadata = await netClient.getStreamerMetadata();
  logger.info(metadata);

  const { rtmpPushUrl } = await netClient.startStream("porn-start-3");
  logger.info("Pushing video stream to", rtmpPushUrl);

  const vs = VideoStreamer.createFromFile(file);
  vs.attachRtmp(rtmpPushUrl);
  vs.start();

  while (true) {
    logger.info("Runloop started");
    await sleep(1000);
    // 1. send new invoice
    // 2. check our previous invoice is paid, otherwise we stop our video streaming
  }
}

main(yargs(hideBin(process.argv)).argv);

process.on("unhandledRejection", (err) => {
  throw err;
});
