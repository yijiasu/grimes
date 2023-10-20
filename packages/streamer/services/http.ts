import { StreamerConfig } from "../config";
import { BaseService, ServiceName } from "./base";
import Fastify, {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
} from "fastify";
import cors from "@fastify/cors";
import replyFrom from "@fastify/reply-from";
import { VideoStreamService } from "./stream";
import { PaymentService } from "./payment";
import { bufferXor } from "@grimes/common";
import { ViewerSessionService } from "./viewer_session";
import fastifyRequestLogger from "@mgcrea/fastify-request-logger";

export class HTTPService extends BaseService {
  private fastify: FastifyInstance;
  private vsService: VideoStreamService;
  private paymentService: PaymentService;
  private viewerSessionService: ViewerSessionService;

  constructor(config: StreamerConfig) {
    super(config, "HTTPService");
    this.fastify = Fastify({
      logger: {
        level: "debug",
        transport: {
          target: "@mgcrea/pino-pretty-compact",
          options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
        },
      },
      disableRequestLogging: true,
      });
    this.fastify.register(fastifyRequestLogger);
    this.fastify.register(cors, { origin: "*" });
    this.setupRoutes();
  }

  public dependencies(): Array<ServiceName> {
    return ["VideoStreamService", "PaymentService"];
  }
  protected async onServiceStart(): Promise<void> {
    this.vsService = this.serviceManager.getService("VideoStreamService");
    this.paymentService = this.serviceManager.getService("PaymentService");
    this.viewerSessionService = this.serviceManager.getService("ViewerSessionService");

    await this.startFastify();
  }
  protected async onServiceStop(): Promise<void> {}

  private async startFastify() {
    await this.fastify.listen({ port: this.config.http.port });
    this.logger.info(`Fastify listening on ${this.config.http.port}`);
    this.logger.info(`URL Endpoint: http://localhost:${this.config.http.port}/`);
  }

  private setupRoutes() {

    this.fastify.register(replyFrom, { base: `http://${this.config.domain}:${this.config.nginx.port}` });

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

    // let ctr = 0;
    // this function is called by streamer client to streaming invoice
    this.fastify.post("/send_invoice",async (request, reply) => {
      const { invoiceRequest } = request.body as any;
      this.logger.info("Recv invoice from broadcaster");

      // we pay immediately when receiving the invoice
      // for testing purpose we can just discard some of the invoice to make the broadcaster unhappy
      // it should suspend the streaming if too many invoices are not paid

      // if (ctr < 3) {
        // this.paymentService.payInvoice(invoiceRequest).catch(err => {
        //   this.logger.error("Error paying invoice", err);
        // });  
      // }

      // ctr++;

      return { "status": "ok" };
    });


    // this function is called by the viewer to fetch the hls key for video segment decryption
    this.fastify.post("/viewer_start", async (request, reply) => {
      const { viewerName } = request.body as any;

      return { "status": "ok", playlist: `http://${this.config.domain}:${this.config.http.port}/viewer_playlist?viewerName=` + viewerName };
      
    });

    this.fastify.get("/viewer_playlist", async (request, reply) => {
      const { viewerName } = request.query as any;
      if (!viewerName) {
        throw new Error("No viewerName provided");
      }

      const nginxHost = `${this.config.domain}:${this.config.nginx.port}`;
      const httpHost = `${this.config.domain}:${this.config.http.port}`;

      let upstreamPlaylist = await fetch(`http://${nginxHost}/hls/output.m3u8`).then(res => res.text());

      upstreamPlaylist = upstreamPlaylist.replace(/{{HLS_KEY_URL,(.*)}}/g, `http://${httpHost}/viewer_hlskey?envKey=$1&viewerName=${viewerName}`);
      upstreamPlaylist = upstreamPlaylist.replace(/(output\d+\.ts)/g, `http://${httpHost}/hls_ts/$1`)

      return upstreamPlaylist;
    });

    this.fastify.get("/viewer_hlskey", async (request, reply) => {
      const { viewerName, envKey } = request.query as any;
      if (!viewerName) {
        throw new Error("No viewerName provided");
      }
      if (!envKey) {
        throw new Error("No envKey provided");
      }
      if (envKey.length !== 32) {
        throw new Error("envKey length should be 32");
      }

      // TODO: We should decide whether to give or NOT give the segKey based on the payment history of that viewer
      // e.g. if the viewer has too many unpaid invoices, we should not give the segKey and cut the stream

      // TODO: hardcoded masterKey
      const masterKey = this.config.viewer.masterKey;
      const segKey = bufferXor(Buffer.from(envKey, "hex"), Buffer.from(masterKey, "hex")).toString("hex");

      const session = this.viewerSessionService.getSession(viewerName);
      if (!session.isHealthy()) {
        this.logger.error(`Viewer ${viewerName} is not healthy. Asking for HLS Key will be rejected`);
        return reply.code(402).type("text/plain").send("402 Payment Required: Too many invoice unpaid");
      }
      return segKey;
    });
    
    this.fastify.get("/hls_ts/:ts", async (request, reply) => {
      const { ts } = request.params as any;
      return reply.from(`http://${this.config.domain}:${this.config.nginx.port}/hls/${ts}`);
    });


    // it's now free to start a session
    this.fastify.post("/start_viewer_session", async (request, reply) => {
      const { viewerName } = request.body as any;
      const session = this.viewerSessionService.startSession(viewerName);
      return { playlist: session.getPlaylistUrl() };
    });

    this.fastify.get("/get_pending_invoice", async (request, reply) => {
      const { viewerName } = request.query as any;
      const session = this.viewerSessionService.getSession(viewerName);
      return { status: "ok", pendingInvoices: session.unpaidInvoices };
    });

    this.fastify.get("/get_paid_invoice", async (request, reply) => {
      const { viewerName } = request.query as any;
      const session = this.viewerSessionService.getSession(viewerName);
      return { status: "ok", paidInvoices: session.paidInvoices };
    });

    this.fastify.get("/get_all_invoice", async (request, reply) => {
      const { viewerName } = request.query as any;
      const session = this.viewerSessionService.getSession(viewerName);
      const allInvoices = [
        ...session.unpaidInvoices,
        ...session.paidInvoices,
      ].sort((a, b) => a.seq - b.seq);
      return { status: "ok", allInvoices };
    });


  }
}
