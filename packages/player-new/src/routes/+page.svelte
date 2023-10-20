<script>
  import { Navbar, NavbarBrand } from "sveltestrap";
</script>

<video class="bg-video" playsinline autoplay muted loop poster="cake.jpg">
  <source src="bg.mp4" type="video/webm" />
</video>
<div class="main-container rounded-3">
  <div class="container-fluid">
    <div class="row">
      <!-- rounded-top-3 -->
      <nav class="navbar navbar-expand-bg bg-primary navbar-dark">
        <div class="container-fluid">
          <a class="navbar-brand" href="/">LN Streaming</a>
        </div>
      </nav>
    </div>
    <div class="row">
      <div class="border shadow-lg rounded-bottom-3">
        <div class="container-fluid">
          <div class="row">
            <div id="player" class="col">
              <video id="live" controls></video>
            </div>
          </div>
          <div class="row">
            <div id="player-control" class="col player-control">
              <button class="btn btn-success" value="">Start Streaming</button>
              <button class="btn btn-warning" value="">Start Paying</button>
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
                />
                <button
                  class="btn btn-outline-secondary"
                  type="button"
                  id="button-addon2">Confirm</button
                >
              </div>
            </div>
          </div>
          <div class="row info-session">
            <div class="col">
              <h6 class="text-body-tertiary">WALLET INFO</h6>
              <div class="container-fluid">
                <div class="row">
                  <div class="col-4 p-0">
                    <div class="wallet-card alert alert-warning" role="alert">
                      <div class="wallet-balance">400,000</div>
                      <div>sats</div>
                    </div>
                  </div>
                  <div class="col-8">
                    <dl class="row">
                      <dt class="col-sm-4">Wallet Name</dt>
                      <dd class="col-sm-8">test@test.com</dd>
                    </dl>
                    <!-- <div class="alert alert-warning" role="alert">
                        A simple warning alert—check it out!
                      </div> -->
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="row info-session">
            <div class="col">
              <div style="display: flex;">
                <h6 style="flex-grow: 1" class="text-body-tertiary">
                  INVOICE INFO
                </h6>
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm rounded-pill"
                  >Clear</button
                >
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
                  <tr>
                    <th scope="row">1</th>
                    <td>20 sats</td>
                    <td>1 mins ago</td>
                    <td>lnc...</td>
                    <td
                      ><span class="badge rounded-pill bg-warning text-dark"
                        >Unpaid</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">2</th>
                    <td>Jacob</td>
                    <td>Thornton</td>
                    <td>lnc...</td>
                    <td
                      ><span class="badge rounded-pill bg-success">Paid</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>

  .main-container {
    z-index: 20;
    margin-left: auto;
    margin-right: auto;
    width: 720px;
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
  box-shadow: inset 0 0 2000px rgba(255, 255, 255, .5);
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
  
  video {
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

</style>
