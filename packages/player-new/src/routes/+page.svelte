<script lang="ts">
  import { onMount } from "svelte";
  import { Navbar, NavbarBrand } from "sveltestrap";
  import type { WebLNProvider } from "@webbtc/webln-types";
  import { PaidStreamingViewer } from "$lib/paid-streaming-viewer";
  import { derived, readable, writable } from "svelte/store";
  import HLS from "hls.js";

  interface DisplayInvoice {
    seqNum: number;
    dueAmount: string;
    issuedAt: string;
    paymentReq: string;
    isPaid: boolean;
  }

  let weblnEnabled = false;
  let webln: WebLNProvider;

  let walletBalance = 0;
  let streamerUrl = "https://ste-streamer.yijiasu.me";

  let viewerName = `PlayerName-${Math.random().toString(16).substring(2, 6)}`;

  let psv: PaidStreamingViewer;
  let videoPlayer: HTMLVideoElement;
  let hls: HLS;

  let isStreaming: boolean;
  let isPaying: boolean;
  let isRecovering: boolean = false;

  const lnBalance = readable(0, function start(set) {
    const interval = setInterval(async () => {
      if (weblnEnabled) {
        const balance = await webln.getBalance();
        set(balance.balance);
      }
    }, 1000);
    return function stop() {
      clearInterval(interval);
    };
  });

  const invoices = writable([] as Array<DisplayInvoice>);
  const invoicePaidCount = derived(invoices, ($invoices) => {
    return $invoices.filter((invoice) => invoice.isPaid).length;
  });
  const invoicePendingCount = derived(invoices, ($invoices) => {
    return $invoices.filter((invoice) => !invoice.isPaid).length;
  });

  let lastDecryptionKey: string = "";
  const lastDecryptionKeySeen = writable(undefined as Date | undefined);
  const lastDecryptionKeySeenSeconds = readable(0, function start(set) {
    const interval = setInterval(() => {
      if (!$lastDecryptionKeySeen) {
        return;
      }
      const now = new Date();
      const diff = now.getTime() - $lastDecryptionKeySeen.getTime();
      set(Math.floor(diff / 1000));
    }, 1000);
    return function stop() {
      clearInterval(interval);
    };
  });

  onMount(async () => {
    if (window) {
      streamerUrl = window.location.href.includes("localhost") ? "http://localhost:8083" : "https://ste-streamer.yijiasu.me";
    }
    if (!window.webln) {
      return;
    }
    webln = window.webln;
    if (webln.isEnabled) {
      weblnEnabled = await webln.isEnabled();
      await handleConnectWallet();
    }
  });

  function startHlsRecovery() {
    const interval = setInterval(async () => {
      if (!isRecovering) {
        return;
      }
      try {
        console.log("try to recover");
        hls.attachMedia(videoPlayer);
        hls.loadSource(await psv.start());
        await videoPlayer.play();
        clearInterval(interval);
      } catch (error) {
        console.log("recover failed");
        console.log(error);
      }
    }, 3000);
  }
  function setupPlayer() {
    hls = new HLS({
      liveDurationInfinity: true,
      liveSyncDurationCount: 0
    });
    hls.attachMedia(videoPlayer);
    hls.on(HLS.Events.MEDIA_ATTACHED, function () {
      videoPlayer.play();
    });
    hls.on(HLS.Events.KEY_LOADED, function (event, data) {
      if (data.keyInfo.decryptdata.uri === lastDecryptionKey) {
        return;
      }
      if (isRecovering) {
        isRecovering = false;
      }
      console.log("key loaded");
      console.log(data);
      lastDecryptionKey = data.keyInfo.decryptdata.uri;
      lastDecryptionKeySeen.set(new Date());
    });
    hls.on(HLS.Events.ERROR, function (event, data) {
      console.log("HLS Error: ");
      console.log(data);
      if (data.fatal) {
        isRecovering = true;
        videoPlayer.pause();
        startHlsRecovery();
      }
      // if (data.fatal) {
      //   switch (data.type) {
      //     case HLS.ErrorTypes.NETWORK_ERROR:
      //       // try to recover network error
      //       console.log("fatal network error encountered, try to recover");
      //       hls.startLoad();
      //       break;
      //     case HLS.ErrorTypes.MEDIA_ERROR:
      //       console.log("fatal media error encountered, try to recover");
      //       hls.recoverMediaError();
      //       break;
      //     default:
      //       // cannot recover
      //       hls.destroy();
      //       break;
      //   }
      // }
    });
  }

  function setupPSV() {
    const psv = new PaidStreamingViewer(streamerUrl, viewerName, window.webln!);
    psv.on("onUpdateInvoices", (e) => {
      console.log(e.detail);
      invoices.set(e.detail);
    });
    return psv;
  }

  async function handleConnectWallet() {
    await webln.enable();
    if (await webln.getInfo()) {
      const balance = await webln.getBalance();
      weblnEnabled = true;
      walletBalance = balance.balance;
    }
  }

  async function handleStartStreaming() {
    if (!isStreaming) {
      console.log("start streaming");
      console.log(videoPlayer);
      // alert("start streaming " + streamerUrl);
      setupPlayer();
      psv = setupPSV();
      hls.loadSource(await psv.start());
      isStreaming = true;
    } else {
      alert("stop streaming");
    }
  }

  async function handleAutoPay() {
    if (!isStreaming) {
      return;
    }

    if (!isPaying) {
      psv.enableAutoPay();
      isPaying = true;
    } else {
      psv.disableAutoPay();
      isPaying = false;
    }
  }
