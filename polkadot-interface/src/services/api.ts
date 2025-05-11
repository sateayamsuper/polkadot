// API Service for Polkadot connection
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';

class ApiService {
  private static instance: ApiService;
  private api: ApiPromise | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private accounts: any[] = [];

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  public async connect(endpoint: string): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        const provider = new WsProvider(endpoint);
        this.api = await ApiPromise.create({ provider });

        // Get chain information
        const [chain, nodeName, nodeVersion] = await Promise.all([
          this.api.rpc.system.chain(),
          this.api.rpc.system.name(),
          this.api.rpc.system.version()
        ]);
        
        console.log(`Connected to ${chain} using ${nodeName} v${nodeVersion}`);
        this.isConnected = true;
        
        // Enable wallet extension
        const extensions = await web3Enable('Polkadot Interface');
        if (extensions.length === 0) {
          console.warn('No extension found. Please install PolkadotJS extension.');
        } else {
          // Get accounts
          this.accounts = await web3Accounts();
          console.log(`Found ${this.accounts.length} accounts`);
        }
        
        resolve();
      } catch (error) {
        console.error('Connection error:', error);
        this.isConnected = false;
        this.api = null;
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Get API instance
  public getApi(): ApiPromise {
    if (!this.api) {
      throw new Error('API not connected. Call connect() first.');
    }
    return this.api;
  }

  // Check if API is connected
  public isApiConnected(): boolean {
    return this.isConnected && !!this.api;
  }

  // Get accounts from extension
  public getAccounts(): any[] {
    return this.accounts;
  }

  // Disconnect API
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
