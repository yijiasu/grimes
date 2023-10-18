import { StreamerConfig } from "../config";
import { BaseService, ServiceName } from "./base";
import Fastify, {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
} from "fastify";
import cors from "@fastify/cors";
import { VideoStreamService } from "./stream";

export class HTTPService extends BaseService {
  private fastify: FastifyInstance;
  private vsService: VideoStreamService;

  constructor(config: StreamerConfig) {
    super(config, "HTTPService");
    this.fastify = Fastify({
      logger: false,
    });
    this.fastify.register(cors, { origin: "*" });
    this.setupRoutes();
  }

  public dependencies(): Array<ServiceName> {
    return ["VideoStreamService"];
  }
  protected async onServiceStart(): Promise<void> {
    this.vsService = this.serviceManager.getService("VideoStreamService");
    await this.startFastify();
  }
  protected async onServiceStop(): Promise<void> {}

  private async startFastify() {
    await this.fastify.listen({ port: this.config.http.port });
    this.logger.info(`Fastify listening on ${this.config.http.port}`);
  }

  private setupRoutes() {
    this.fastify.get("/", async (request, reply) => {
      return "Lightning Streamer Backend is running";
    });

    // this function is called by streamer client to get the metadata
    this.fastify.get("/metadata", async (request, reply) => {
      return { "metadata": "This is my metadata. It should give information about the fee" };
    });

    // this function is called by streamer client to start the streaming request
    this.fastify.post("/start", async (request, reply) => {
      const { clientName } = request.body as any;
      const broadcaster = this.vsService.startSessionForClient(clientName);
      return {
        method: "start",
        status: "ok",
        pushId: broadcaster.pushId,
        rtmpPushUrl: broadcaster.getrtmpUrl(),
      };
      // return { "method": "start", "status": "ok", clientName };
    });

    // this function is called by streamer client to streaming invoice
    this.fastify.post("/send_invoice",async (request, reply) => {
      return { "status": "ok" };

    });

    // this function is called by streamer client to check if the invoice is paid
    this.fastify.get("/check_invoice", async (request, reply) => {
      return { "status": "ok" };

    });


  }
}
