// Chain State component to query chain state
import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const ChainState: React.FC = () => {
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [methods, setMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [params, setParams] = useState<string[]>([]);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadModules = async () => {
      try {
        const apiService = ApiService.getInstance();
        if (!apiService.isApiConnected()) {
          setError('API not connected');
          return;
        }
        
        const api = apiService.getApi();
        
        // Get all query modules
        const moduleNames = Object.keys(api.query).sort();
        setModules(moduleNames);
        
        if (moduleNames.length > 0) {
          setSelectedModule(moduleNames[0]);
        }
      } catch (error) {
        console.error('Error loading modules:', error);
        setError('Failed to load modules');
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
        const methodNames = Object.keys(api.query[selectedModule]).sort();
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
        const method = api.query[selectedModule][selectedMethod];
        
        // Try to get parameter information
        let paramNames: string[] = [];
        
        try {
          // Try to access metadata through the registry
          const section = api.query[selectedModule];
          const fn = section[selectedMethod];
          
          if (fn && fn.meta && fn.meta.args) {
            paramNames = fn.meta.args.map((arg: any) => arg.name.toString());
          } else {
            // Alternative approach
            const methodMeta = api.registry.findMetaCall(fn.callIndex);
            if (methodMeta && methodMeta.args) {
              paramNames = methodMeta.args.map((arg: any) => arg.name.toString());
            }
          }
        } catch (e) {
          console.warn('Could not extract parameter metadata:', e);
          // Fallback: try to infer from the function signature
          const fnType = method.toString();
          if (fnType.includes('(') && fnType.includes(')')) {
            const paramPart = fnType.split('(')[1].split(')')[0];
            if (paramPart.trim()) {
              paramNames = paramPart.split(',').map((p, i) => `param${i}`);
            }
          }
        }
        
        setParams(paramNames);
        setParamValues(new Array(paramNames.length).fill(''));
        
        // Reset result
        setResult('');
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

  const handleParamChange = (index: number, value: string) => {
    const newParamValues = [...paramValues];
    newParamValues[index] = value;
    setParamValues(newParamValues);
  };

  const queryState = async () => {
    if (!selectedModule || !selectedMethod) return;
    
    setLoading(true);
    setError('');
    
    try {
      const apiService = ApiService.getInstance();
      const api = apiService.getApi();
      
      // Query the chain state
      const method = api.query[selectedModule][selectedMethod];
      let queryResult;
      
      if (params.length === 0) {
        queryResult = await method();
      } else {
        queryResult = await method(...paramValues);
      }
      
      // Format the result
      let formattedResult = '';
      if (queryResult && queryResult.toHuman) {
        formattedResult = JSON.stringify(queryResult.toHuman(), null, 2);
      } else {
        formattedResult = String(queryResult);
      }
      
      setResult(formattedResult);
    } catch (error) {
      console.error('Error querying state:', error);
      setError('Failed to query state: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Chain State Queries
        </h3>
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
                    {param}
                  </label>
                  <input
                    type="text"
                    id={`param-${index}`}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={paramValues[index]}
                    onChange={(e) => handleParamChange(index, e.target.value)}
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
            onClick={queryState}
            disabled={loading || !selectedModule || !selectedMethod}
          >
            {loading ? 'Querying...' : 'Query'}
          </button>
        </div>
        
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

export default ChainState;