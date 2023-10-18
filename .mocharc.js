'use strict';

module.exports = {
  require: [
    "ts-node/register",
    "reflect-metadata",
    "dotenv/config"
  ],
  recursive: true,
  timeout: '60s',
  exit: true,
  extension: [
    "ts",
    "js",
    "tsx"
  ],
  bail: true
};
