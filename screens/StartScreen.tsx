import React, { useEffect, useMemo, useState } from 'react';
import { GameCategory, GameConfig, DifficultyLevel } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  Globe,
  BookOpen,
  BrainCircuit,
  School,
  GraduationCap,
  ScrollText,
  Upload,
  FileText,
  X,
  Loader2,
  Settings,
} from 'lucide-react';
import { processUploadedFiles } from '../utils/fileHelpers';
import { extractScopeFromContent } from '../services/inference/operations';
import {
  getEffectiveInferenceRouting,
  listProviderModels,
  getResolvedAppConfig,
  saveInferenceOverride,
  getAllProviderConfigs,
} from '../services/config/appConfig';
import { InferenceConfigModal } from '../components/InferenceConfigModal';
import { InferenceRoutingOverride } from '../services/config/types';
import { InferenceProviderKind } from '../services/inference/types';

interface StartScreenProps {
  onStart: (config: GameConfig) => void;
  isLoading: boolean;
  initialConfig?: GameConfig;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, isLoading, initialConfig }) => {
  const [category, setCategory] = useState<GameCategory>(initialConfig?.category ?? GameCategory.HISTORY);
  const [count, setCount] = useState<number>(initialConfig?.questionCount ?? 10);
  const [scope, setScope] = useState<string>(initialConfig?.scope ?? '*');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    initialConfig?.difficulty ?? DifficultyLevel.HIGH_SCHOOL
  );

  const [scopeMode, setScopeMode] = useState<'manual' | 'upload'>('manual');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [configOpen, setConfigOpen] = useState(false);
  const [inferenceDraft, setInferenceDraft] = useState<InferenceRoutingOverride>(getEffectiveInferenceRouting());
  const [modelOptions, setModelOptions] = useState<Record<'light' | 'normal', string[]>>({
    light: [inferenceDraft.light.model],
    normal: [inferenceDraft.normal.model],
  });
  const [modelLoading, setModelLoading] = useState<Record<'light' | 'normal', boolean>>({
    light: false,
    normal: false,
  });

  useEffect(() => {
    if (!initialConfig) return;
    setCategory(initialConfig.category);
    setCount(initialConfig.questionCount);
    setScope(initialConfig.scope);
    setDifficulty(initialConfig.difficulty);
  }, [initialConfig]);

  useEffect(() => {
    const providers = getAllProviderConfigs();
    const hasAnyKey = Object.values(providers).some((p) => p && p.apiKey && p.apiKey.length > 0);
    if (!hasAnyKey) {
      setConfigOpen(true);
    }
  }, []);

  const providers = useMemo(
    () => Object.keys(getResolvedAppConfig().inference.providers) as InferenceProviderKind[],
    []
  );

  const loadModelsForLevel = async (level: 'light' | 'normal', provider: InferenceProviderKind, currentModel?: string) => {
    setModelLoading((prev) => ({ ...prev, [level]: true }));
    const models = await listProviderModels(provider);
    const targetModel = currentModel || inferenceDraft[level].model;
    const nextModels = models.length > 0 ? models : [targetModel];

    setModelOptions((prev) => ({ ...prev, [level]: nextModels }));
    setInferenceDraft((prev) => {
      const model = nextModels.includes(targetModel) ? targetModel : nextModels[0];
      return {
        ...prev,
        [level]: {
          ...prev[level],
          provider,
          model,
        },
      };
    });
    setModelLoading((prev) => ({ ...prev, [level]: false }));
  };

  useEffect(() => {
    if (!configOpen) return;
    const savedRouting = getEffectiveInferenceRouting();
    setInferenceDraft(savedRouting);
    setModelOptions({
      light: [savedRouting.light.model],
      normal: [savedRouting.normal.model],
    });
    void loadModelsForLevel('light', savedRouting.light.provider, savedRouting.light.model);
    void loadModelsForLevel('normal', savedRouting.normal.provider, savedRouting.normal.model);
    // intentionally run once when opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveInferenceOverride(inferenceDraft);
    onStart({ category, questionCount: count, scope, difficulty });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeFiles = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    try {
      const rawText = await processUploadedFiles(uploadedFiles);
      const extractedScope = await extractScopeFromContent(rawText, category);
      setScope(extractedScope);
      setScopeMode('manual');
      setUploadedFiles([]);
    } catch (error) {
      console.error('Analysis failed', error);
      alert('Failed to analyze files. Please try again with valid text/pdf/doc files.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getDifficultyLabels = () => {
    if (category === GameCategory.GEOGRAPHY) {
      return {
        [DifficultyLevel.HIGH_SCHOOL]: { title: 'High School', desc: 'Common curriculum topics' },
        [DifficultyLevel.COLLEGE]: { title: 'College Geography Major', desc: 'Undergraduate level depth' },
        [DifficultyLevel.PROFESSIONAL]: { title: 'Professional Geographer', desc: 'Niche & academic topics' },
      };
    }
    return {
      [DifficultyLevel.HIGH_SCHOOL]: { title: 'High School', desc: 'Common curriculum topics' },
      [DifficultyLevel.COLLEGE]: { title: 'College History Major', desc: 'Undergraduate level depth' },
      [DifficultyLevel.PROFESSIONAL]: { title: 'Professional Historian', desc: 'Niche & academic topics' },
    };
  };

  const labels = getDifficultyLabels();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-4 sm:py-6">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-slate-100">
        <div className="text-center mb-5">
          <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
            <BrainCircuit className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">GeoHistory Bee</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Train your knowledge with progressive clues.</p>
          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Config
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Select Category</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCategory(GameCategory.HISTORY)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    category === GameCategory.HISTORY
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="font-semibold text-sm sm:text-base">History</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory(GameCategory.GEOGRAPHY)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    category === GameCategory.GEOGRAPHY
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-semibold text-sm sm:text-base">Geography</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Difficulty Level</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {Object.entries(labels).map(([level, info]) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level as DifficultyLevel)}
                    className={`w-full flex items-center p-2.5 rounded-lg border transition-all ${
                      difficulty === level
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {level === DifficultyLevel.HIGH_SCHOOL && <School className="w-4 h-4 mr-2.5 flex-shrink-0" />}
                    {level === DifficultyLevel.COLLEGE && <GraduationCap className="w-4 h-4 mr-2.5 flex-shrink-0" />}
                    {level === DifficultyLevel.PROFESSIONAL && <ScrollText className="w-4 h-4 mr-2.5 flex-shrink-0" />}
                    <div className="text-left">
                      <div className="font-medium text-sm">{info.title}</div>
                      <div className="text-[11px] opacity-75">{info.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:border-l lg:border-slate-100 lg:pl-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of Questions</label>
              <input
                type="range"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1</span>
                <span className="font-medium text-indigo-600">{count} Questions</span>
                <span>20</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Quiz Scope / Topics</label>

              <div className="flex rounded-lg bg-slate-100 p-1 mb-3">
                <button
                  type="button"
                  onClick={() => setScopeMode('manual')}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    scopeMode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Keywords Input
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('upload')}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    scopeMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Upload Materials
                </button>
              </div>

              {scopeMode === 'manual' ? (
                <div className="animate-in fade-in duration-300">
                  <Input
                    placeholder="e.g., European Wars, Rivers of Asia..."
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave as '*' for random topics within the category.</p>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300 space-y-2.5">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      accept=".txt,.md,.html,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">Click to upload study guides</p>
                    <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT, HTML</p>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-2">
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-100"
                        >
                          <div className="flex items-center truncate mr-2">
                            <FileText className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        fullWidth
                        variant="secondary"
                        onClick={analyzeFiles}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing Content...
                          </span>
                        ) : (
                          'Analyze & Extract Scope'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button type="submit" fullWidth size="lg" disabled={isLoading || isAnalyzing} className="lg:col-span-2 mt-1">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Quiz...
              </span>
            ) : (
              'Start Training'
            )}
          </Button>
        </form>
      </div>

      <InferenceConfigModal
        isOpen={configOpen}
        providers={providers}
        value={inferenceDraft}
        modelOptions={modelOptions}
        modelLoading={modelLoading}
        onProviderChange={(level, provider) => {
          void loadModelsForLevel(level, provider);
        }}
        onModelChange={(level, model) => {
          setInferenceDraft((prev) => ({
            ...prev,
            [level]: {
              ...prev[level],
              model,
            },
          }));
        }}
        onSave={() => {
          saveInferenceOverride(inferenceDraft);
          setConfigOpen(false);
        }}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
};
