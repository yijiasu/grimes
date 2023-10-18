import HLS from "hls.js";
import $ from "cash-dom";
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const playlistUrl = "http://localhost:8084/hls/output.m3u8";
if (HLS.isSupported()) {
  // alert("HLS is supported");
  const hls = new HLS();
  const video = $("#live").get(0) as HTMLMediaElement;
  hls.loadSource(playlistUrl);
  hls.attachMedia(video);
  hls.on(HLS.Events.MEDIA_ATTACHED, function () {
    video.play();
  });

  $("#play").on("click", () => {
    video.play();
  });
  $("#stop").on("click", () => {
    video.pause();
  });

  (async () => {
    while (true) {
      await sleep(1000);
      console.log("sleeping");
      fetch(playlistUrl).then(res => res.text()).then(txt => {
        $("#pl_display").text(txt);
      });
    }
  })();
}