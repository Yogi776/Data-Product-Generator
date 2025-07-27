'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { generateYamlFiles } from '@/utils/yamlGenerator';

interface ProjectConfig {
  projectName: string;
  dataProductEntities: string[];
  consumptionLayer: string;
  useCustomSemanticEntities: boolean;
  semanticEntities: string[];
}

export default function Home() {
  const [config, setConfig] = useState<ProjectConfig>({
    projectName: '',
    dataProductEntities: [],
    consumptionLayer: '',
    useCustomSemanticEntities: false,
    semanticEntities: []
  });

  const [previewData, setPreviewData] = useState<{
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
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const addDataProductEntity = () => {
    setConfig(prev => ({
      ...prev,
      dataProductEntities: [...prev.dataProductEntities, '']
    }));
  };

  const removeDataProductEntity = (index: number) => {
    setConfig(prev => ({
      ...prev,
      dataProductEntities: prev.dataProductEntities.filter((_, i) => i !== index)
    }));
  };

  const updateDataProductEntity = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      dataProductEntities: prev.dataProductEntities.map((entity, i) => 
        i === index ? value : entity
      )
    }));
  };

  const addSemanticEntity = () => {
    setConfig(prev => ({
      ...prev,
      semanticEntities: [...prev.semanticEntities, '']
    }));
  };

  const removeSemanticEntity = (index: number) => {
    setConfig(prev => ({
      ...prev,
      semanticEntities: prev.semanticEntities.filter((_, i) => i !== index)
    }));
  };

  const updateSemanticEntity = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      semanticEntities: prev.semanticEntities.map((entity, i) => 
        i === index ? value : entity
      )
    }));
  };

  const generatePreview = () => {
    const validEntities = config.dataProductEntities.filter(e => e.trim() !== '');
    const validSemanticEntities = config.useCustomSemanticEntities 
      ? config.semanticEntities.filter(e => e.trim() !== '')
      : validEntities;

    const preview = {
      projectName: config.projectName,
      dataProducts: validEntities.map(entity => ({
        name: entity,
        entity: entity,
        type: 'source' as const,
        createdAt: new Date()
      })),
      consumptionLayer: {
        name: config.consumptionLayer,
        entities: validSemanticEntities,
        type: 'consumer' as const
      }
    };

    setPreviewData(preview);
  };

  const generateProject = async () => {
    setIsGenerating(true);
    setGenerationResult('');

    try {
      const validEntities = config.dataProductEntities.filter(e => e.trim() !== '');
      const validSemanticEntities = config.useCustomSemanticEntities 
        ? config.semanticEntities.filter(e => e.trim() !== '')
        : validEntities;

      // Generate source-aligned data products
      const sourceProducts = validEntities.map(entity => ({
        name: config.projectName,
        entity: entity,
        type: 'source' as const,
        createdAt: new Date()
      }));

      // Generate consumer-aligned data product
      const consumerProduct = {
        name: config.projectName,
        entity: config.consumptionLayer,
        entities: validSemanticEntities,
        type: 'consumer' as const,
        createdAt: new Date()
      };

      // Simulate generation process
      await new Promise(resolve => setTimeout(resolve, 2000));

      setGenerationResult('Project generated successfully!');
      setPreviewData({
        projectName: config.projectName,
        dataProducts: sourceProducts,
        consumptionLayer: consumerProduct
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

      const validEntities = config.dataProductEntities.filter(e => e.trim() !== '');
      const validSemanticEntities = config.useCustomSemanticEntities 
        ? config.semanticEntities.filter(e => e.trim() !== '')
        : validEntities;

      // Generate source-aligned data products
      const sourceProducts = validEntities.map(entity => ({
        name: config.projectName,
        entity: entity,
        type: 'source' as const,
        createdAt: new Date()
      }));

      // Generate consumer-aligned data product
      const consumerProduct = {
        name: config.projectName,
        entity: config.consumptionLayer,
        entities: validSemanticEntities,
        type: 'consumer' as const,
        createdAt: new Date()
      };

      // Generate all files
      const allFiles = [
        ...sourceProducts.flatMap(product => generateYamlFiles(product)),
        ...generateYamlFiles(consumerProduct)
      ];

      // Add all files to zip
      allFiles.forEach(file => {
          zip.file(file.path, file.content);
      });

      // Generate and download zip
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.projectName}-data-product.zip`;
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

  const isValid = config.projectName.trim() !== '' && 
                 config.dataProductEntities.some(e => e.trim() !== '') &&
                 config.consumptionLayer.trim() !== '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Data Product Generator
            </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Connected</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Project Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Configuration</h2>
            
            {/* Project Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={config.projectName}
                onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a unique name for your data product project. Use only letters, numbers, hyphens, and underscores (no spaces or special characters).
              </p>
            </div>

            {/* Data Product Entities */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Product Entities
              </label>
              {config.dataProductEntities.map((entity, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={entity}
                    onChange={(e) => updateDataProductEntity(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter entity name"
                  />
                  <button
                    onClick={() => removeDataProductEntity(index)}
                    className="px-2 py-2 text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addDataProductEntity}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Entity
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Entities that will have full build/deploy configurations. Use only letters, numbers, hyphens, and underscores (no spaces or special characters).
              </p>
              </div>

            {/* Consumption Layer */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consumption Layer
              </label>
              <input
                type="text"
                value={config.consumptionLayer}
                onChange={(e) => setConfig(prev => ({ ...prev, consumptionLayer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., customer-360"
              />
              <p className="text-xs text-gray-500 mt-1">
                Single name only - This is the directory name for your analytics/consumption layer (e.g., &apos;analytics&apos;, &apos;data-warehouse&apos;, &apos;consumption&apos;). Do not enter multiple entities here - use only letters, numbers, hyphens, and underscores. Avoid using the same name as your project.
              </p>
            </div>

            {/* Semantic Entities */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={config.useCustomSemanticEntities}
                  onChange={(e) => setConfig(prev => ({ ...prev, useCustomSemanticEntities: e.target.checked }))}
                  className="rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Use custom semantic entities (optional)
                </label>
              </div>
              {config.useCustomSemanticEntities && (
                <div>
                  {config.semanticEntities.map((entity, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={entity}
                        onChange={(e) => updateSemanticEntity(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter semantic entity name"
                      />
                      <button
                        onClick={() => removeSemanticEntity(index)}
                        className="px-2 py-2 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addSemanticEntity}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Semantic Entity
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Additional entities for semantic modeling (defaults to data product entities). Use only letters, numbers, hyphens, and underscores (no spaces or special characters).
              </p>
          </div>
          
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md cursor-not-allowed"
                disabled
              >
                ✓ Validate
              </button>
              <button
                onClick={generatePreview}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Preview
              </button>
              <button
                onClick={generateProject}
                disabled={!isValid || isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : '✔ Generate Project'}
              </button>
                    <button
                onClick={handleDownloadZip}
                disabled={!previewData || isDownloading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? (
                        <>
                    <svg className="animate-spin h-4 w-4 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Downloading...
                        </>
                      ) : (
                        <>
                    <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                    Download ZIP
                        </>
                      )}
                    </button>
            </div>
          </div>
          
          {/* Right Panel - Project Preview & Generation Results */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Preview & Generation Results</h2>
            
            {previewData && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Project Preview</h3>
                    <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>
                <div className="bg-gray-50 rounded-md p-4 font-mono text-sm">
                  <div className="text-blue-600">{previewData.projectName}/</div>
                  
                  {/* Data Products */}
                  <div className="ml-4 mt-2">
                    <div className="text-green-600">Data Products:</div>
                    {previewData.dataProducts.map((product, index: number) => (
                      <div key={index} className="ml-4 mt-1">
                        <div className="text-blue-600">{product.entity}/</div>
                        <div className="ml-4">
                          <div className="text-blue-600">build/</div>
                          <div className="ml-4">
                            <div>data-processing/config-{product.entity}-flare.yaml</div>
                            <div>quality/config-{product.entity}-quality.yaml</div>
                        </div>
                          <div className="text-blue-600">deploy/</div>
                          <div className="ml-4">
                            <div>config-{product.entity}-scanner.yaml</div>
                            <div>config-{product.entity}-bundle.yaml</div>
                            <div>config-{product.entity}-dp.yaml</div>
                            <div>pipeline.yaml</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Consumption Layer */}
                  <div className="ml-4 mt-4">
                    <div className="text-green-600">Consumption Layer: {previewData.consumptionLayer.name}/</div>
                    <div className="ml-4 mt-1">
                      <div className="text-blue-600">activation/</div>
                      <div className="ml-4">
                        <div className="text-purple-600">custom-application/</div>
                        <div className="text-purple-600">data-apis/</div>
                        <div className="text-purple-600">notebook/</div>
                      </div>
                      <div className="text-blue-600">build/</div>
                                              <div className="ml-4">
                          <div className="text-purple-600">access-control/</div>
                          <div className="ml-4">
                            <div className="text-purple-600">{previewData.consumptionLayer.name}-access-control.yaml</div>
                            {showDetails && (
                              <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                                <pre className="whitespace-pre-wrap">{`version: v1
name: masking-policy
type: policy
layer: user
description: "Data policy to apply hashing for personally identifiable information (PII) columns based on column names"
owner:
policy:
  data:
    type: mask
    priority: 70
    selector:
      user:
        match: any
        tags:
          - "roles:id:user-masking-access"
      column:
        tags:
          - "PII.Masking"
    mask:
      operator: hash
      hash:
        algo: sha256
---
version: v1
name: piireader
type: policy
layer: user
description: "Data policy enabling controlled read access to PII columns"
owner:
policy:
  data:
    type: mask
    priority: 65
    selector:
      user:
        match: any
        tags:
          - roles:id:pii-reader
      column:
        tags:
          - "PII.Masking"
    mask:
      operator: pass_through`}</pre>
                              </div>
                            )}
                          </div>
                        <div>semantic-model/{previewData.consumptionLayer.name}/model/</div>
                        <div className="ml-4">
                          <div className="text-blue-600">sqls/ {!showDetails && `(${previewData.consumptionLayer.entities.length} files)`}</div>
                          {showDetails && (
                            <div className="ml-4">
                              {previewData.consumptionLayer.entities.map((entity: string, index: number) => (
                                <div key={index} className="mb-2">
                                  <div className="text-purple-600">{entity}.sql</div>
                                  <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1">
                                    <pre className="whitespace-pre-wrap">{`SELECT
  *
FROM
  lakehouse.sandbox.${entity}`}</pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="text-blue-600">tables/ {!showDetails && `(${previewData.consumptionLayer.entities.length} files)`}</div>
                          {showDetails && (
                            <div className="ml-4">
                              {previewData.consumptionLayer.entities.map((entity: string, index: number) => (
                                <div key={index} className="mb-2">
                                  <div className="text-purple-600">{entity}.yaml</div>
                                  <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1">
                                    <pre className="whitespace-pre-wrap">{`tables:
  - name: ${entity}
    sql: {{ load_sql('${entity}') }}
    description: Comprehensive ${entity} data for business analytics, reporting, and operational insights
    data_source: icebase
    public: true
    joins:
      - name: ${entity}
        relationship: one_to_many
        sql: "{{TABLE.${entity}_id}}= {${entity}.${entity}_id}"
    dimensions:
      - name: ${entity}_id
        description: "Primary business identifier for ${entity} used in data relationships and analytics"
        type: string
        sql: ${entity}_id
        primary_key: true
      - name: ${entity}_name
        description: "Name of the ${entity}"
        type: string
        sql: ${entity}_name
      - name: ${entity}_created_at
        description: "Creation timestamp for ${entity}"
        type: timestamp
        sql: ${entity}_created_at
      - name: ${entity}_updated_at
        description: "Last update timestamp for ${entity}"
        type: timestamp
        sql: ${entity}_updated_at
    measures:
      - name: total_${entity}
        sql: ${entity}_id
        type: count
        description: "Total count of ${entity} records for business metrics and KPI calculations"`}</pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div>views/</div>
                          <div className="text-purple-600">user_groups.yml</div>
                          {showDetails && (
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`user_groups:
  - name: compliance_category
    api_scopes:
      - meta
      - data
      - graphql
      - jobs
      - source
    includes:
      - users:id:shubhanshujain
      - users:id:dinkercharak
      - users:id:kishanmahajan
  - name: reader
    api_scopes:
      - meta
      - data
      - graphql
      - jobs
      - source
    includes:
      - users:id:yogeshkhangode
    excludes:
      - users:id:kishanmahajan
  - name: default
    api_scopes:
      - meta
      - data
      - graphql
      - jobs
      - source
    includes: "*"`}</pre>
                            </div>
                          )}
                          <div className="text-purple-600">deployment.yaml</div>
                          {showDetails && (
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`version: v1alpha
name: "${previewData.consumptionLayer.name}"
layer: user
type: lens
tags:
  - Tier.Gold
description: Deployment of ${previewData.consumptionLayer.name} Lens2 for advanced monitoring and optimized management capabilities.
lens:
  compute: runnable-default
  secrets:
    - name: gitsecret
      allKeys: true
  source:
    type: minerva
    name: minervac
    catalog: icebase
  repo:
    url: https://bitbucket.org/rubik_/solutions
    lensBaseDir: solutions/
  syncFlags:
    - --ref=canned-demo
  api:
    replicas: 1
    logLevel: info
    envs:
      LENS2_SCHEDULED_REFRESH_TIMEZONES: "UTC,America/Vancouver,America/Toronto"
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 2000m
        memory: 2048Mi
  worker:
    replicas: 1
    logLevel: info
    envs:
      LENS2_SCHEDULED_REFRESH_TIMEZONES: "UTC,America/Vancouver,America/Toronto"
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1048Mi
  router:
    logLevel: info
    envs:
      LENS2_SCHEDULED_REFRESH_TIMEZONES: "UTC,America/Vancouver,America/Toronto"
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1048Mi
  metric:
    logLevel: info`}</pre>
                            </div>
                          )}
                          <div className="text-purple-600">config.yaml</div>
                          {showDetails && (
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                            <pre className="whitespace-pre-wrap">{`logical_model: analytics
source: icebase
schema: retail

# Entity definitions with columns and types
entities:
${previewData.consumptionLayer.entities.map((entity: string) => `  ${entity}:
    dimensions:
      - name: ${entity}_id
        type: number
        primary_key: true
      - name: ${entity}_name
        type: string
      - name: ${entity}_created_at
        type: timestamp
      - name: ${entity}_updated_at
        type: timestamp`).join('\n\n')}

  transaction:
    dimensions:
      - name: transaction_id
        type: number
        primary_key: true
      - name: transaction_amount
        type: number
      - name: transaction_date
        type: timestamp
${previewData.consumptionLayer.entities.map((entity: string) => `      - name: ${entity}_id
        type: number`).join('\n')}

    joins:
${previewData.consumptionLayer.entities.map((entity: string) => `      - name: ${entity}
        relationship: many_to_one
        sql: "{{TABLE.${entity}_id}} = {${entity}.${entity}_id}"`).join('\n')}`}</pre>
                            </div>
                          )}
                          <div className="text-purple-600">docker-compose.yml</div>
                          {showDetails && (
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`version: "2.2"
x-lens2-environment: &lens2-environment
  # DataOS
  DATAOS_FQDN: known-racer.dataos.app
  # Overview
  LENS2_NAME: device360
  LENS2_DESCRIPTION: "Ecommerce use case on Adventureworks sales data"
  LENS2_TAGS: "lens2, ecom, sales and customer insights"
  LENS2_AUTHORS: "user1, user2"
  LENS2_SCHEDULED_REFRESH_TIMEZONES: "UTC,America/Vancouver,America/Toronto"
  # Data Source
  LENS2_SOURCE_TYPE: minerva
  LENS2_SOURCE_NAME: system
  LENS2_SOURCE_CATALOG_NAME: icebase
  DATAOS_RUN_AS_APIKEY: TGVucy45YTE5M2FmZC03MjBkLTQ4ZWMtOWNkOC04M2ZjMDQ0OTllZDc=
  MINERVA_TCP_HOST: tcp.known-racer.dataos.app
  # Log
  LENS2_LOG_LEVEL: error
  CACHE_LOG_LEVEL: "trace"
  # Operation
  LENS2_DEV_MODE: true
  LENS2_DEV_MODE_PLAYGROUND: false
  LENS2_REFRESH_WORKER: true
  LENS2_SCHEMA_PATH: model
  LENS2_PG_SQL_PORT: 5432
  CACHE_DATA_DIR: "/var/work/.store"
  NODE_ENV: production

services:
  api:
    restart: always
    image: rubiklabs/lens2:0.35.18-61-dev
    ports:
      - 4000:4000
      - 25432:5432
      - 13306:13306
    environment:
      <<: *lens2-environment
    volumes:
      - ./model:/etc/dataos/work/model`}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-blue-600">deploy/</div>
                      <div className="ml-4">
                        <div className="text-purple-600">config-data-product-scanner.yaml</div>
                        <div className="text-purple-600">config-{previewData.consumptionLayer.name}-bundle.yaml</div>
                        <div className="text-purple-600">config-{previewData.consumptionLayer.name}-dp.yaml</div>
                      </div>
                      <div className="text-blue-600">observability/</div>
                      <div className="ml-4">
                        <div className="text-blue-600">monitor/ {!showDetails && "(3 files)"}</div>
                        {showDetails && (
                          <div className="ml-4">
                            <div className="text-purple-600">config-workflow-failed-monitor.yaml</div>
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`name: workflow-failed-monitor
version: v1alpha
type: monitor
tags:
  - dataos:type:resource
  - workflow-failed-monitor
description: Attention! The workflow in the Public Workspace has experienced a failure.Please be rest assured,We are currently investigating the cause of the failure.Your patience is appreciated as we work to resolve this issue.Please refer to the logs for additional information.
layer: user
monitor:
  schedule: '*/1 * * * *'
  type: report_monitor
  report:
    source:
      dataOsInstance:
        path: /collated/api/v1/reports/resources/runtime?id=workflow:v1:%25:public
    conditions:
      - valueComparison:
          observationType: workflow-runs
          valueJqFilter: '.value[] | {completed: .completed, phase: .phase} | select (.completed | fromdateiso8601 > (now-600)) | .phase'
          operator: equals
          value: failed
    incident:
      name: workflowfailed
      severity: high
      incident_type: workflowruntimefailure`}</pre>
                            </div>
                            <div className="text-purple-600">config-quality-checks-failed-monitor.yaml</div>
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`name: quality-checks-failed-monitor
version: v1alpha
type: monitor
tags:
  - dataos:type:resource
  - dataos:layer:user
description: Alerts ..! recent quality check has resulted in a failure due to ambiguities found in the data. It appears there are inconsistencies or inaccuracies that require your immediate attention. To ensure the integrity and reliability of the data,Your prompt action in addressing these discrepancies will greatly assist us in maintaining the highest standards of quality.
layer: user
monitor:
  schedule: '*/30 * * * *'
  type: equation_monitor
  equation:
    leftExpression:
      queryCoefficient: 1
      queryConstant: 0
      query:
        type: trino
        cluster: system
        ql: |
          WITH cte AS (
            SELECT CASE WHEN check_outcome = 'fail' THEN 0 ELSE NULL END AS result, timestamp
            FROM icebase.sys01.soda_quality_checks
            WHERE collection = 'financial_data_companies'
            AND dataset IN (
              'company_enriched_data_01',
              'company_details_master'
            )
            and check_definition = 'duplicate_count(d_u_n_s) = 0'
            AND from_iso8601_timestamp(timestamp) >= (CURRENT_TIMESTAMP - INTERVAL '30' MINUTE)
          )
          SELECT DISTINCT result FROM cte WHERE result IS NOT NULL
    rightExpression:
      queryCoefficient: 1
      queryConstant: 0
    operator: equals
    incident:
      name: soda-check-fail
      severity: high
      incident_type: soda-quality`}</pre>
                            </div>
                            <div className="text-purple-600">config-lens-alert-monitor.yaml</div>
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`name: depletion-actual-percent-change-alert-monitor
version: v1alpha
type: monitor
monitor:
  schedule: '0 0 31 * *'
  type: equation_monitor
  equation:
    leftExpression:
      queryCoefficient: 1
      queryConstant: 0
      query:
        type: lens
        lens:
          dataOsInstance:
            name: exec-360-flash
            workspace: public
            sslmode: 'disable'
        ql: |
          SELECT MEASURE(retailer_depletion.depletion_actual_percent_change) as depletion_actual_percent_change
          FROM retailer_depletion
          LIMIT 10 OFFSET 0
      comparisonColumn:
        name: depletion_actual_percent_change
        dataType: int64
    rightExpression:
      queryCoefficient: 0
      queryConstant: 20
    operator: greater_than_equals
    incident:
      type: business-metric
      name: depletion_actual_percent_change
      category: equation
      severity: info`}</pre>
                            </div>
                          </div>
                        )}
                        <div className="text-blue-600">pager/ {!showDetails && "(3 files)"}</div>
                        {showDetails && (
                          <div className="ml-4">
                            <div className="text-purple-600">config-workflow-failed-pager.yaml</div>
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`name: workflow-failed-pager
version: v1alpha
type: pager
tags:
  - dataos:type:resource
  - workflow-failed-pager
description: This is for sending Alerts on Microsoft Teams Maggot Channel.
workspace: public
pager:
  conditions:
    - valueJqFilter: .properties.name
      operator: equals
      value: workflowfailed
    - valueJqFilter: .properties.incident_type
      operator: equals
      value: workflowruntimefailure
    - valueJqFilter: .properties.severity
      operator: equals
      value: high
  output:
    webHook:
      url: https://rubikdatasolutions.webhook.office.com/webhookb2/d9b5e7fc-3034-438a-9d8f-9af84e247940@2e22bdde-3ec2-43f5-bf92-78e9f35a44fb/IncomingWebhook/29cf283c925b4900abbfa551ec50b01f/5d420a71-7170-4d0c-af28-680a98583e58/V2IYe9tq2jfxwipVGguf5hdearXT11bVqYaa4jGBhPDZE1
      verb: post
      headers:
        'content-type': 'application/json'
      bodyTemplate: |
        {
          "@type": "MessageCard",
          "summary": "Workflow has Failed",
          "themeColor": "0076D7",
          "sections": [
            {
              "activityTitle": "Dear Team,",
              "activitySubtitle": "⚠️ Our system detected an issue with the workflow and was unable to complete the process as expected.",
              "facts": [
                {
                  "name": " The following workflow has failed:",
                  "value": "{{ index (splitn ":" 4 .ReportContext.ResourceId) "_2" }}"
                },
                {
                  "name": " Failure Time:",
                  "value": "{{ .CreateTime }}"
                },
                {
                  "name": " Severity:",
                  "value": "{{ .Properties.severity }}"
                },
                {
                  "name": " Run Details:",
                  "value": "<a href=\"https://known-racer.mydataos.com/operations/user-space/resources/resource-runtime?name={{ index (splitn ":" 4 .ReportContext.ResourceId) "_2" }}&type=workflow&workspace=public\">Operation</a>"
                },
                {
                  "name": " Logs:",
                  "value": "<a href=\"https://known-racer.mydataos.com/metis/resources/workflow/dataos.public.{{ index (splitn ":" 4 .ReportContext.ResourceId) "_2" }}/run_history\">Metis</a>"
                }
              ]
            },
            {
              "text": "Schema Change detected !!! \\n\\n We understand the importance of timely and accurate data processing, and our team is actively working to resolve the issue and get the pipeline back up and running as soon as possible. In the meantime, please be aware that the data processing for the affected workflow may be delayed or incomplete."
            },
            {
              "text": "\\n\\n"
            }
          ]
        }`}</pre>
                            </div>
                            <div className="text-purple-600">config-quality-check-failed-pager.yaml</div>
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`name: quality-failed-pager
version: v1alpha
type: pager
tags:
  - dataos:type:resource
description: This is for sending Alerts on Microsoft Teams Maggot channel
workspace: public
pager:
  conditions:
    - valueJqFilter: .properties.name
      operator: equals
      value: soda-check-fail
    - valueJqFilter: .properties.incident_type
      operator: equals
      value: soda-quality
    - valueJqFilter: .properties.severity
      operator: equals
      value: high
  output:
    email:
      emailTargets:
        - kishan.mahajan@tmdc.io
        - yogesh.khangode@tmdc.io
    webHook:
      url: https://rubikdatasolutions.webhook.office.com/webhookb2/23d5940d-c519-40db-8e75-875f3802e790@2e22bdde-3ec2-43f5-bf92-78e9f35a44fb/IncomingWebhook/7d2bbe6253494c8a8e216c22b5c9eb49/5d420a71-7170-4d0c-af28-680a98583e58
      verb: post
      headers:
        'content-type': 'application/json'
      bodyTemplate: |
        {
          "@type": "MessageCard",
          "summary": "Alert Average temp of sensor has decreased by 1.5x",
          "themeColor": "0076D7",
          "sections": [
            {
              "activityTitle": "Dear Team,",
              "activitySubtitle": "⚠️ Our system detected an issue with the data quality please check",
              "activityImage": "https://adaptivecards.io/content/cats/3.png",
              "facts": [
                {
                  "name": " Record Time:",
                  "value": "{{ .CreateTime }}"
                },
                {
                  "name": " Severity:",
                  "value": "{{ .Properties.severity }}"
                }
              ]
            },
            {
              "title": "Message",
              "text": "Quality Check Failure detected !!!\\n\\n Recent quality check has resulted in a failure due to ambiguities found in the data. It appears there are inconsistencies or inaccuracies that require your immediate attention. To ensure the integrity and reliability of the data,Your prompt action in addressing these discrepancies will greatly assist us in maintaining the highest standards of quality."
            },
            {
              "text": "\\n\\n"
            }
          ]
        }`}</pre>
                            </div>
                            <div className="text-purple-600">config-lens-alert-pager.yaml</div>
                            <div className="ml-4 text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1 mb-2">
                              <pre className="whitespace-pre-wrap">{`name: depletion-actual-percent-change-alert-pager
version: v1alpha
type: pager
tags:
  - dataos:type:resource
description: This is for sending Alerts on Microsoft Teams Alert Test Channel.
workspace: public
pager:
  conditions:
    - valueJqFilter: .properties.name
      operator: equals
      value: depletion_actual_percent_change
  output:
    webHook:
      url: https://rubikdatasolutions.webhook.office.com/webhookb2/23d5940d-c519-40db-8e75-875f3802e790@2e22bdde-3ec2-43f5-bf92-78e9f35a44fb/IncomingWebhook/aee8b3375ce94b5e8742f845c5bf18a6/07c3d4b1-971d-456e-bd7b-6a17522de08b/V2nHwZfwewJCARReddEt65VGxrXTuvJGBjpoTrve9lbHY1
      verb: post
      headers:
        content-type: application/json
      templateType: liquid
      bodyTemplate: |
        {
          "@type": "MessageCard",
          "summary": "📊 Business Alert: {{ properties.name | replace: '_', ' ' | capitalize }}",
          "themeColor": "{% if properties.severity == 'critical' %}FF0000{% elsif properties.severity == 'warning' %}FFA500{% else %}0076D7{% endif %}",
          "sections": [
            {
              "activityTitle": "🚨 Business Metric Alert",
              "activitySubtitle": "{{ properties.category | capitalize }} threshold exceeded - Action Required",
              "facts": [
                {
                  "name": "Metric:",
                  "value": "{{ properties.name | replace: '_', ' ' | capitalize }}"
                },
                {
                  "name": "Current Value:",
                  "value": "{{ equationContext.queryExpressions[0].leftExpressionValue }}%"
                },
                {
                  "name": "Threshold:",
                  "value": "{{ equationContext.queryExpressions[0].rightExpressionValue }}%"
                },
                {
                  "name": "Alert Time:",
                  "value": "{{ createTime | date: '%b %d, %Y at %I:%M %p UTC' }}"
                },
                {
                  "name": "Priority:",
                  "value": "{{ properties.severity | capitalize }}"
                }
              ]
            },
            {
              "text": "**Business Impact:**\\nThis alert indicates that {{ properties.name | replace: '_', ' ' | capitalize }} has exceeded the expected threshold of {{ equationContext.queryExpressions[0].rightExpressionValue }}%. The current value of {{ equationContext.queryExpressions[0].leftExpressionValue }}% requires immediate attention."
            },
            {
              "text": "**Recommended Actions:**\\n• Review recent business activities that may have caused this change\\n• Check related operational metrics for correlation\\n• Consider if this represents a trend or isolated event\\n• Contact the data team if you need additional analysis"
            },
            {
              "text": "For detailed analysis or to adjust alert thresholds, please contact the Data Operations team."
            }
          ]
        }`}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Semantic Entities */}
                  <div className="ml-4 mt-4 text-sm text-gray-600">
                    Semantic Entities: {previewData.consumptionLayer.entities.join(', ')}
                  </div>
                </div>
              </div>
            )}

                        {/* Generation Results */}
            {generationResult && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Generation Results</h3>
                <div className={`p-4 rounded-md ${
                  generationResult.includes('successfully') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {generationResult}
                </div>
                {generationResult.includes('Project generated successfully') && (
                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded-md">
                    <p className="text-sm">
                      💡 <strong>Tip:</strong> Use the &quot;Download ZIP&quot; button to download all generated YAML files as a ZIP archive.
                    </p>
                  </div>
                )}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 