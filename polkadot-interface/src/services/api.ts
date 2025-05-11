// src/services/api.ts
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';

class ApiService {
  private static instance: ApiService;
  private api: ApiPromise | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private accounts: any[] = [];

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /** Connect (defaults to ws://127.0.0.1:9944) */
  public async connect(endpoint = 'ws://127.0.0.1:9944'): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    this.connectionPromise = (async () => {
      try {
        const provider = new WsProvider(endpoint);
        this.api = await ApiPromise.create({ provider });
        await this.api.isReady;

        const [chain, name, version] = await Promise.all([
          this.api.rpc.system.chain(),
          this.api.rpc.system.name(),
          this.api.rpc.system.version()
        ]);
        console.log(`Connected to ${chain} via ${name} v${version}`);
        this.isConnected = true;

        const exts = await web3Enable('Polkadot Interface');
        if (exts.length) {
          this.accounts = await web3Accounts();
          console.log(`Injected ${this.accounts.length} account(s)`);
        } else {
          console.warn('No Polkadot extension found');
        }
      } catch (e) {
        this.api = null;
        this.isConnected = false;
        this.connectionPromise = null;
        throw e;
      }
    })();
    return this.connectionPromise;
  }

  public getApi(): ApiPromise {
    if (!this.api) {
      throw new Error('API not connected—call connect() first');
    }
    return this.api;
  }

  public isApiConnected(): boolean {
    return this.isConnected;
  }

  public getAccounts(): any[] {
    return this.accounts;
  }

  public disconnect(): void {
    if (this.api) {
      this.api.disconnect();
      this.api = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }
}

export default ApiService;
