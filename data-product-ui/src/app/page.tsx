'use client';

import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { generateYamlFiles } from '@/utils/yamlGenerator';
import { SourceType } from '@/types/dataProduct';

type TextRow = { id: string; value: string };
type SourceRow = TextRow & { sourceType: SourceType };
type DepotRow = { id: string; name: string; type: string };
type ScannerRow = { id: string; name: string; depot: string; includePattern: string };

interface ProjectConfig {
  projectName: string;
  clusterName: string;
  depots: DepotRow[];
  scanners: ScannerRow[];
  dataProductEntities: SourceRow[];
  consumptionLayer: string;
  useCustomSemanticEntities: boolean;
  semanticEntities: TextRow[];
}

type PreviewData = {
  projectName: string;
  dataProducts: Array<{
    name: string;
    entity: string;
    type: 'source';
    createdAt: Date;
  }>;
  consumptionLayer: {
    name: string;
    entities: string[];
    type: 'consumer';
  };
};

const steps = [
  { title: 'Business use case', helper: 'Name your project' },
  { title: 'Infra setup', helper: 'Define instance-secret, depot, cluster, scanner' },
  { title: 'Source datasets', helper: 'List the source-aligned data products' },
  { title: 'Consumption layer', helper: 'Name of semantic model' },
  { title: 'Review & export', helper: 'Preview the data product' },
];

type SourceFormProps = {
  items: SourceRow[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChangeName: (index: number, value: string) => void;
  onChangeSourceType: (index: number, type: SourceType) => void;
};

type SemanticFormProps = {
  items: TextRow[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  useCustomSemanticEntities: boolean;
  onToggleCustom: (checked: boolean) => void;
};

type ReviewCardProps = {
  projectName: string;
  sources: string[];
  semanticEntities: string[];
  consumptionLayer: string;
  clusterName: string;
  secretType: string;
  depots: DepotRow[];
  scanners: ScannerRow[];
};

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 truncate">{value || '—'}</div>
    </div>
  );
}

