/// <reference types="@webbtc/webln-types" />

import HLS from "hls.js";
import $ from "cash-dom";
import { PaidStreamingViewer } from "./paid-streaming-viewer";
import { Invoice } from "@grimes/common/model";
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// const playlistUrl = "http://localhost:8083/viewer_playlist?viewerName=24";
let psv: PaidStreamingViewer;

function setupWebLn() {
  // await window.webln.enable();
  $("#btn_connect_wallet").on("click", async () => {
    await window.webln.enable();
    refreshWebLNStatus();
  });
}

function setupPlayer() {
  $("#play").on("click", () => {
    startPlayerSession();
  });
  // $("#stop").on("click", () => {
  //   video.pause();
  // });
}

function getVideoPlayer(): HTMLMediaElement {
  return $("#live").get(0) as HTMLMediaElement
}

function createInvoiceHtml(invoice: Invoice) {
return `
  <div class="invoice">
    <h3>Invoice #${invoice.seq}</h3>
    <ul>
      <li>Due Amount: ${invoice.amount} sats</li>
      <li>Created: ${invoice.createdAt}</li>
    </ul>
  </div>
  `;
}

async function startPlayerSession() {
  psv = new PaidStreamingViewer("http://localhost:8083", "NEW_PLAYER");
  psv.on("onUpdatePendingInvoices", e => {
    const pendingInvoices = e.detail as Array<Invoice>;
    const toUpdateHtml = pendingInvoices.map(createInvoiceHtml).join("");
    $("#unpaid_invoice_row").html(toUpdateHtml);
    $("#label_unpaid_invoice_count").text(pendingInvoices.length.toString());
    console.log("pendingInvoices", pendingInvoices);
  });

  psv.on("onUpdatePaidInvoices", e => {
    const paidInvoices = e.detail as Array<Invoice>;
    console.log("paidInvoices", paidInvoices);
    $("#paid_invoice_row").html(paidInvoices.map(createInvoiceHtml).join(""));
    $("#label_unpaid_invoice_count").text(paidInvoices.length.toString());
  });

  const playlist = await psv.start();

  const hls = new HLS();
  const video = getVideoPlayer();
  hls.loadSource(playlist);
  hls.attachMedia(video);
  hls.on(HLS.Events.MEDIA_ATTACHED, function () {
    video.play();
  });

  $("#btn_enable_autopay").on("click", () => {
    psv.enableAutoPay();
  });

}

function refreshStatus() {
  refreshWebLNStatus();
}

async function refreshWebLNStatus() {

  $("#label_webln_status").text("NOT DETECTED");
  $("#label_webln_connected").text("NOT CONNECTED");
  $("#label_webln_lnaddr").text("N/A");

  if (window.webln) {
    $("#label_webln_status").text("✅  DETECTED");
  }
  else {
    return;
  }

  if (await window.webln?.isEnabled()) {
    $("#label_webln_connected").text("✅  CONNECTED");
  }
  else {
    return;
  }

  const balanceInfo = await window.webln.getBalance();
  $("#label_webln_balance").text(balanceInfo.balance + " sats");

}

function entry() {
  setInterval(refreshStatus, 1000);
  refreshStatus();
  setupWebLn();
  setupPlayer();
}

$(document).ready(entry);

// if (HLS.isSupported()) {
//   // alert("HLS is supported");
//   const hls = new HLS();
//   const video = $("#live").get(0) as HTMLMediaElement;
//   hls.loadSource(playlistUrl);
//   hls.attachMedia(video);
//   hls.on(HLS.Events.MEDIA_ATTACHED, function () {
//     video.play();
//   });

//   $("#play").on("click", () => {
//     video.play();
//   });
//   $("#stop").on("click", () => {
//     video.pause();
//   });

//   (async () => {
//     while (true) {
//       await sleep(1000);
//       console.log("sleeping");
//       fetch(playlistUrl).then(res => res.text()).then(txt => {
//         $("#pl_display").text(txt);
//       });
//     }
//   })();
// }
