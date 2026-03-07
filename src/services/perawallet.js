/**
 * Singleton Pera Wallet service.
 *
 * Why singleton?
 * @perawallet/connect v1.5.x keeps an internal WalletConnect bridge connection.
 * Creating more than one PeraWalletConnect instance causes the bridge to
 * re-initialise on every render, which breaks the WebSocket session and results
 * in "PeraWalletConnect was not initialized correctly" when signTransaction is
 * called.  One module-level instance solves this entirely.
 */
import { PeraWalletConnect } from '@perawallet/connect';

class PeraWalletService {
  constructor() {
    // Single PeraWalletConnect instance shared across the whole app
    this._connector = new PeraWalletConnect();
    this.accounts = [];
  }

  // ─── Connection ─────────────────────────────────────────────────────────────

  async connect() {
    console.log('[PeraWallet] Connecting...');
    this.accounts = await this._connector.connect();
    console.log('[PeraWallet] Connected — accounts:', this.accounts);
    return this.accounts;
  }

  /**
   * Silently restores an existing WalletConnect session on page load.
   * Returns the first account address, or '' when there is no saved session.
   */
  async reconnect() {
    try {
      const accounts = await this._connector.reconnectSession();
      if (accounts && accounts.length) {
        this.accounts = accounts;
        console.log('[PeraWallet] Session restored — accounts:', this.accounts);
      }
      return this.accounts[0] || '';
    } catch {
      // No saved session — silent failure is fine
      return '';
    }
  }

  async disconnect() {
    console.log('[PeraWallet] Disconnecting...');
    await this._connector.disconnect();
    this.accounts = [];
  }

  // ─── Signing ────────────────────────────────────────────────────────────────

  /**
   * Sign a single transaction.
   *
   * @perawallet/connect v1.5.x expects SignerTransaction[][] (array of groups).
   * Passing a flat SignerTransaction[] was the v1.3 API and now causes
   * "PeraWalletConnect was not initialized correctly" in newer builds.
   *
   * @param {algosdk.Transaction} txn   - Unsigned transaction object
   * @param {string}              signer - The sender address
   * @returns {Promise<Uint8Array[]>}    - Signed transaction bytes
   */
  async sign(txn, signer) {
    const signerAddress = signer || this.accounts[0];

    if (!signerAddress) {
      throw new Error('No wallet account connected. Connect Pera Wallet first.');
    }

    console.log('[PeraWallet] Requesting signature from:', signerAddress);

    // Wrap in a group (outer array) as required by v1.5.x
    const signedTxn = await this._connector.signTransaction([[
      {
        txn,
        signers: [signerAddress],
      },
    ]]);

    console.log('[PeraWallet] Transaction signed successfully');
    return signedTxn;
  }
}

// Export a single shared instance — imported everywhere by reference
const peraWalletService = new PeraWalletService();
export default peraWalletService;
