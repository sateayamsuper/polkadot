// src/services/walletConnect.ts

import SignClient from "@walletconnect/sign-client";
import QRCodeModal from "@walletconnect/qrcode-modal";
import type { SessionTypes } from "@walletconnect/types";

const PROJECT_ID = "c1807945eed43dd91d405db01f9b420e";

let signClient: SignClient | null = null;
let session: SessionTypes.Struct | null = null;

/**
 * Initialize WalletConnect v2, open QR, and await approval.
 */
export async function initWalletConnect() {
  if (!signClient) {
    signClient = await SignClient.init({
      projectId: PROJECT_ID,
      metadata: {
        name: "Polkadot dApp",
        description: "A Substrate-based UI",
        url: window.location.origin,
        icons: ["https://walletconnect.com/walletconnect-logo.png"],
      },
    });
  }

  if (!session) {
    const { uri, approval } = await signClient.connect({
      requiredNamespaces: {
        polkadot: {
          methods: ["polkadot_signTransaction"],
          chains: ["polkadot:91b171bb158e2d3848fa23a9f1c25182"],
          events: ["chainChanged", "accountsChanged"],
        },
      },
    });

    if (uri) {
      QRCodeModal.open(uri, () => console.log("QR closed"));
    }

    session = await approval();
    QRCodeModal.close();
  }

  return { signClient, session };
}

/**
 * Pull the first Polkadot account from the approved WC session.
 */
export function getWalletConnectAddress(): string | null {
  if (!session) return null;
  const accounts = session.namespaces.polkadot.accounts;
  const first = accounts[0] || "";
  return first.split(":")[2] || null;
}

/**
 * Ask Nova Wallet (via WC) to sign a SCALE-encoded extrinsic payload.
 */
export async function signTxWithWalletConnect(payload: string) {
  if (!signClient || !session) {
    throw new Error("WalletConnect not initialized");
  }
  const address = getWalletConnectAddress();
  if (!address) {
    throw new Error("No Polkadot account in session");
  }

  const result = await signClient.request({
    topic: session.topic,
    chainId: "polkadot:91b171bb158e2d3848fa23a9f1c25182",
    request: {
      method: "polkadot_signTransaction",
      params: { address, payload },
    },
  });

  return result; // signed payload hex
}
