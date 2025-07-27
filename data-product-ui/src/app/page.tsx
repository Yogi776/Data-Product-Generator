'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Database, FileText, Settings, Play, Download, Eye, Code } from 'lucide-react';
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

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [newSodpEntity, setNewSodpEntity] = useState('');
  const [newSemanticEntity, setNewSemanticEntity] = useState('');

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

    try {
      const response = await fetch('/api/data-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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

  const addSodpEntity = () => {
    if (newSodpEntity.trim()) {
      const currentEntities = watch('sodpEntities') || [];
      setValue('sodpEntities', [...currentEntities, newSodpEntity.trim()]);
      setNewSodpEntity('');
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
    setValue(field, currentEntities.filter((_: string, i: number) => i !== index));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Product Generator</h1>
                <p className="text-sm text-gray-600">Create comprehensive data product structures</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/advanced"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                Advanced Builder
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
                <p className="text-sm text-gray-600 mt-1">Define your data product structure</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    {[
                      { id: 'basic', label: 'Basic', icon: FileText },
                      { id: 'entities', label: 'Entities', icon: Database },
                      { id: 'advanced', label: 'Advanced', icon: Settings },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <tab.icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Basic Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
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
                )}

                {/* Entities Tab */}
                {activeTab === 'entities' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SODP Entities (Source of Data Product)
                      </label>
                      <div className="space-y-2">
                        {watchedSodpEntities.map((entity: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={entity}
                              onChange={(e) => {
                                const newEntities = [...watchedSodpEntities];
                                newEntities[index] = e.target.value;
                                setValue('sodpEntities', newEntities);
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeEntity('sodpEntities', index)}
                              className="px-2 py-2 text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newSodpEntity}
                            onChange={(e) => setNewSodpEntity(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addSodpEntity()}
                            placeholder="Enter entity name"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={addSodpEntity}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

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
                        {watchedSemanticEntities.map((entity: string, index: number) => (
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
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Config Path
                      </label>
                      <input
                        type="text"
                        {...register('configPath')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="path/to/config.yaml"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button
                    type="submit"
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
              </form>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-1">
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
