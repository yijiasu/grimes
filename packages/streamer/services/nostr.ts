import { Invoice } from '@grimes/common/model';
import { StreamerConfig } from '../config';
import { BaseService, ServiceName } from './base';
import NDK, { NDKEvent, NDKPrivateKeySigner, NDKUser } from '@nostr-dev-kit/ndk';
import { ViewerInfo } from './viewer_session';

export class NostrService extends BaseService {
  private ndk: NDK;
  constructor(config: StreamerConfig) {
    super(config, 'NostrService');
  }

  public dependencies(): Array<ServiceName> {
    return [];
  }
  protected async onServiceStart(): Promise<void> {
    const pkSigner = new NDKPrivateKeySigner(this.config.nostr.privateKey);
    this.ndk = new NDK({
      explicitRelayUrls: ['ws://localhost:7000'],
      signer: pkSigner,
    });
    await this.ndk.connect();
    console.log(this.ndk);
  }
  protected async onServiceStop(): Promise<void> {}

  public dispatchInvoice(invoice: Invoice, viewerInfo?: ViewerInfo) {
    if (viewerInfo) {
      const recipient = new NDKUser({ npub: viewerInfo.npub });
      const ndkEvent = new NDKEvent(this.ndk);
      ndkEvent.kind = 28001; // this should betweeen 20000 and 30000
      ndkEvent.content = invoice.request;
      ndkEvent.tag(recipient);
      ndkEvent
        .publish()
        .then(() => {
          this.logger.info('Dispatched invoice to viewer via NOSTR', {
            viewerInfo,
            invoice,
          });
        })
        .catch(this.logger.error);
    }
  }
}
