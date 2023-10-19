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

export class HTTPService extends BaseService {
  private fastify: FastifyInstance;
  private vsService: VideoStreamService;
  private paymentService: PaymentService;

  constructor(config: StreamerConfig) {
    super(config, "HTTPService");
    this.fastify = Fastify({
      logger: false,
    });
    this.fastify.register(cors, { origin: "*" });
    this.setupRoutes();
  }

  public dependencies(): Array<ServiceName> {
    return ["VideoStreamService", "PaymentService"];
  }
  protected async onServiceStart(): Promise<void> {
    this.vsService = this.serviceManager.getService("VideoStreamService");
    this.paymentService = this.serviceManager.getService("PaymentService");
    await this.startFastify();
  }
  protected async onServiceStop(): Promise<void> {}

  private async startFastify() {
    await this.fastify.listen({ port: this.config.http.port });
    this.logger.info(`Fastify listening on ${this.config.http.port}`);
    this.logger.info(`URL Endpoint: http://localhost:${this.config.http.port}/`);
  }

  private setupRoutes() {

    this.fastify.register(replyFrom, { base: "http://localhost:8084" });

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

    // this function is called by streamer client to check if the invoice is paid
    this.fastify.get("/check_invoice", async (request, reply) => {
      return { "status": "ok" };
    });

    // this function is called by the viewer to fetch the hls key for video segment decryption
    this.fastify.get("/hlskey", async (request, reply) => {
      this.logger.info("Recv hls key request from viewer");
      return "ecd0d06eaf884d8226c33928e87efa33";
    });

    // this function is called by the viewer to fetch the hls key for video segment decryption
    this.fastify.post("/viewer_start", async (request, reply) => {
      const { viewId } = request.body as any;

      return { "status": "ok", playlist: "http://localhost:8083/viewer_playlist?viewId=" + viewId };
      
    });

    this.fastify.get("/viewer_playlist", async (request, reply) => {
      const { viewId } = request.query as any;
      if (!viewId) {
        throw new Error("No viewId provided");
      }
      let upstreamPlaylist = await fetch("http://localhost:8084/hls/output.m3u8").then(res => res.text());
      // #EXT-X-KEY:METHOD=AES-128,URI="{{HLS_KEY_URL,74e5fecc5cd44f017c38f5ee5b87ba27}}",IV=0x390a23ed3ce950443b8cfbb1e56185ea
      upstreamPlaylist = upstreamPlaylist.replace(/{{HLS_KEY_URL,(.*)}}/g, `http://localhost:8083/viewer_hlskey?envKey=$1&viewId=${viewId}`);
      upstreamPlaylist = upstreamPlaylist.replace(/(output\d+\.ts)/g, 'http://localhost:8083/hls_ts/$1')

      return upstreamPlaylist;
    });

    this.fastify.get("/viewer_hlskey", async (request, reply) => {
      const { viewId, envKey } = request.query as any;
      if (!viewId) {
        throw new Error("No viewId provided");
      }
      if (!envKey) {
        throw new Error("No envKey provided");
      }
      if (envKey.length !== 32) {
        throw new Error("envKey length should be 32");
      }

      // TODO: hardcoded masterKey
      const masterKey = "ecd0d06eaf884d8226c33928e87efa33"
      const segKey = bufferXor(Buffer.from(envKey, "hex"), Buffer.from(masterKey, "hex")).toString("hex");
      return segKey;
    });
    
    this.fastify.get("/hls_ts/:ts", async (request, reply) => {
      const { ts } = request.params as any;
      return reply.from(`http://localhost:8084/hls/${ts}`);
    });


  }
}
