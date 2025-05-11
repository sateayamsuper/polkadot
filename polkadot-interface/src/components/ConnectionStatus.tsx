// src/components/ConnectionStatus.tsx
import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface ChainInfo {
  chain: string;
  nodeName: string;
  nodeVersion: string;
  peers: number;
  expectedPeers: number;
  isSyncing: boolean;
  bestBlock: number;
  finalizedBlock: number;
}

const ConnectionStatus: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [chainInfo, setChainInfo] = useState<ChainInfo>({
    chain: '',
    nodeName: '',
    nodeVersion: '',
    peers: 0,
    expectedPeers: 0,
    isSyncing: false,
    bestBlock: 0,
    finalizedBlock: 0,
  });

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const svc = ApiService.getInstance();
        const isConnected = svc.isApiConnected();
        if (!mounted) return;
        setConnected(isConnected);

        if (isConnected) {
          const api = svc.getApi();
          const [
            chain,
            name,
            version,
            health,
            syncState,
            best,
            finalized,
          ] = await Promise.all([
            api.rpc.system.chain(),
            api.rpc.system.name(),
            api.rpc.system.version(),
            api.rpc.system.health(),
            api.rpc.system.syncState().catch(() => null),
            api.derive.chain.bestNumber(),
            api.derive.chain.bestNumberFinalized(),
          ]);

          let isSyncing = false;
          if (syncState && typeof syncState === 'object') {
            const entry = Object.entries(syncState as Record<string, any>)
              .find(([k, v]) => k.toLowerCase().includes('sync') && typeof v === 'boolean');
            isSyncing = Boolean(entry?.[1]);
          }

          if (!mounted) return;
          setChainInfo({
            chain: chain.toString(),
            nodeName: name.toString(),
            nodeVersion: version.toString(),
            peers: typeof health.peers.toNumber === 'function'
              ? health.peers.toNumber()
              : 0,
            expectedPeers: typeof health.shouldHavePeers === 'boolean'
              ? (health.shouldHavePeers ? 1 : 0)
              : 0,
            isSyncing,
            bestBlock: best.toNumber(),
            finalizedBlock: finalized.toNumber(),
          });
        }
      } catch (e) {
        console.error('ConnectionStatus error:', e);
        if (mounted) setConnected(false);
      }
    };

    fetchStatus();
    const iv = setInterval(fetchStatus, 5000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium text-gray-900">Connection Status</h3>
      </div>
      <div className="border-t border-gray-200">
        <dl>
          {/* Status */}
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {connected ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  Disconnected
                </span>
              )}
            </dd>
          </div>

          {connected && (
            <>
              {/* Chain Info */}
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Chain</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{chainInfo.chain}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Node</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {chainInfo.nodeName} v{chainInfo.nodeVersion}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Peers</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{chainInfo.peers}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Expected Peers</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{chainInfo.expectedPeers}</dd>
              </div>

              {/* Blocks */}
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Best Block</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{chainInfo.bestBlock}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Finalized Block</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{chainInfo.finalizedBlock}</dd>
              </div>

              {/* Sync Status */}
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Sync Status</dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  {chainInfo.isSyncing ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                      Syncing
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      Synced
                    </span>
                  )}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </div>
  );
};

export default ConnectionStatus;
