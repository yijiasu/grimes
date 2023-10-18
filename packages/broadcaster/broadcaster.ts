import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Logger } from "@grimes/common/logger";
import { sleep } from "@grimes/common";
import { NetClient } from "./net-client";
import { VideoStreamer } from "./video-streamer";
import { PaymentCollector } from "./payment-collector";

const logger = new Logger("Broadcaster");


async function main(argv: Record<string, any>) {
  const { url, file } = argv;
  if (!url) {
    logger.panic("No URL provided");
  }
  if (!file) {
    logger.panic("No file provided");
  }
  
  if (!process.env.ZBD_API_KEY) {
    logger.panic("No ZBD_API_KEY provided");
  }

  const zbdApiKey = process.env.ZBD_API_KEY;

  const netClient = new NetClient(url);
  await netClient.connectivityCheck();

  const metadata = await netClient.getStreamerMetadata();
  logger.info(metadata);

  const { rtmpPushUrl } = await netClient.startStream("porn-start-3");
  logger.info("Pushing video stream to", rtmpPushUrl);

  const vs = VideoStreamer.createFromFile(file);
  vs.attachRtmp(rtmpPushUrl);
  vs.start();

  const pc = new PaymentCollector(zbdApiKey);

  while (true) {
    await sleep(5000);
    logger.info("Runloop started");
    pc.printStatus();

    // 1. send new invoice
    // 2. check our previous invoice is paid, otherwise we stop our video streaming

    const invoice = await pc.createInvoice();
    // console.log(invoice);
    await netClient.sendInvoice(invoice.request);
  }
}

main(yargs(hideBin(process.argv)).argv);

process.on("unhandledRejection", (err) => {
  throw err;
});
