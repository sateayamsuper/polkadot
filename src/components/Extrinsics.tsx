// Extrinsics component to submit transactions
import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

// Add TypeScript declaration for window.injectedWeb3
declare global {
  interface Window {
    injectedWeb3?: Record<string, any>;
  }
}

interface Account {
  address: string;
  meta: {
    name: string;
    source?: string;
    [key: string]: any;
  };
}

const Extrinsics: React.FC = () => {
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [methods, setMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [params, setParams] = useState<any[]>([]);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [hash, setHash] = useState<string>('');

  useEffect(() => {
    const loadModules = async () => {
      try {
        const apiService = ApiService.getInstance();
        if (!apiService.isApiConnected()) {
          setError('API not connected');
          return;
        }
        
        const api = apiService.getApi();
        
        // Get all tx modules
        const moduleNames = Object.keys(api.tx).sort();
        setModules(moduleNames);
        
        if (moduleNames.length