</script>

<video class="bg-video" playsinline autoplay muted loop>
  <source src="bg.mp4" type="video/webm" />
</video>

<div class="main-container rounded-3">
  <div class="container-fluid">
    <div class="row">
      <!-- rounded-top-3 -->
      <nav class="navbar navbar-expand-bg bg-primary navbar-dark">
        <div class="container-fluid">
          <a class="navbar-brand" href="/"> ⚡️ LN Streaming</a>
        </div>
      </nav>
    </div>
    <div class="row">
      <div class="border shadow-lg rounded-bottom-3">
        <div class="container-fluid">
          <div class="row">
            <div id="player" class="col">
              <video id="live" controls bind:this={videoPlayer}></video>
            </div>
          </div>
          <div class="row">
            <div id="player-control" class="col player-control">
              <button
                class="btn btn-success"
                value=""
                on:click={handleStartStreaming}
                >{isStreaming ? "Stop Streaming" : "Start Streaming"}</button
              >
              <!-- <button class="btn btn-warning" value="" on:click={handleAutoPay}
                >{isPaying ? "Stop Paying" : "Start Paying"}</button
              > -->
            </div>
          </div>
          <div class="row info-session">
            <div class="col">
              <h6 class="text-body-tertiary">STREAMING INFO</h6>
              <div class="input-group mb-3">
                <input
                  type="text"
                  class="form-control"
                  placeholder="Streamer Address"
                  bind:value={streamerUrl}
                />
                <!-- <button
                  class="btn btn-outline-secondary"
                  type="button"
                  id="button-addon2">Confirm</button
                > -->
              </div>
              <div class="input-group mb-3">
                <input
                  type="text"
                  class="form-control"
                  placeholder="Viewer's Name"
                  bind:value={viewerName}
                />
              </div>
            </div>
          </div>
          <div class="row info-session">
            <div class="col">
              <h6 class="text-body-tertiary">WALLET INFO</h6>
              {#if !weblnEnabled}
                <div class="alert alert-warning" role="alert">
                  <div style="display: flex;">
                    <div style="flex: 1; line-height: 40px">
                      WebLN is not enabled. Please connect your wallet.
                    </div>
                    <button
                      class="btn btn-warning"
                      value=""
                      on:click={handleConnectWallet}>Connect</button
                    >
                  </div>
                </div>
              {:else}
                <div class="container-fluid">
                  <div class="row" style="display: flex; align-items: stretch">
                    <div class="col-4 p-0">
                      <div class="wallet-card alert alert-warning" role="alert">
                        <div class="wallet-balance">{$lnBalance}</div>
                        <div>sats</div>
                      </div>
                    </div>
                    <div class="col-8">
                      <dl class="row">
                        <dt class="col-sm-5">Autopay Invoices</dt>
                        <dd class="col-sm-7">
                          <div class="form-check form-switch">
                            <input
                              disabled={!isStreaming}
                              class="form-check-input"
                              type="checkbox"
                              role="switch"
                              on:change={handleAutoPay}
                            />
                          </div>
                        </dd>
                        <dt class="col-sm-5">Invoices Paid</dt>
                        <dd class="col-sm-7">{$invoicePaidCount}</dd>
                        <dt class="col-sm-5">Invoices Pending</dt>
                        <dd class="col-sm-7">{$invoicePendingCount}</dd>

                      </dl>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
          <div class="row info-session">
            <div class="col">
              <h6 class="text-body-tertiary">VIDEO SEGMENT INFO</h6>
              <dl class="row">

                <dt class="col-sm-5">Last Decryption Key Seen</dt>
                <dd class="col-sm-7">{$lastDecryptionKeySeenSeconds ? `${$lastDecryptionKeySeenSeconds} seconds ago` : "N/A"}</dd>

              </dl>
            </div>
          </div>
          <div class="row info-session">
            <div class="col">
              <div style="display: flex;">
                <h6 style="flex-grow: 1" class="text-body-tertiary">
                  INVOICE INFO
                </h6>
              </div>
              <table class="table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Due Amount</th>
                    <th scope="col">Issued At</th>
                    <th scope="col">Payment Request</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each $invoices as invoice}
                    <tr>
                      <th scope="row">{invoice.seqNum}</th>
                      <td>{invoice.dueAmount} sats</td>
                      <td>{invoice.issuedAt}</td>
                      <td class="ln-request">{invoice.paymentReq}</td>
                      <td>
                        {#if invoice.isPaid}
                          <span class="badge rounded-pill bg-success">Paid</span
                          >
                        {:else}
                          <span class="badge rounded-pill bg-warning text-dark"
                            >Unpaid</span
                          >
                        {/if}
                      </td>
                    </tr>
                  {/each}
                  <!-- <tr>
                    <th scope="row">2</th>
                    <td>Jacob</td>
                    <td>Thornton</td>
                    <td class="ln-request">lnsadasdasdasdasdadasdasdasdasclnsadasdasdasdasdadasdasdasdasclnsadasdasdasdasdadasdasdasdasclnsadasdasdasdasdadasdasdasdasc...</td>
                    <td
                      ><span class="badge rounded-pill bg-success">Paid</span>
                    </td>
                  </tr> -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <div class="copyright">
    <p>Made by Yijia Su</p>
    <p>❤️</p>
    <p>
      Prepared For <br />
      <a target="_blank" href="https://indonesiabitcoinconference.com/"
        >Indonesia Bitcoin Conference Hackathon</a
      >
    </p>
  </div>
</div>

<style>
  .footer {
    margin-top: 50px;
    margin-bottom: 80px;
  }
  .footer .copyright {
    width: 500px;
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }
  .main-container {
    z-index: 20;
    margin-left: auto;
    margin-right: auto;
    width: 780px;
    margin-top: 100px;
    position: relative;
    z-index: 1;
    background: inherit;
    overflow: hidden;
    background-color: rgba(255, 255, 255);
  }

  .main-container:before {
    content: "";
    position: absolute;
    background: inherit;
    z-index: -1;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    box-shadow: inset 0 0 2000px rgba(255, 255, 255, 0.5);
    filter: blur(10px);
    margin: -20px;
  }

  .bg-video {
    object-fit: cover;
    width: 100vw;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    opacity: 0.7;
    z-index: -1;
  }

  #live {
    width: 100%;
  }
  .player-control {
    display: flex;
    justify-content: center;
    /* margin-top: 20px; */
    margin-bottom: 40px;
  }
  .player-control button {
    margin-left: 10px;
    margin-right: 10px;
  }
  .small-padding {
    padding: 10px;
  }

  .wallet-card {
    display: flex;
    align-items: baseline;
  }
  .wallet-balance {
    font-size: xx-large;
    padding-right: 10px;
  }

  #player video {
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .info-session {
    margin-bottom: 20px;
  }

  .ln-request {
    max-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
