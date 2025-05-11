// Extrinsics component to submit transactions
import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { web3FromAddress } from '@polkadot/extension-dapp';

const Extrinsics: React.FC = () => {
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [methods, setMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [params, setParams] = useState<{name: string, type: string}[]>([]);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [accounts, setAccounts] = useState<{address: string, name: string}[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const loadModules = async () => {
      try {
        const apiService = ApiService.getInstance();
        if (!apiService.isApiConnected()) {
          setError('API not connected');
          return;
        }
        
        const api = apiService.getApi();
        
        // Get all extrinsic modules
        const moduleNames = Object.keys(api.tx).sort();
        setModules(moduleNames);
        
        if (moduleNames.length > 0) {
          setSelectedModule(moduleNames[0]);
        }

        // Load accounts from extension
        const extensionAccounts = await apiService.getAccounts();
        setAccounts(extensionAccounts);
        if (extensionAccounts.length > 0) {
          setSelectedAccount(extensionAccounts[0].address);
        }
      } catch (error) {
        console.error('Error loading modules:', error);
        setError('Failed to load modules: ' + (error instanceof Error ? error.message : String(error)));
      }
    };

    loadModules();
  }, []);

  useEffect(() => {
    const loadMethods = async () => {
      if (!selectedModule) return;
      
      try {
        const apiService = ApiService.getInstance();
        const api = apiService.getApi();
        
        // Get methods for selected module
        const methodNames = Object.keys(api.tx[selectedModule]).sort();
        setMethods(methodNames);
        
        if (methodNames.length > 0) {
          setSelectedMethod(methodNames[0]);
        } else {
          setSelectedMethod('');
        }
        
        // Reset result and params
        setResult('');
        setParams([]);
        setParamValues([]);
        setStatus('');
      } catch (error) {
        console.error('Error loading methods:', error);
        setError('Failed to load methods');
      }
    };

    loadMethods();
  }, [selectedModule]);

  useEffect(() => {
    const loadParams = async () => {
      if (!selectedModule || !selectedMethod) return;
      
      try {
        const apiService = ApiService.getInstance();
        const api = apiService.getApi();
        
        // Get parameter types for selected method
        const method = api.tx[selectedModule][selectedMethod];
        
        // Try to get parameter information
        let methodParams: {name: string, type: string}[] = [];
        
        try {
          // @ts-ignore - Accessing potentially undefined properties
          const meta = method.meta;
          
          if (meta && meta.args) {
            methodParams = meta.args.map((arg: any) => ({
              name: arg.name.toString(),
              type: arg.type.toString()
            }));
          }
        } catch (e) {
          console.warn('Could not extract parameter metadata:', e);
          // Fallback: create generic parameter names
          const numParams = method.argsDef ? Object.keys(method.argsDef).length : 0;
          methodParams = Array(numParams).fill(0).map((_, i) => ({
            name: `param${i}`,
            type: 'unknown'
          }));
        }
        
        setParams(methodParams);
        setParamValues(new Array(methodParams.length).fill(''));
        
        // Reset result
        setResult('');
        setStatus('');
      } catch (error) {
        console.error('Error loading parameters:', error);
        setError('Failed to load parameters');
      }
    };

    loadParams();
  }, [selectedModule, selectedMethod]);

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModule(e.target.value);
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMethod(e.target.value);
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccount(e.target.value);
  };

  const handleParamChange = (index: number, value: string) => {
    const newParamValues = [...paramValues];
    newParamValues[index] = value;
    setParamValues(newParamValues);
  };

  const submitExtrinsic = async () => {
    if (!selectedModule || !selectedMethod || !selectedAccount) {
      setError('Please select a module, method, and account');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult('');
    setStatus('Preparing transaction...');
    
    try {
      const apiService = ApiService.getInstance();
      const api = apiService.getApi();
      
      // Create the extrinsic
      const extrinsic = api.tx[selectedModule][selectedMethod](...paramValues);
      
      // Get the signer from the extension
      setStatus('Requesting signature...');
      const injector = await web3FromAddress(selectedAccount);
      
      // Sign and send the extrinsic
      const unsubFunc = await extrinsic.signAndSend(
        selectedAccount, 
        { signer: injector.signer }, 
        (result: any) => {
          // Handle transaction status updates
          const { status, events = [] } = result;
          
          if (status.isInBlock) {
            setStatus(`Transaction included in block: ${status.asInBlock.toString()}`);
            
            // Process events
            events.forEach(({ event }: any) => {
              if (api.events.system.ExtrinsicSuccess.is(event)) {
                setStatus('Transaction successful!');
                setResult(JSON.stringify({
                  blockHash: status.asInBlock.toString(),
                  events: events.map((e: any) => ({
                    section: e.event.section,
                    method: e.event.method,
                    data: e.event.data.toString()
                  }))
                }, null, 2));
                
                // Unsubscribe from updates
                if (typeof unsubFunc === 'function') {
                  unsubFunc();
                }
              } else if (api.events.system.ExtrinsicFailed.is(event)) {
                // Extract the error
                const [dispatchError] = event.data;
                let errorInfo = '';
                
                // Use type assertion to access the properties
                // @ts-ignore - We know these properties exist at runtime
                if (dispatchError && dispatchError.isModule) {
                  // For module errors, we have the section and method
                  try {
                    // @ts-ignore - We know these properties exist at runtime
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    errorInfo = `${decoded.section}.${decoded.method}: ${decoded.docs.join(' ')}`;
                  } catch (err) {
                    errorInfo = `Module error: ${dispatchError.toString()}`;
                  }
                } else {
                  // Other errors
                  errorInfo = dispatchError.toString();
                }
                
                setStatus('Transaction failed');
                setError(`Error: ${errorInfo}`);
                
                // Unsubscribe from updates
                if (typeof unsubFunc === 'function') {
                  unsubFunc();
                }
              }
            });
          } else if (status.isFinalized) {
            setStatus(`Transaction finalized in block: ${status.asFinalized.toString()}`);
          } else if (status.isReady) {
            setStatus('Transaction is ready');
          } else if (status.isBroadcast) {
            setStatus('Transaction has been broadcast');
          } else if (status.isRetracted) {
            setStatus('Transaction was retracted');
          } else if (status.isFuture) {
            setStatus('Transaction is scheduled for future execution');
          }
        }
      ).catch((error: any) => {
        console.error('Transaction failed:', error);
        setStatus('Transaction failed');
        setError('Failed to submit transaction: ' + (error.message || String(error)));
        setLoading(false);
      });
      
    } catch (error) {
      console.error('Error submitting extrinsic:', error);
      setStatus('Transaction failed');
      setError('Failed to submit transaction: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Submit Extrinsics
        </h3>
        
        <div className="mt-5">
          <label htmlFor="account" className="block text-sm font-medium text-gray-700">
            Account
          </label>
          <select
            id="account"
            name="account"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={selectedAccount}
            onChange={handleAccountChange}
            disabled={accounts.length === 0}
          >
            {accounts.map((account) => (
              <option key={account.address} value={account.address}>
                {account.name} ({account.address.substring(0, 6)}...{account.address.substring(account.address.length - 4)})
              </option>
            ))}
          </select>
          {accounts.length === 0 && (
            <p className="mt-2 text-sm text-red-600">
              No accounts available. Please connect your wallet extension.
            </p>
          )}
        </div>
        
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="module" className="block text-sm font-medium text-gray-700">
              Module
            </label>
            <select
              id="module"
              name="module"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedModule}
              onChange={handleModuleChange}
            >
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="method" className="block text-sm font-medium text-gray-700">
              Method
            </label>
            <select
              id="method"
              name="method"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedMethod}
              onChange={handleMethodChange}
              disabled={methods.length === 0}
            >
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {params.length > 0 && (
          <div className="mt-5">
            <h4 className="text-sm font-medium text-gray-700">Parameters</h4>
            <div className="mt-2 space-y-3">
              {params.map((param, index) => (
                <div key={index}>
                  <label htmlFor={`param-${index}`} className="block text-sm font-medium text-gray-700">
                    {param.name} <span className="text-xs text-gray-500">({param.type})</span>
                  </label>
                  <input
                    type="text"
                    id={`param-${index}`}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={paramValues[index]}
                    onChange={(e) => handleParamChange(index, e.target.value)}
                    placeholder={`Enter ${param.type}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-5">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={submitExtrinsic}
            disabled={loading || !selectedModule || !selectedMethod || !selectedAccount}
          >
            {loading ? 'Submitting...' : 'Submit Extrinsic'}
          </button>
        </div>
        
        {status && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700">Status</h4>
            <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
              {status}
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 text-sm text-red-600">
            {error}
          </div>
        )}
        
        {result && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700">Result</h4>
            <pre className="mt-2 bg-gray-50 p-4 rounded-md overflow-auto text-xs">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Extrinsics;
