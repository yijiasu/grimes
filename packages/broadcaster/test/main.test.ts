import { expect } from "chai";

const STREAMER_URL = "http://localhost:8083";
describe("Broadcaster Test", async function () {
  it("should pass", async function () {
    expect(true).to.be.true;
  });

  it("should get metadata", async function () {
    const resp = await fetch(`${STREAMER_URL}/metadata`).then((res) =>
      res.json()
    );
    console.log(resp);
  });

  it("should be able to start streaming request", async function () {
    const postBody = {
      clientName: "porn-start-1",
    };
    const resp = await fetch(`${STREAMER_URL}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postBody),
    }).then((res) => res.json());
    console.log(resp);
  });
});
