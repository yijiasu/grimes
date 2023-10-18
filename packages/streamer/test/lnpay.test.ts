import { LightningAddress } from "@getalby/lightning-tools";
import { zbd } from "@zbd/node";
import { StreamerConfig } from "../config";

const PixelPhone_LN_Wallet = "ensuingtenor26@walletofsatoshi.com";

describe("LNPay Test", async function () {
  let config: StreamerConfig;

  before(async function () {
    config = StreamerConfig.createFromEnv();
  });

  it("print config", async function () {
    console.log(config);
  });

  it("should be able to get LN invoice", async function () {
    const ln = new LightningAddress(PixelPhone_LN_Wallet);

    // fetch the LNURL data
    await ln.fetch();

    // get the LNURL-pay data:
    console.log(ln.lnurlpData); // returns a [LNURLPayResponse](https://github.com/getAlby/js-lightning-tools/blob/master/src/types.ts#L1-L15)
    // get the keysend data:
    console.log(ln.keysendData);

    const invoice = await ln.requestInvoice({ satoshi: 10 });
    console.log(invoice.paymentRequest); // print the payment request
    console.log(invoice.paymentHash); // print the payment hash
    
  });

  it("should be able to pay invoice using ZBD", async function () {
    // const ZBD = new zbd(config.ln.zbdApiKey);
    // await ZBD.sendPayment
    const ln = new LightningAddress(PixelPhone_LN_Wallet);
    await ln.fetch();
    const invoice = await ln.requestInvoice({ satoshi: 10 });

    const ZBD = new zbd(config.ln.zbdApiKey);
    await ZBD.sendPayment({
      invoice: invoice.paymentRequest,
      description: "",
      internalId: "",
      callbackUrl: "",
      amount: "",
    });

  });
});
