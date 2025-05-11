import React, { useEffect, useState } from 'react';
import ApiService from './services/api';
import ChainState from './components/ChainState';
import Extrinsics from './components/Extrinsics';
import ConnectionStatus from './components/ConnectionStatus';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('chainstate');
  const [endpoint, setEndpoint] = useState('ws://127.0.0.1:54152');
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    connectToNode();
  }, []);

  const connectToNode = async () => {
    try {
      setConnectionError('');
      const apiService = ApiService.getInstance();
      await apiService.connect(endpoint);
      setIsConnected(apiService.isApiConnected());
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionError('Failed to connect to the node. Please check if it\'s running.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Polkadot Interface</h1>
      
      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="border p-2 rounded mr-2 flex-grow"
            placeholder="WebSocket Endpoint"
          />
          <button
            onClick={connectToNode}
            className={`px-4 py-2 rounded ${isConnected ? 'bg-green-500' : 'bg-blue-500'} text-white`}
          >
            {isConnected ? 'Connected' : 'Connect'}
          </button>
        </div>
        {connectionError && <p className="text-red-500">{connectionError}</p>}
      </div>
      
      {/* Network Info */}
      {isConnected && <ConnectionStatus />}
      
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 ${activeTab === 'chainstate' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('chainstate')}
        >
          Chain State
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'extrinsics' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('extrinsics')}
        >
          Extrinsics
        </button>
      </div>
      
      {/* Content */}
      <div>
        {isConnected ? (
          <>
            {activeTab === 'chainstate' && <ChainState />}
            {activeTab === 'extrinsics' && <Extrinsics />}
          </>
        ) : (
          <p>Please connect to a node to use this interface.</p>
        )}
      </div>
    </div>
  );
}

export default App;
