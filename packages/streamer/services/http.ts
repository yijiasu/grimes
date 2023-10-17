import { StreamerConfig } from "../config";
import { BaseService, ServiceName } from "./base";
import Fastify, {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
} from "fastify";
import cors from "@fastify/cors";

export class HTTPService extends BaseService {
  private fastify: FastifyInstance;

  constructor(config: StreamerConfig) {
    super(config, "HTTPService");
    this.fastify = Fastify({
      logger: false,
    });
    this.fastify.register(cors, { origin: "*" });
    this.setupRoutes();
  }

  public dependencies(): Array<ServiceName> {
    return [];
  }
  protected async onServiceStart(): Promise<void> {
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
      return "This is my metadata. It should give information about the fee";
    });

    // this function is called by streamer client to start the streaming request
    this.fastify.post("/start", async (request, reply) => {
      
    });

    // this function is called by streamer client to streaming invoice
    this.fastify.post("/send_invoice",async (request, reply) => {
      
    });

    // this function is called by streamer client to check if the invoice is paid
    this.fastify.get("/check_invoice", async (request, reply) => {
      
    });


  }
}
