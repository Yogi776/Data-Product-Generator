'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Database, FileText, Settings, Play, Download, Eye, Code, ArrowLeft } from 'lucide-react';
import EntityBuilder from '@/components/EntityBuilder';
import ConfigPreview from '@/components/ConfigPreview';
import Link from 'next/link';

const formSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  logicalModel: z.string().optional(),
  source: z.string().optional(),
  schema: z.string().optional(),
  sodpEntities: z.array(z.string()).optional(),
  codpLayer: z.string().optional(),
  semanticEntities: z.array(z.string()).optional(),
  configPath: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Entity {
  name: string;
  dimensions: Array<{
    name: string;
    type: string;
    primary_key?: boolean;
    description?: string;
  }>;
  joins?: Array<{
    name: string;
    relationship: string;
    sql: string;
  }>;
}

export default function AdvancedPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('entities');
  const [newSemanticEntity, setNewSemanticEntity] = useState('');
  const [entities, setEntities] = useState<Entity[]>([
    {
      name: 'customer',
      dimensions: [
        { name: 'customer_id', type: 'number', primary_key: true },
        { name: 'customer_name', type: 'string' },
        { name: 'customer_email', type: 'string' },
        { name: 'customer_phone', type: 'string' },
      ],
    },
    {
      name: 'product',
      dimensions: [
        { name: 'product_id', type: 'number', primary_key: true },
        { name: 'product_name', type: 'string' },
        { name: 'product_price', type: 'number' },
        { name: 'product_category', type: 'string' },
      ],
    },
    {
      name: 'transaction',
      dimensions: [
        { name: 'transaction_id', type: 'number', primary_key: true },
        { name: 'customer_id', type: 'number' },
        { name: 'product_id', type: 'number' },
        { name: 'transaction_amount', type: 'number' },
      ],
      joins: [
        {
          name: 'customer',
          relationship: 'many_to_one',
          sql: '{TABLE.customer_id} = {customer.customer_id}',
        },
        {
          name: 'product',
          relationship: 'many_to_one',
          sql: '{TABLE.product_id} = {product.product_id}',
        },
      ],
    },
  ]);
  const [showConfigPreview, setShowConfigPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logicalModel: 'analytics',
      source: 'icebase',
      schema: 'retail',
    },
  });

  const watchedSodpEntities = watch('sodpEntities') || [];
  const watchedSemanticEntities = watch('semanticEntities') || [];

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setResult(null);

    // Convert entities to SODP entities for the API
    const sodpEntities = entities.map(entity => entity.name);
    const apiData = {
      ...data,
      sodpEntities,
    };

    try {
      const response = await fetch('/api/data-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (response.ok) {
        setResult(result);
      } else {
        setResult({ error: result.error || 'Failed to create data product' });
      }
    } catch (error) {
      setResult({ error: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const addSemanticEntity = () => {
    if (newSemanticEntity.trim()) {
      const currentEntities = watch('semanticEntities') || [];
      setValue('semanticEntities', [...currentEntities, newSemanticEntity.trim()]);
      setNewSemanticEntity('');
    }
  };

  const removeEntity = (field: 'sodpEntities' | 'semanticEntities', index: number) => {
    const currentEntities = watch(field) || [];
    setValue(field, currentEntities.filter((_, i) => i !== index));
  };

  const downloadProject = async (projectName: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectName }),
      });

      if (response.ok) {
        // Create a blob from the response
        const blob = await response.blob();
        
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.zip`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.error('Download failed:', errorData.error);
        alert('Download failed: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed: Network error');
    } finally {
      setIsDownloading(false);
    }
  };

  const configData = {
    logicalModel: watch('logicalModel'),
    source: watch('source'),
    schema: watch('schema'),
    entities,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="bg-blue-600 p-2 rounded-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Advanced Data Product Generator</h1>
                <p className="text-sm text-gray-600">Build complex data product structures with visual entity builder</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Basic Configuration</h2>
                <p className="text-sm text-gray-600 mt-1">Project settings and data source configuration</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    {...register('projectName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., customer-360"
                  />
                  {errors.projectName && (
                    <p className="mt-1 text-sm text-red-600">{errors.projectName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logical Model
                    </label>
                    <input
                      type="text"
                      {...register('logicalModel')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="analytics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source
                    </label>
                    <input
                      type="text"
                      {...register('source')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="icebase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schema
                    </label>
                    <input
                      type="text"
                      {...register('schema')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="retail"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Entity Builder */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Entity Builder</h2>
                <p className="text-sm text-gray-600 mt-1">Define entities, dimensions, and relationships</p>
              </div>

              <div className="p-6">
                <EntityBuilder entities={entities} onEntitiesChange={setEntities} />
              </div>
            </div>

            {/* Additional Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Additional Configuration</h2>
                <p className="text-sm text-gray-600 mt-1">CODP layer and semantic entities</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CODP Layer (Consumption of Data Product)
                  </label>
                  <input
                    type="text"
                    {...register('codpLayer')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., analytics, cust-360"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semantic Entities
                  </label>
                  <div className="space-y-2">
                    {watchedSemanticEntities.map((entity, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={entity}
                          onChange={(e) => {
                            const newEntities = [...watchedSemanticEntities];
                            newEntities[index] = e.target.value;
                            setValue('semanticEntities', newEntities);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeEntity('semanticEntities', index)}
                          className="px-2 py-2 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                                            <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newSemanticEntity}
                            onChange={(e) => setNewSemanticEntity(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addSemanticEntity()}
                            placeholder="Enter entity name"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={addSemanticEntity}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Add
                          </button>
                        </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Generate Data Product</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Configuration Preview */}
            <ConfigPreview
              config={configData}
              isVisible={showConfigPreview}
              onToggleVisibility={() => setShowConfigPreview(!showConfigPreview)}
            />

            {/* Results Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Results</h2>
                <p className="text-sm text-gray-600 mt-1">Generated files and output</p>
              </div>

              <div className="p-6">
                {!result && !isLoading && (
                  <div className="text-center text-gray-500 py-8">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No results yet</p>
                    <p className="text-sm">Generate a data product to see results</p>
                  </div>
                )}

                {isLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Generating data product...</p>
                  </div>
                )}

                {result && !isLoading && (
                  <div className="space-y-4">
                    {result.error ? (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <div className="h-5 w-5 text-red-400">⚠</div>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <p className="text-sm text-red-700 mt-1">{result.error}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <div className="h-5 w-5 text-green-400">✓</div>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-green-800">Success!</h3>
                              <p className="text-sm text-green-700 mt-1">
                                Data product structure created successfully
                              </p>
                            </div>
                          </div>
                        </div>

                        {result.generatedFiles && result.generatedFiles.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Generated Files:</h4>
                            <div className="space-y-1">
                              {result.generatedFiles.slice(0, 10).map((file: string, index: number) => (
                                <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                  <FileText className="h-4 w-4" />
                                  <span className="font-mono">{file}</span>
                                </div>
                              ))}
                              {result.generatedFiles.length > 10 && (
                                <p className="text-sm text-gray-500">
                                  ... and {result.generatedFiles.length - 10} more files
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                                                 <div className="pt-4 border-t border-gray-200">
                           <button
                             onClick={() => downloadProject(result.projectName)}
                             disabled={isDownloading}
                             className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                           >
                             {isDownloading ? (
                               <>
                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                 <span>Downloading...</span>
                               </>
                             ) : (
                               <>
                                 <Download className="h-4 w-4" />
                                 <span>Download Project</span>
                               </>
                             )}
                           </button>
                         </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 