import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { InferenceProviderKind } from '../services/inference/types';
import { InferenceRoutingOverride } from '../services/config/types';
import {
  getAllProviderConfigs,
  saveProviderConfig,
  listProviderModels,
} from '../services/config/appConfig';

interface InferenceConfigModalProps {
  isOpen: boolean;
  providers: InferenceProviderKind[];
  value: InferenceRoutingOverride;
  modelOptions: Record<'light' | 'normal', string[]>;
  modelLoading: Record<'light' | 'normal', boolean>;
  onProviderChange: (level: 'light' | 'normal', provider: InferenceProviderKind) => void;
  onModelChange: (level: 'light' | 'normal', model: string) => void;
  onClose: () => void;
}

const SECTION_LABEL: Record<'light' | 'normal', string> = {
  light: 'Light Inference',
  normal: 'Normal Inference',
};

export const InferenceConfigModal: React.FC<InferenceConfigModalProps> = ({
  isOpen,
  providers,
  value,
  modelOptions,
  modelLoading,
  onProviderChange,
  onModelChange,
  onClose,
}) => {
  const [activeProviderTab, setActiveProviderTab] = useState<string>(providers[0] || 'gemini');
  const [providerSecrets, setProviderSecrets] = useState<Record<string, Record<string, string>>>({});
  const [secretError, setSecretError] = useState<string | null>(null);
  const [secretSaving, setSecretSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const configs = getAllProviderConfigs();
      setProviderSecrets(configs);
      setSecretError(null);
      setActiveProviderTab(providers[0] || 'gemini');
    }
  }, [isOpen, providers]);

  const hasApiKey = providers.some(
    (p) => providerSecrets[p]?.apiKey && providerSecrets[p].apiKey.length > 0
  );

  const handleSaveProviderConfig = async () => {
    const config = providerSecrets[activeProviderTab];
    if (!config) return;

    setSecretSaving(true);
    saveProviderConfig(activeProviderTab, config);

    try {
      const models = await listProviderModels(activeProviderTab as InferenceProviderKind);
      if (models.length === 0) {
        setSecretError('Failed to fetch models - check API key');
      } else {
        setSecretError(null);
      }
    } catch (e) {
      setSecretError('Invalid API key');
    } finally {
      setSecretSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Inference Configuration</h3>
          <p className="text-sm text-slate-500 mt-1">
            {!hasApiKey && (
              <span className="text-amber-600">Configure your LLM provider to enable inference settings. </span>
            )}
            Changes to provider/model are applied when you click Start Training.
          </p>
        </div>

        {!hasApiKey && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">API Key Required - Add your provider credentials below to enable inference settings.</p>
          </div>
        )}

        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Provider Settings</h4>
          <div className="flex gap-1 mb-2 flex-wrap">
            {providers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setActiveProviderTab(p)}
                className={`px-3 py-1 text-xs rounded ${
                  activeProviderTab === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="p-3 border border-slate-200 rounded-lg space-y-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">API Key</label>
              <input
                type="password"
                value={providerSecrets[activeProviderTab]?.apiKey || ''}
                onChange={(e) => {
                  const current = providerSecrets[activeProviderTab] || {};
                  setProviderSecrets({
                    ...providerSecrets,
                    [activeProviderTab]: { ...current, apiKey: e.target.value },
                  });
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Enter API key"
              />
            </div>
            {(activeProviderTab === 'local_openai_compatible' || activeProviderTab === 'lmstudio') && (
              <div>
                <label className="block text-xs text-slate-600 mb-1">Base URL</label>
                <input
                  type="text"
                  value={providerSecrets[activeProviderTab]?.baseURL || ''}
                  onChange={(e) => {
                    const current = providerSecrets[activeProviderTab] || {};
                    setProviderSecrets({
                      ...providerSecrets,
                      [activeProviderTab]: { ...current, baseURL: e.target.value },
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="http://127.0.0.1:8841"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveProviderConfig}
                disabled={secretSaving}
              >
                {secretSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const current = providerSecrets[activeProviderTab] || {};
                  setProviderSecrets({
                    ...providerSecrets,
                    [activeProviderTab]: { ...current, apiKey: '' },
                  });
                }}
              >
                Clear
              </Button>
            </div>
            {secretError && <p className="text-xs text-red-500 mt-1">{secretError}</p>}
          </div>
        </div>

        <div className="space-y-4">
          {(['light', 'normal'] as const).map((level) => (
            <div
              key={level}
              className={`rounded-xl border p-3 ${
                !hasApiKey ? 'opacity-50 pointer-events-none border-slate-100' : 'border-slate-200'
              }`}
            >
              <h4 className="text-sm font-semibold text-slate-700 mb-3">{SECTION_LABEL[level]}</h4>

              <label className="block text-xs font-medium text-slate-600 mb-1">Provider</label>
              <select
                value={value[level].provider}
                onChange={(e) => {
                  onProviderChange(level, e.target.value as InferenceProviderKind);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                disabled={!hasApiKey}
              >
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>

              <label className="block text-xs font-medium text-slate-600 mt-3 mb-1">Model</label>
              <select
                value={value[level].model}
                onChange={(e) => onModelChange(level, e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                disabled={modelLoading[level] || !hasApiKey}
              >
                {modelOptions[level].map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              {modelLoading[level] && <p className="mt-1 text-xs text-slate-500">Loading models...</p>}
              {!hasApiKey && level === 'light' && (
                <p className="text-xs text-amber-600 mt-2">Add API key above to enable</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
