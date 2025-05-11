// Connection Status component to display network information
import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

interface ChainInfo {
  chain: string;
  nodeName: string;
  nodeVersion: string;
  health: string;
  peers: number;
  isSync: boolean;
  isSyncing: boolean;
}

const ConnectionStatus: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [chainInfo, setChainInfo] = useState<ChainInfo>({
    chain: '',
    nodeName: '',
    nodeVersion: '',
    health: '',
    peers: 0,
    isSync: true,
    isSyncing: false
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const apiService = ApiService.getInstance();
        const isConnected = apiService.isApiConnected();
        setConnected(isConnected);
        
        if (isConnected) {
          const api = apiService.getApi();
          const [chain, nodeName, nodeVersion, health, peers] = await Promise.all([
            api.rpc.system.chain(),
            api.rpc.system.name(),
            api.rpc.system.version(),
            api.rpc.system.health(),
            api.rpc.system.peers()
          ]);
          
          // Default sync values
          let isSync = true;
          let isSyncing = false;
          
          try {
            // Try to get sync state if available
            // This is a safer approach that doesn't rely on specific properties
            const syncState = await api.rpc.system.syncState();
            
            // Check if syncState exists and is an object
            if (syncState && typeof syncState === 'object') {
              // Try to determine sync status from available properties
              // Different chains might have different property names
              if ('isSyncing' in syncState) {
                // @ts-ignore - We've checked that the property exists
                isSyncing = Boolean(syncState.isSyncing);
                isSync = !isSyncing;
              } else if ('syncing' in syncState) {
                // @ts-ignore - We've checked that the property exists
                isSyncing = Boolean(syncState.syncing);
                isSync = !isSyncing;
              } else {
                // If we can't find a specific property, check if any property indicates syncing
                const syncStateObj = syncState as Record<string, any>;
                const syncingProps = Object.keys(syncStateObj).filter(key => 
                  key.toLowerCase().includes('sync') && 
                  typeof syncStateObj[key] === 'boolean'
                );
                
                if (syncingProps.length > 0) {
                  isSyncing = Boolean(syncStateObj[syncingProps[0]]);
                  isSync = !isSyncing;
                }
              }
            }
          } catch (e) {
            console.warn('Error getting sync state:', e);
            // If we can't get sync state, assume we're synced
            isSync = true;
            isSyncing = false;
          }
          
          setChainInfo({
            chain: chain.toString(),
            nodeName: nodeName.toString(),
            nodeVersion: nodeVersion.toString(),
            health: health.toString(),
            peers: peers.length,
            isSync,
            isSyncing
          });
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        setConnected(false);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Connection Status
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <dl>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {connected ? (
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Connected
                </span>
              ) : (
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  Disconnected
                </span>
              )}
            </dd>
          </div>
          {connected && (
            <>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Chain</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {chainInfo.chain}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Node</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {chainInfo.nodeName} v{chainInfo.nodeVersion}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Peers</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {chainInfo.peers}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Sync Status</dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  {chainInfo.isSyncing ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Syncing
                    </span>
                  ) : chainInfo.isSync ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Synced
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Not Synced
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