function StepHeader({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {steps.map((step, idx) => {
          const active = idx === currentStep;
          const done = idx < currentStep;
          return (
            <div key={step.title} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  active
                    ? 'bg-blue-600 text-white'
                    : done
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {done ? '✓' : idx + 1}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{step.title}</div>
                <div className="text-xs text-gray-500">{step.helper}</div>
              </div>
              {idx < steps.length - 1 && <div className="w-6 border-t border-dashed border-gray-300" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourcesForm({ items, onAdd, onRemove, onChangeName, onChangeSourceType }: SourceFormProps) {
  return (
    <div className="space-y-3">
      {items.map((entity, index) => (
        <div key={entity.id} className="flex flex-col gap-2 md:flex-row">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={entity.value}
              onChange={(e) => onChangeName(index, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., customers"
            />
            <select
              value={entity.sourceType}
              onChange={(e) => onChangeSourceType(index, e.target.value as SourceType)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="snowflake">Snowflake</option>
              <option value="postgres">Postgres</option>
              <option value="s3">S3</option>
              <option value="bigquery">BigQuery</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={items.length === 1}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add source-aligned data product
      </button>
      <p className="text-xs text-gray-500">
        Tip: add each table or topic you want to generate configs for. Names should be slug-friendly (letters, numbers, hyphens).
      </p>
    </div>
  );
}

function SemanticForm({ items, onAdd, onRemove, onChange, useCustomSemanticEntities, onToggleCustom }: SemanticFormProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={useCustomSemanticEntities}
          onChange={(e) => onToggleCustom(e.target.checked)}
          className="rounded"
        />
        Use custom semantic entities
      </label>
      {useCustomSemanticEntities && (
        <>
          {items.map((entity, index) => (
            <div key={entity.id} className="flex gap-2">
              <input
                type="text"
                value={entity.value}
                onChange={(e) => onChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., orders_agg"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={items.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add semantic entity
          </button>
        </>
      )}
      <p className="text-xs text-gray-500">
        Leave unchecked to reuse your source entities for the semantic model.
      </p>
    </div>
  );
}

function ReviewCard({
  projectName,
  sources,
  semanticEntities,
  consumptionLayer,
  clusterName,
  secretType,
  depots,
  scanners,
}: ReviewCardProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBadge label="Project" value={projectName || 'project'} />
        <StatBadge label="Cluster" value={clusterName || '—'} />
        <StatBadge label="Secret type" value={secretType || '—'} />
        <StatBadge label="Consumer" value={consumptionLayer || 'consumer'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Sources</div>
              <p className="text-xs text-gray-500">Source-aligned data products</p>
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">{sources.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.length > 0 ? (
              sources.map((e) => (
                <span key={e} className="px-2 py-1 rounded-full bg-gray-100 text-sm text-gray-800">
                  {e}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">No sources added.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Semantic entities</div>
              <p className="text-xs text-gray-500">Used by the consumption layer</p>
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full">
              {semanticEntities.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {semanticEntities.length > 0 ? (
              semanticEntities.map((e) => (
                <span key={e} className="px-2 py-1 rounded-full bg-gray-100 text-sm text-gray-800">
                  {e}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">Semantic entities will mirror sources.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Depots</div>
              <p className="text-xs text-gray-500">Connection details</p>
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full">
              {depots.length}
            </span>
          </div>
          <ul className="divide-y divide-gray-200">
            {depots.map((d) => (
              <li key={d.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">{d.name || 'Depot'}</div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 uppercase">{d.type || '—'}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Scanners</div>
              <p className="text-xs text-gray-500">Schema discovery per depot</p>
            </div>
            <span className="px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700 rounded-full">
              {scanners.length}
            </span>
          </div>
          <ul className="divide-y divide-gray-200">
            {scanners.map((s) => (
              <li key={s.id} className="py-2 space-y-1">
                <div className="text-sm font-semibold text-gray-900">{s.name || 'Scanner'}</div>
                <div className="text-xs text-gray-600">Depot: {s.depot || '—'}</div>
                <div className="text-xs text-gray-600">
                  Include: {s.includePattern ? <span className="font-mono">{s.includePattern}</span> : '—'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const newSourceRow = (): SourceRow => ({
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    value: '',
    sourceType: 'snowflake',
  });

  const newSemanticRow = (): TextRow => ({
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    value: '',
  });

  const newDepotRow = (): DepotRow => ({
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name: '',
    type: 'bigquery',
  });

  const newScannerRow = (depot: string = ''): ScannerRow => ({
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name: '',
    depot,
    includePattern: '',
  });

  const [config, setConfig] = useState<ProjectConfig>({
    projectName: '',
    clusterName: '',
    depots: [newDepotRow()],
    scanners: [newScannerRow()],
    dataProductEntities: [newSourceRow()],
    consumptionLayer: '',
    useCustomSemanticEntities: false,
    semanticEntities: [newSemanticRow()],
  });

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const normalizeSourceType = (value?: string): SourceType => {
    const lowered = (value || '').toLowerCase();
    if (lowered === 'snowflake' || lowered === 'postgres' || lowered === 's3' || lowered === 'bigquery' || lowered === 'other') {
      return lowered;
    }
    return 'other';
  };

  const validEntities = useMemo(() => config.dataProductEntities.map((e) => e.value.trim()).filter(Boolean), [config.dataProductEntities]);

  const validSemanticEntities = useMemo(() => {
    if (!config.useCustomSemanticEntities) return validEntities;
    return config.semanticEntities.map((e) => e.value.trim()).filter(Boolean);
  }, [config.semanticEntities, config.useCustomSemanticEntities, validEntities]);

  const canContinue = useMemo(() => {
    if (currentStep === 0) return config.projectName.trim().length > 0;
    if (currentStep === 1) {
      const depotsOk =
        config.depots.length > 0 &&
        config.depots.every((d) => d.name.trim().length > 0 && d.type.trim().length > 0);
      const scannersOk =
        config.scanners.length > 0 &&
        config.scanners.every((s) => s.name.trim().length > 0 && s.depot.trim().length > 0);
      return config.clusterName.trim().length > 0 && depotsOk && scannersOk;
    }
    if (currentStep === 2) return validEntities.length > 0;
    if (currentStep === 3) return config.consumptionLayer.trim().length > 0;
    return true;
  }, [config.clusterName, config.consumptionLayer, config.depots, config.projectName, config.scanners, currentStep, validEntities.length]);

  const addSourceRow = () => {
    setConfig((prev) => ({ ...prev, dataProductEntities: [...prev.dataProductEntities, newSourceRow()] }));
  };

  const addSemanticRow = () => {
    setConfig((prev) => ({ ...prev, semanticEntities: [...prev.semanticEntities, newSemanticRow()] }));
  };

  const removeSourceRow = (index: number) => {
    setConfig((prev) => {
      if (prev.dataProductEntities.length === 1) return prev;
      return { ...prev, dataProductEntities: prev.dataProductEntities.filter((_, i) => i !== index) };
    });
  };

  const removeSemanticRow = (index: number) => {
    setConfig((prev) => {
      if (prev.semanticEntities.length === 1) return prev;
      return { ...prev, semanticEntities: prev.semanticEntities.filter((_, i) => i !== index) };
    });
  };

  const updateSourceRow = (index: number, patch: Partial<SourceRow>) => {
    setConfig((prev) => ({
      ...prev,
      dataProductEntities: prev.dataProductEntities.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const updateSemanticRow = (index: number, value: string) => {
    setConfig((prev) => ({
      ...prev,
      semanticEntities: prev.semanticEntities.map((item, i) => (i === index ? { ...item, value } : item)),
    }));
  };

  const addDepot = () => {
    setConfig((prev) => ({ ...prev, depots: [...prev.depots, newDepotRow()] }));
  };

  const updateDepot = (index: number, patch: Partial<DepotRow>) => {
    setConfig((prev) => ({
      ...prev,
      depots: prev.depots.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }));
  };

  const removeDepot = (index: number) => {
    setConfig((prev) => {
      if (prev.depots.length === 1) return prev;
      const depots = prev.depots.filter((_, i) => i !== index);
      // Also clean scanners referencing removed depot
      const remainingDepotName = depots[0]?.name || '';
      const scanners = prev.scanners.map((s) =>
        index === -1 ? s : s.depot === prev.depots[index].name ? { ...s, depot: remainingDepotName } : s
      );
      return { ...prev, depots, scanners };
    });
  };

  const addScanner = () => {
    const defaultDepot = config.depots[0]?.name || '';
    setConfig((prev) => ({ ...prev, scanners: [...prev.scanners, newScannerRow(defaultDepot)] }));
  };

  const updateScanner = (index: number, patch: Partial<ScannerRow>) => {
    setConfig((prev) => ({
      ...prev,
      scanners: prev.scanners.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const removeScanner = (index: number) => {
    setConfig((prev) => {
      if (prev.scanners.length === 1) return prev;
      return { ...prev, scanners: prev.scanners.filter((_, i) => i !== index) };
    });
  };

  const generatePreview = () => {
    const preview: PreviewData = {
      projectName: config.projectName,
      dataProducts: validEntities.map((entity) => ({
        name: entity,
        entity,
        type: 'source' as const,
        createdAt: new Date(),
      })),
      consumptionLayer: {
        name: config.consumptionLayer,
        entities: validSemanticEntities,
        type: 'consumer' as const,
      },
    };
    setPreviewData(preview);
  };

  const generateProject = async () => {
    setIsGenerating(true);
    setGenerationResult('');
    try {
      const sourceProducts = validEntities.map((entity) => ({
        name: config.projectName,
        entity,
        type: 'source' as const,
        createdAt: new Date(),
        sourceTypes: [
          normalizeSourceType(
            config.dataProductEntities.find((e) => e.value.trim() === entity)?.sourceType || config.depots[0]?.type || 'bigquery'
          ),
        ],
        secretType: config.depots[0]?.type || 'bigquery',
        depots: config.depots.map((d) => ({ name: d.name, type: d.type })),
        scanners: config.scanners.map((s) => ({
          name: s.name,
          depot: s.depot,
          includePattern: s.includePattern,
        })),
        clusterName: config.clusterName,
      }));

      const consumerProduct = {
        name: config.projectName,
        entity: config.consumptionLayer,
        entities: validEntities,
        semanticEntities: validSemanticEntities,
        sourceTypes: config.dataProductEntities.map((e) => normalizeSourceType(e.sourceType)),
        type: 'consumer' as const,
        createdAt: new Date(),
        secretType: config.depots[0]?.type || 'bigquery',
        depots: config.depots.map((d) => ({ name: d.name, type: d.type })),
        scanners: config.scanners.map((s) => ({
          name: s.name,
          depot: s.depot,
          includePattern: s.includePattern,
        })),
        clusterName: config.clusterName,
      };

      await new Promise((resolve) => setTimeout(resolve, 500));

      setGenerationResult('Project generated successfully!');
      setPreviewData({
        projectName: config.projectName,
        dataProducts: sourceProducts,
        consumptionLayer: consumerProduct,
      });
    } catch {
      setGenerationResult('Error generating project');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!previewData) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();

      const sourceProducts = validEntities.map((entity) => ({
        name: config.projectName,
        entity,
        type: 'source' as const,
        createdAt: new Date(),
        sourceTypes: [
          normalizeSourceType(
            config.dataProductEntities.find((e) => e.value.trim() === entity)?.sourceType || config.depots[0]?.type || 'bigquery'
          ),
        ],
        secretType: config.depots[0]?.type || 'bigquery',
        depots: config.depots.map((d) => ({ name: d.name, type: d.type })),
        scanners: config.scanners.map((s) => ({
          name: s.name,
          depot: s.depot,
          includePattern: s.includePattern,
        })),
        clusterName: config.clusterName,
      }));

      const consumerProduct = {
        name: config.projectName,
        entity: config.consumptionLayer,
        entities: validEntities,
        semanticEntities: validSemanticEntities,
        sourceTypes: config.dataProductEntities.map((e) => normalizeSourceType(e.sourceType)),
        type: 'consumer' as const,
        createdAt: new Date(),
        secretType: config.depots[0]?.type || 'bigquery',
        depots: config.depots.map((d) => ({ name: d.name, type: d.type })),
        scanners: config.scanners.map((s) => ({
          name: s.name,
          depot: s.depot,
          includePattern: s.includePattern,
        })),
        clusterName: config.clusterName,
      };

      const allFiles = [
        ...sourceProducts.flatMap((product) => generateYamlFiles(product)),
        ...generateYamlFiles(consumerProduct),
      ];

      allFiles.forEach((file) => zip.file(file.path, file.content));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.projectName || 'data-product'}-project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setGenerationResult('Project files downloaded successfully!');
    } catch (error) {
      console.error('Error generating ZIP file:', error);
      setGenerationResult('Error downloading project files');
    } finally {
      setIsDownloading(false);
    }
  };

  const goNext = () => {
    if (!canContinue) return;
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => setCurrentStep((s) => Math.max(0, s - 1));
  const goToStep = (step: number) => setCurrentStep(() => Math.min(Math.max(step, 0), steps.length - 1));

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Project name</label>
            <input
              type="text"
              value={config.projectName}
              onChange={(e) => setConfig((prev) => ({ ...prev, projectName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., customer-platform"
            />
            <p className="text-xs text-gray-500">Used as the top-level folder name.</p>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500">
                Secret type will be inferred from your first depot type.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Depots</label>
                <button
                  type="button"
                  onClick={addDepot}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add depot
                </button>
              </div>
              {config.depots.map((depot, index) => (
                <div key={depot.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <input
                    type="text"
                    value={depot.name}
                    onChange={(e) => updateDepot(index, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Depot name (e.g., bigquery)"
                  />
                  <select
                    value={depot.type}
                    onChange={(e) => updateDepot(index, { type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bigquery">BigQuery</option>
                    <option value="snowflake">Snowflake</option>
                    <option value="postgres">Postgres</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeDepot(index)}
                    disabled={config.depots.length === 1}
                    className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cluster name</label>
              <input
                type="text"
                value={config.clusterName}
                onChange={(e) => setConfig((prev) => ({ ...prev, clusterName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., minervac"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Scanners</label>
                <button
                  type="button"
                  onClick={addScanner}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add scanner
                </button>
              </div>
              {config.scanners.map((scanner, index) => (
                <div key={scanner.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <input
                    type="text"
                    value={scanner.name}
                    onChange={(e) => updateScanner(index, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Scanner name"
                  />
                  <input
                    type="text"
                    value={scanner.depot}
                    onChange={(e) => updateScanner(index, { depot: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Depot name"
                  />
                  <input
                    type="text"
                    value={scanner.includePattern}
                    onChange={(e) => updateScanner(index, { includePattern: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Schema include (optional)"
                  />
                  <button
                    type="button"
                    onClick={() => removeScanner(index)}
                    disabled={config.scanners.length === 1}
                    className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              These settings feed into instance-secret, depot, cluster, and scanner YAMLs. Scanner depots will be referenced in
              generated scanner configs.
            </p>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <SourcesForm
              items={config.dataProductEntities}
              onAdd={addSourceRow}
              onRemove={removeSourceRow}
              onChangeName={(index, value) => updateSourceRow(index, { value })}
              onChangeSourceType={(index, type) => updateSourceRow(index, { sourceType: type })}
            />
            {validEntities.length === 0 && (
              <p className="text-xs text-red-600">Add at least one source-aligned data product to continue.</p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Consumer / analytics name</label>
              <input
                type="text"
                value={config.consumptionLayer}
                onChange={(e) => setConfig((prev) => ({ ...prev, consumptionLayer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., customer-360"
              />
              <p className="text-xs text-gray-500">This becomes the consumer directory (3.1-...).</p>
            </div>
            <SemanticForm
              useCustomSemanticEntities={config.useCustomSemanticEntities}
              items={config.semanticEntities}
              onAdd={addSemanticRow}
              onRemove={removeSemanticRow}
              onChange={(index, value) => updateSemanticRow(index, value)}
              onToggleCustom={(checked) => setConfig((prev) => ({ ...prev, useCustomSemanticEntities: checked }))}
            />
          </div>
        );
      case 4:
      default:
        return (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900">Review & export</h2>
              <p className="text-sm text-gray-600">
                Double-check everything before generating. Preview shows the folder tree; Generate writes the configs in memory, and Download
                saves a ZIP of all YAMLs.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit sources
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit infra
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit consumer
                </button>
              </div>
            </div>

            <ReviewCard
              projectName={config.projectName}
              sources={validEntities}
              semanticEntities={validSemanticEntities}
              consumptionLayer={config.consumptionLayer}
              clusterName={config.clusterName}
              secretType={config.depots[0]?.type || '—'}
              depots={config.depots}
              scanners={config.scanners}
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generatePreview}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Preview tree
              </button>
              <button
                type="button"
                onClick={generateProject}
                disabled={isGenerating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={!previewData || isDownloading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isDownloading ? 'Downloading...' : 'Download ZIP'}
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Need to change something? Use Back to revisit any step, then return here to regenerate.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Data Product Generator</h1>
            <a
              href="/data-product-generator/lens-generator"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              🔍 Lens Generator
            </a>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Build your data product in 4 simple steps.
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6">
          <StepHeader currentStep={currentStep} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">{renderStep()}</div>

            <aside className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="text-sm font-semibold text-gray-900">Progress</div>
              <div className="text-sm text-gray-700">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </div>
              <div className="space-x-2">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Back
                  </button>
                )}
                {currentStep < steps.length - 1 && (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canContinue}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                )}
              </div>

              {previewData && (
                <div className="text-sm text-gray-700">
                  <div className="font-semibold mb-1">Preview ready</div>
                  <div>{previewData.projectName}</div>
                  <div>{previewData.dataProducts.length} source(s)</div>
                  <div>Consumer: {previewData.consumptionLayer.name}</div>
                </div>
              )}

              {generationResult && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    generationResult.includes('successfully')
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {generationResult}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}