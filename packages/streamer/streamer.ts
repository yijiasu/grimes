import 'dotenv/config'
import "websocket-polyfill";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ServiceManager } from "./services/service-manager";
import { StreamerConfig } from "./config";
import { HTTPService, NostrService, ViewerSessionService } from "./services";
import { VideoStreamService } from "./services/stream";
import { PaymentService } from './services/payment';

async function main(argv: Record<string, any>) {
  const { config } = argv;
  const serviceConfig = StreamerConfig.createFromEnv();
  const serviceManager = new ServiceManager(serviceConfig);

  console.log(serviceConfig)
  serviceManager.registerService(new HTTPService(serviceConfig));
  serviceManager.registerService(new VideoStreamService(serviceConfig));
  serviceManager.registerService(new PaymentService(serviceConfig));
  serviceManager.registerService(new ViewerSessionService(serviceConfig));
  serviceManager.registerService(new NostrService(serviceConfig));

  await serviceManager.startAllServices();
}

main(yargs(hideBin(process.argv)));

process.on("unhandledRejection", (err) => {
  throw err;
});
