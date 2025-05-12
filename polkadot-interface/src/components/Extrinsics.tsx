// src/components/Extrinsics.tsx
import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import { web3FromAddress } from '@polkadot/extension-dapp';

interface ParamDef { name: string; type: string }
interface Account { address: string; name?: string }

const Extrinsics: React.FC = () => {
  const [modules, setModules] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [params, setParams] = useState<ParamDef[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [paramValues, setParamValues] = useState<string[]>([]);

  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 1️⃣ Load modules & accounts on mount
  useEffect(() => {
    (async () => {
      try {
        const svc = ApiService.getInstance();
        const api = svc.getApi();

        const modNames = Object.keys(api.tx).sort();
        setModules(modNames);
        setSelectedModule(''); // start with placeholder

        const accs = svc.getAccounts();
        setAccounts(accs);
        setSelectedAccount(''); // placeholder
      } catch (e: any) {
        console.error(e);
        setError('Failed to load extrinsics modules/accounts');
      }
    })();
  }, []);

  // 2️⃣ Load methods when module changes
  useEffect(() => {
    if (!selectedModule) return;
    const api = ApiService.getInstance().getApi();
    const methNames = Object.keys(api.tx[selectedModule]).sort();
    setMethods(methNames);
    setSelectedMethod('');  // reset to placeholder
    setParams([]);
    setParamValues([]);
    setStatus('');
    setError('');
  }, [selectedModule]);

  // 3️⃣ Load parameter definitions when method changes
  useEffect(() => {
    if (!selectedModule || !selectedMethod) return;
    const api = ApiService.getInstance().getApi();
    const txFn = (api.tx[selectedModule][selectedMethod] as any);

    // metadata args
    let defs: ParamDef[] = txFn.meta?.args?.map((a: any) => ({
      name: a.name.toString(),
      type: a.type.toString()
    })) || [];

    // fallback if metadata missing but fn.length > 0
    if (defs.length === 0 && typeof txFn.length === 'number' && txFn.length > 0) {
      defs = Array.from({ length: txFn.length }, (_, i) => ({
        name: `param${i}`, type: 'unknown'
      }));
    }

    setParams(defs);
    setParamValues(new Array(defs.length).fill(''));
    setStatus('');
    setError('');
  }, [selectedModule, selectedMethod]);

  const onParamChange = (i: number, v: string) => {
    const copy = [...paramValues];
    copy[i] = v;
    setParamValues(copy);
  };

  // 4️⃣ Submit the extrinsic
  const submit = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    try {
      const svc = ApiService.getInstance();
      const api = svc.getApi();

      const tx = (api.tx[selectedModule][selectedMethod] as any)(
        ...paramValues.map(v => v.trim())
      );

      setStatus('Requesting signature…');
      const injector = await web3FromAddress(selectedAccount);

      await tx.signAndSend(
        selectedAccount,
        { signer: injector.signer },
        (result: any) => {
          const s = result.status;
          const events = result.events;

          if (s.isInBlock) {
            setStatus(`In block ${s.asInBlock.toString()}`);

            events.forEach(({ event }: any) => {
              if (api.events.system.ExtrinsicSuccess.is(event)) {
                setStatus('✔ Extrinsic success');
              }
              if (api.events.system.ExtrinsicFailed.is(event)) {
                const [dispatchError] = event.data;
                let msg = dispatchError.toString();
                if ((dispatchError as any).isModule) {
                  const decoded = api.registry.findMetaError((dispatchError as any).asModule);
                  msg = `${decoded.section}.${decoded.name}`;
                }
                setStatus('✖ Extrinsic failed');
                setError(msg);
              }
            });
          } else if (s.isFinalized) {
            setStatus(`Finalized at ${s.asFinalized.toString()}`);
          }
        }
      );
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">Submit Extrinsic</h3>

      {/* Account */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
        <select
          className="block w-full border-gray-300 rounded-md p-2"
          value={selectedAccount}
          onChange={e => setSelectedAccount(e.target.value)}
        >
          <option value="">Select account...</option>
          {accounts.map(a => (
            <option key={a.address} value={a.address}>
              {a.name || a.address.slice(0,6)}…{a.address.slice(-6)}
            </option>
          ))}
        </select>
      </div>

      {/* Module & Method */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
          <select
            className="block w-full border-gray-300 rounded-md p-2"
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
          >
            <option value="">Select module...</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select
            className="block w-full border-gray-300 rounded-md p-2"
            value={selectedMethod}
            onChange={e => setSelectedMethod(e.target.value)}
            disabled={!selectedModule}
          >
            <option value="">Select method...</option>
            {methods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Params */}
      {params.map((p, i) => (
        <div className="mb-4" key={p.name}>
          <label className="block text-sm font-medium text-gray-700">
            {p.name} <span className="text-xs text-gray-500">({p.type})</span>
          </label>
          <input
            type="text"
            value={paramValues[i]}
            onChange={e => onParamChange(i, e.target.value)}
            placeholder={p.type}
            className="mt-1 block w-full border-gray-300 rounded-md p-2"
          />
        </div>
      ))}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={loading || !selectedAccount || !selectedModule || !selectedMethod}
        className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Submitting…' : 'Submit'}
      </button>

      {/* Status & Error */}
      {status && <p className="mt-4 text-sm text-gray-800">{status}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Extrinsics;
