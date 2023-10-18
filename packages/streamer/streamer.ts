import 'dotenv/config'

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ServiceManager } from "./services/service-manager";
import { StreamerConfig } from "./config";
import { HTTPService } from "./services";
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

  await serviceManager.startAllServices();
}

main(yargs(hideBin(process.argv)));

process.on("unhandledRejection", (err) => {
  throw err;
});
