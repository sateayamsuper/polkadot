// src/App.tsx
import React, { useState, useEffect } from 'react';
import ApiService from './services/api';
import ConnectionStatus from './components/ConnectionStatus';
import ChainState from './components/ChainState';
import Extrinsics from './components/Extrinsics';

const App: React.FC = () => {
  const [apiReady, setApiReady] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const initApi = async () => {
      try {
        const svc = ApiService.getInstance();
        // Pass your endpoint—or rely on default 'ws://127.0.0.1:9944'
        await svc.connect('wss://polkadot-rpc.publicnode.com');
        setApiReady(true);
      } catch (err: any) {
        console.error('Failed to connect to node', err);
        setError(err.message || 'Connection error');
      }
    };

    initApi();
  }, []);

  // Show a loading state while connecting
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!apiReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Connecting to node...</p>
      </div>
    );
  }

  // Once ready, render your components
  return (
    <div className="min-h-screen bg-gray-100 p-4 space-y-6">
      <ConnectionStatus />
      <ChainState />
      <Extrinsics />
    </div>
  );
};

export default App;
