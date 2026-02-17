import React from 'react';
import { Button } from './Button';
import { InferenceProviderKind } from '../services/inference/types';
import { InferenceRoutingOverride } from '../services/config/types';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Inference Configuration</h3>
          <p className="text-sm text-slate-500 mt-1">
            Changes are staged and applied when you click Start Training.
          </p>
        </div>

        <div className="space-y-4">
          {(['light', 'normal'] as const).map((level) => (
            <div key={level} className="rounded-xl border border-slate-200 p-3">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">{SECTION_LABEL[level]}</h4>

              <label className="block text-xs font-medium text-slate-600 mb-1">Provider</label>
              <select
                value={value[level].provider}
                onChange={(e) => {
                  onProviderChange(level, e.target.value as InferenceProviderKind);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
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
                disabled={modelLoading[level]}
              >
                {modelOptions[level].map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              {modelLoading[level] && (
                <p className="mt-1 text-xs text-slate-500">Loading models...</p>
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
