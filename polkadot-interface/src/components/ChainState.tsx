import React, { useState, useEffect } from 'react';
import { JSONTree } from 'react-json-tree';
import ApiService from '../services/api';

const ChainState: React.FC = () => {
  const [modules, setModules] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [params, setParams] = useState<string[]>([]);
  const [inputParams, setInputParams] = useState<string[]>([]);
  const [blockHash, setBlockHash] = useState<string>('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const api = ApiService.getInstance().getApi();
      setModules(Object.keys(api.query).sort());
    })();
  }, []);

  useEffect(() => {
    if (!selectedModule) return;
    const api = ApiService.getInstance().getApi();
    setMethods(Object.keys(api.query[selectedModule]).sort());
    setSelectedMethod('');
    setParams([]);
    setInputParams([]);
    setResult(null);
  }, [selectedModule]);

  useEffect(() => {
    if (!selectedModule || !selectedMethod) return;
    const api = ApiService.getInstance().getApi();
    const fn = (api.query[selectedModule][selectedMethod] as any);
    const paramDefs = fn.meta?.args?.map((arg: any) => arg.name.toString()) || [];
    setParams(paramDefs);
    setInputParams(new Array(paramDefs.length).fill(''));
    setResult(null);
  }, [selectedModule, selectedMethod]);

  const handleParamChange = (i: number, v: string) => {
    const copy = [...inputParams];
    copy[i] = v;
    setInputParams(copy);
  };

  const executeQuery = async () => {
    const api = ApiService.getInstance().getApi();
    try {
      let q = (api.query[selectedModule][selectedMethod] as any);
      if (blockHash) {
        q = q.at(blockHash);
      }

      const res = params.length
        ? await q(...inputParams)
        : await q();
      setResult(res.toHuman ? res.toHuman() : res);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Chain State Query</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Block hash to query at
        </label>
        <input
          type="text"
          value={blockHash}
          onChange={e => setBlockHash(e.target.value)}
          placeholder="0x1234abcd…"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
        <select
          value={selectedModule}
          onChange={e => setSelectedModule(e.target.value)}
          className="block w-full border-gray-300 rounded-md p-2"
        >
          <option value="">Select a module</option>
          {modules.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {selectedModule && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select
            value={selectedMethod}
            onChange={e => setSelectedMethod(e.target.value)}
            className="block w-full border-gray-300 rounded-md p-2"
          >
            <option value="">Select a method</option>
            {methods.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {params.map((p, i) => (
        <div className="mb-4" key={i}>
          <label className="block text-sm font-medium text-gray-700">{p}</label>
          <input
            type="text"
            value={inputParams[i]}
            onChange={e => handleParamChange(i, e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder={p}
          />
        </div>
      ))}

      {selectedModule && selectedMethod && (
        <button
          onClick={executeQuery}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Execute Query
        </button>
      )}

      {result !== null && (
        <div className="mt-6 bg-gray-50 p-4 rounded overflow-auto">
          <JSONTree data={result} hideRoot={true} />
        </div>
      )}
    </div>
  );
};

export default ChainState;
