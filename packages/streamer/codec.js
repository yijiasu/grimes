const { hideBin } = require("yargs/helpers");
const yargs = require("yargs");
const shelljs = require("shelljs");
const setIntervalAsync = require("set-interval-async/dynamic");
const { spawn } = require("child_process");
const crypto = require("crypto");1
const fs = require("fs");


// import yargs from "yargs";
// import { hideBin } from "yargs/helpers";

// const RTMP_PUSH_CMD = "/opt/homebrew/bin/ffmpeg -i rtmp://localhost/rtmp_push/$name -c:v libx264 -c:a aac -strict -2 -f hls -hls_key_info_file /Users/yijiasu/workspace/ibc/grimes/nginx/hls_key/enc.keyinfo -hls_list_size 0 -hls_time 2 /tmp/hls/output.m3u8 >/dev/stdout 2>/dev/stdout";

const loggerName = "Codec";
function panic(...errMsg) {
  console.error(
    `\u001b[1m\u001b[31m[${loggerName}] PANIC:\u001b[39m`,
    ...errMsg,
    "\u001b[0m"
  );
  process.exit(1);
}

function info(...infoMsg) {
  console.log(
    `\u001b[1m\u001b[32m[${loggerName}] INF:\u001b[39m` + END_MARK,
    ...infoMsg,
  );
}

const bufferXor = (a, b) => {
  if (a.length !== b.length) {
    throw new Error("Buffer lengths must match");
  }
  const result = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
};


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


const keyInfoPath = "/tmp/hls_enc.keyinfo";
const keyPath = "/tmp/hls_enc.key";

async function main(argv) {

  const { ffmpegPath, masterKey, streamName } = argv;
  if (!masterKey) {
    panic("masterKey is required");
  }

  if (!streamName) {
    panic("streamName is required");
  }

  if (!ffmpegPath) {
    panic("ffmpegPath is required");
  }

  console.log("=== Env ===");
  console.log(process.env);

  console.log("=== CWD ===");
  console.log(process.cwd());

  const masterKeyBuf = Buffer.from(masterKey, "hex");
  if (masterKeyBuf.length !== 16) {
    panic("masterKey must be 16 bytes");
  }

  // const keyInfoPath = "/Users/yijiasu/workspace/ibc/grimes/nginx/hls_key/enc.keyinfo";

  const RTMP_PUSH_CMD = `-i rtmp://localhost/rtmp_push/${streamName} -c:v libx264 -c:a aac -strict -2 -g 30 -f hls -hls_list_size 3 -hls_key_info_file ${keyInfoPath} -hls_flags delete_segments+periodic_rekey -hls_time 0 /tmp/hls/output.m3u8`;

  // write first key info
  keyInfoRotateHandler(masterKeyBuf);

  spawn(ffmpegPath, RTMP_PUSH_CMD.split(" "), {
    stdio: "inherit",
  });

  while (true) {
    await sleep(30000);
    keyInfoRotateHandler(masterKeyBuf);
  }
}

// {{HLS_KEY_URL}}
// /Users/yijiasu/workspace/ibc/grimes/nginx/hls_key/enc.key
// ecd0d06eaf884d8226c33928e87efa33

function makeKeyInfo(masterKeyBuf, segNumber) {
  // AES-128 is used here. Hence 16 bytes key
  const segmentKey = Buffer.concat([Buffer.from([0xff, 0x3d, 0x66, 0x88]), crypto.randomBytes(12)]);
  const iv = crypto.randomBytes(16);
  const envelopeKey = bufferXor(masterKeyBuf, segmentKey);
  const keyInfoContent = [
    `{{HLS_KEY_URL,${envelopeKey.toString("hex")}}}`,
    keyPath,
    iv.toString("hex"),
  ].join("\n");
  const key = segmentKey.toString("hex");

  return [key, keyInfoContent];
}


let counter = 0;
// this handler is called every few minutes to rotate the key
function keyInfoRotateHandler(masterKeyBuf) {
  const [key, keyInfoContent] = makeKeyInfo(masterKeyBuf, counter);

  // write to keyinfo file
  fs.writeFileSync(keyInfoPath, keyInfoContent);
  fs.writeFileSync(keyPath, key);

  counter++;
}

main(yargs(hideBin(process.argv)).argv);

process.on("unhandledRejection", (err) => {
  throw err;
});
