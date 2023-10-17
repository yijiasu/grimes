const END_MARK = "\u001b[0m";
export class Logger {
  constructor(public loggerName: string) {}

  getDate() {
    return new Date().toLocaleTimeString("en-US");
  }
  panic(...errMsg: Array<any>) {
    console.error(
      this.getDate(),
      `\u001b[1m\u001b[31m[${this.loggerName}] PANIC:\u001b[39m`,
      ...errMsg,
      "\u001b[0m"
    );
    process.exit(1);
  }

  info(...infoMsg: Array<any>) {
    console.log(
      this.getDate(),
      `\u001b[1m\u001b[32m[${this.loggerName}] INF:\u001b[39m` + END_MARK,
      ...infoMsg,
    );
  }

  dbg(...infoMsg: Array<any>) {
    if (process.env["MINER_DEBUG"]) {
      console.log(
        this.getDate(),
        `\u001b[1m\u001b[34m[${this.loggerName}] DBG:\u001b[39m` + END_MARK,
        ...infoMsg,
      );
    }
  }


  error(...infoMsg: Array<any>) {
    console.log(
      this.getDate(),
      `\u001b[1m\u001b[31m[${this.loggerName}] ERR:\u001b[39m` + END_MARK,
      ...infoMsg
    );
  }
  debugObjects(...infoMsg: Array<any>) {
    if (process.env["MINER_DEBUG"]) {
      console.dir(...infoMsg, { depth: null });
    }
  }
}
