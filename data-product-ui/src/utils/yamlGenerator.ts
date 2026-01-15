import { DataProduct } from '@/types/dataProduct';

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateYamlFiles(dataProduct: DataProduct): GeneratedFile[] {
  // Generate the complete customer-market-place style structure from the
  // consumer request. Source requests return no files because the consumer
  // template already includes per-source sections and shared base artifacts.
  if (dataProduct.type === 'consumer') {
    return generateCustomerStyleFiles(dataProduct);
  }

  return [];
}

function generateCustomerStyleFiles(dataProduct: DataProduct): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  const baseName = dataProduct.name || dataProduct.entity;
  const consumerName = dataProduct.entity;
  const sources = dataProduct.entities && dataProduct.entities.length > 0
    ? dataProduct.entities
    : ['dataset'];
  const sourceTypes = dataProduct.sourceTypes && dataProduct.sourceTypes.length > 0 ? dataProduct.sourceTypes : [];
  const fallbackDepotType = (dataProduct.secretType || dataProduct.depotType || 'bigquery').toLowerCase();
  const fallbackDepotName = dataProduct.depotName || fallbackDepotType;

  const depots: Array<{ name: string; type: string; secretName?: string }> =
    dataProduct.depots && dataProduct.depots.length > 0
      ? dataProduct.depots.map((d) => ({
          name: d.name,
          type: (d.type || fallbackDepotType).toLowerCase(),
          secretName: d.secretName,
        }))
      : [
          {
            name: fallbackDepotName,
            type: fallbackDepotType,
            secretName: undefined,
          },
        ];

  const secretType = depots[0]?.type || fallbackDepotType;
  const depotName = depots[0]?.name || fallbackDepotName;
  const clusterName = dataProduct.clusterName || 'minervac';
  const scanners =
    dataProduct.scanners && dataProduct.scanners.length > 0
      ? dataProduct.scanners
      : [
          {
            name: dataProduct.scannerName || 'data-product-scanner',
            depot: depotName,
            includePattern: dataProduct.name || baseName,
          },
        ];

  const toSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      // Snowflake schemas cannot contain hyphens; normalize everything non-alnum to underscore.
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const projectSlug = toSlug(baseName);

  const addFile = (path: string, content: string) => {
    files.push({ path, content });
  };

  // 1.x Setup - secrets per depot
  depots.forEach((depot) => {
    const dName = depot.name || secretType;
    const dType = depot.type || secretType;
    const dSecret = depot.secretName || `${dName}-secret`;
    const secretFilePath = `${baseName}/1.1-instance-secrets/config-${dName}-secrets.yaml`;
    const secretContent =
      dType === 'bigquery'
        ? `name: ${dSecret}
version: v1
type: instance-secret
description: secrets
layer: user
instance-secret:
  type: key-value-properties
  acl: rw
  data:
    projectid: ${baseName}-project
    email: ${baseName}@example.iam.gserviceaccount.com
  files:
    json_keyfile: ${baseName}/1.1-instance-secrets/secret.json
`
        : dType === 'snowflake'
          ? `name: ${dSecret}
version: v1
type: instance-secret
description: secrets
layer: user
instance-secret:
  type: key-value-properties
  acl: rw
  data:
    account: ${baseName}-account
    user: ${baseName}-user
  files:
    credentials: ${baseName}/1.1-instance-secrets/secret.properties
`
          : `name: ${dSecret}
version: v1
type: instance-secret
description: secrets
layer: user
instance-secret:
  type: key-value-properties
  acl: rw
  data:
    user: ${baseName}-user
  files:
    credentials: ${baseName}/1.1-instance-secrets/secret.properties
`;
    addFile(secretFilePath, secretContent);
  });

  depots.forEach((depot) => {
    const dName = depot.name || secretType;
    const dType = depot.type || secretType;
    const dSecret = depot.secretName || `${dName}-secret`;
    const depotFilePath = `${baseName}/1.2-depot/config-${dName}-depot.yaml`;
    const depotContent =
      dType === 'snowflake'
        ? `name: ${dName}
version: v2alpha
type: depot
tags:
  - Tier.Gold
layer: user
depot:
  name: ${dName}
  type: snowflake
  description: Depot to connect to snowflake.
  secrets:
    - name: ${dSecret}
      allKeys: true
  external: true
  snowflake:
    database: SOLUTION
    url: ${baseName}.snowflakecomputing.com
    warehouse: COMPUTE_WH
    account: ${baseName}
  source: snowflake
`
        : dType === 'bigquery'
          ? `version: v1
name: "${dName}"
type: depot
tags:
  - bigquery
layer: user
depot:
  type: BIGQUERY
  description: "Google Cloud BigQuery"
  spec:
    project: ${baseName}-project
  external: true
  connectionSecret:
    - acl: rw
      type: key-value-properties
      files:
        json_keyfile: ${baseName}/1.1-instance-secrets/secret.json
`
          : `name: ${dName}
version: v1
type: depot
tags:
  - Tier.Gold
layer: user
depot:
  name: ${dName}
  type: ${dType}
  description: Depot configuration for ${dType}.
  external: true
  connectionSecret:
    - name: ${dSecret}
      allKeys: true
  source: ${dType}
`;

    addFile(depotFilePath, depotContent);
  });

  addFile(
    `${baseName}/1.3-cluster/config-minerva-cluster.yaml`,
    `name: ${clusterName}
version: v1
type: cluster
tags:
  - cluster
  - minerva
  - dataos:type:resource
  - dataos:resource:cluster
  - dataos:layer:system
  - dataos:workspace:system
description: the default minerva cluster
owner: dataos-manager
workspace: system
cluster:
  compute: query-default
  type: minerva
  minerva:
    replicas: 1
    resources:
      requests:
        cpu: 2000m
        memory: 8Gi
      limits:
        cpu: 4000m
        memory: 16Gi
    depots:
      - address: dataos://icebase:default
        properties:
          iceberg.file-format: PARQUET
          iceberg.compression-codec: GZIP
          hive.config.resources: "/usr/trino/etc/catalog/core-site.xml"
      - address: dataos://gateway:default
      - address: dataos://metisdb:default
      - address: dataos://depotservice:default
      - address: dataos://${depotName}:default
    coordinatorEnvs:
      "JVM__opts": "--add-opens=java.base/java.nio=ALL-UNNAMED"
    workerEnvs:
      "JVM__opts": "--add-opens=java.base/java.nio=ALL-UNNAMED"
    debug:
      logLevel: ERROR
      trinoLogLevel: ERROR
`
  );

  scanners.forEach((scanner) => {
    const scannerSlug = toSlug(scanner.name || 'scanner');
    const depotRef = scanner.depot || depotName;
    const includePattern = scanner.includePattern || baseName;
    addFile(
      `${baseName}/1.4-scanner/config-${scannerSlug}-scanner.yaml`,
      `version: v1
name: wf-${scannerSlug}-scanner
type: workflow
tags:
- Tier.Gold
description: Scan schema from ${depotRef} and register in Metis.
owner: dataos-manager
workspace: public
workflow:
  dag:
  - name: ${scannerSlug}-scanner
    description: Scan schema and register in Metis.
    spec:
      tags:
      - scanner
      stack: scanner:2.0
      runAsUser: metis
      compute: runnable-default
      resources:
        requests:
          cpu: 200m
          memory: 250Mi
        limits:
          cpu: '1'
          memory: 1000Mi
      stackSpec:
        depot: dataos://${depotRef}
        sourceConfig:
          config:
            schemaFilterPattern:
              includes:
              - ${includePattern}
`
    );
  });

  // 2.x Source-aligned sections
  const resolveSourceType = (index: number) => (sourceTypes[index] || secretType).toLowerCase() as string;

  type InputTarget = { target: string; format: string; optionsLines: string[] };

  const inputTargets: Record<string, InputTarget> = {
    s3: {
      target: 's3',
      format: 'csv',
      optionsLines: ['header: true', 'inferSchema: true'],
    },
    snowflake: {
      target: 'snowflake',
      format: 'Snowflake',
      optionsLines: ['extraOptions:', '  sfWarehouse: COMPUTE_WH'],
    },
    postgres: {
      target: 'postgres',
      format: 'jdbc',
      optionsLines: ['driver: org.postgresql.Driver'],
    },
    mysql: {
      target: 'mysql',
      format: 'jdbc',
      optionsLines: ['driver: com.mysql.cj.jdbc.Driver'],
    },
    oracle: {
      target: 'oracle',
      format: 'jdbc',
      optionsLines: ['driver: oracle.jdbc.driver.OracleDriver'],
    },
    mssql: {
      target: 'mssql',
      format: 'jdbc',
      optionsLines: ['driver: com.microsoft.sqlserver.jdbc.SQLServerDriver'],
    },
    bigquery: {
      target: 'bigquery',
      format: 'table',
      optionsLines: [],
    },
  };

  const getInputTarget = (srcType: string): InputTarget => inputTargets[srcType] || { target: secretType, format: 'table', optionsLines: [] };

  const buildInputConfig = (srcName: string, srcType: string) => {
    const target = getInputTarget(srcType);
    const dataset =
      target.target === 's3'
        ? `dataos://s3:${projectSlug}/${srcName}.csv?acl=rw`
        : `dataos://${target.target}:${projectSlug}/${srcName}`;
    return {
      dataset,
      format: target.format,
      optionsLines: target.optionsLines,
    };
  };

  type OutputTarget = { target: string; format: string; optionsLines: string[] };

  const outputTargets: Record<string, OutputTarget> = {
    icebase: {
      target: 'icebase',
      format: 'Iceberg',
      optionsLines: [
        'saveMode: overwrite',
        'iceberg:',
        '  properties:',
        '    write.format.default: parquet',
        '    write.metadata.compression-codec: gzip',
      ],
    },
    snowflake: {
      target: 'snowflake',
      format: 'Snowflake',
      optionsLines: ['extraOptions:', '  sfWarehouse: COMPUTE_WH', 'saveMode: overwrite'],
    },
    postgres: {
      target: 'postgres',
      format: 'jdbc',
      optionsLines: ['driver: org.postgresql.Driver', 'saveMode: overwrite'],
    },
    mysql: {
      target: 'mysql',
      format: 'jdbc',
      optionsLines: ['driver: com.mysql.cj.jdbc.Driver', 'saveMode: overwrite'],
    },
    oracle: {
      target: 'oracle',
      format: 'jdbc',
      optionsLines: ['driver: oracle.jdbc.driver.OracleDriver', 'saveMode: overwrite'],
    },
    mssql: {
      target: 'mssql',
      format: 'jdbc',
      optionsLines: ['driver: com.microsoft.sqlserver.jdbc.SQLServerDriver', 'saveMode: overwrite'],
    },
  } as const;

  const getOutputTarget = (srcType: string): OutputTarget => outputTargets[srcType] || outputTargets.icebase;

  sources.forEach((src, index) => {
    const section = `2.${index + 1}-${src}`;
    const sourceTitle = src.charAt(0).toUpperCase() + src.slice(1);
    const slugSrc = toSlug(src);
    const sourceType = resolveSourceType(index);
    const inputConfig = buildInputConfig(slugSrc, sourceType);
    // Outputs always use icebase catalog for consistency
    const outputTarget = outputTargets.icebase;
    const outputDataset = `dataos://${outputTarget.target}:${projectSlug}/${slugSrc}?acl=rw`;
    const outputRef = `dataset:${outputTarget.target}:${projectSlug}:${slugSrc}`;
    const outputOptionsBlock =
      outputTarget.optionsLines && outputTarget.optionsLines.length > 0
        ? `\n                options:\n${outputTarget.optionsLines.map((line: string) => `                  ${line}`).join('\n')}`
        : '';
    const inputOptionsBlock =
      inputConfig.optionsLines && inputConfig.optionsLines.length > 0
        ? `\n                options:\n${inputConfig.optionsLines.map((line: string) => `                  ${line}`).join('\n')}`
        : '';

    addFile(
      `${baseName}/${section}/deploy/config-${src}-bundle.yaml`,
      `name: ${src}-bundle
version: v1beta
type: bundle
tags:
  - Tier.Gold
description: The purpose of the bundle is to deploy the resources of the ${src} Data Product, making it available for consumption in ${src}.
layer: "user"
bundle:
  resources:
    - id: ${src}-pipeline
      file: ${section}/deploy/pipeline.yaml
      workspace: public
`
    );

    addFile(
      `${baseName}/${section}/deploy/config-${src}-dp.yaml`,
      `name: ${src}-dp
version: v1beta
type: data
description: |
  ${src} delivers structured, time-stamped event data that reveals key operational signals, enabling observability and data-driven optimization.
tags:
  - DPUsecase.${projectSlug}
  - DPTier.Source Aligned
  - DPDomain.${projectSlug}
purpose: |
  Enables faster decisions and performance insights by converting raw events into trusted, analytics-ready data for monitoring and diagnostics.
v1beta:
  data:
    meta:
      title: ${sourceTitle}
    collaborators:
      - name: owner
        description: owner
      - name: developer
        description: developer
    resource:
      refType: dataos
      ref: bundle:v1beta:${src}-bundle
    inputs:
      - refType: depot
        ref: dataos://snowflake:${projectSlug}/${slugSrc}
    outputs:
      - refType: dataos
        ref: ${outputRef}
`
    );

    addFile(
      `${baseName}/${section}/deploy/pipeline.yaml`,
      `version: v1
name: wf-${src}-pipeline
type: workflow
tags:
  - Tier.Gold
  - Domain.${src}
description: The "wf-${src}-pipeline" is a data pipeline focused on processing ${src} data. It involves stages such as data ingestion and quality assurance to derive insights.
workflow:
  title: ${src} Pipeline
  dag: 
    - name: ${src}-ingestion
      file: ${section}/build/data-processing/config-${src}-flare.yaml
      retry: 
        count: 2
        strategy: "OnFailure"

    - name: ${src}-quality
      file: ${section}/build/quality/config-${src}-quality.yaml
      retry: 
        count: 2
        strategy: "OnFailure"        
      dependencies:
        - ${src}-ingestion
`
    );

    addFile(
      `${baseName}/${section}/deploy/scanner.yaml`,
      `version: v1
name: wf-${src}-scanner
type: workflow
description: The task involves scanning the schema from the data product and registering the data into Metis.
workflow:
  dag:
    - name: data-product-scanner
      description: The task involves scanning the schema from the data product and registering the data into Metis.
      spec:
        stack: scanner:2.0
        compute: runnable-default
        runAsUser: metis
        stackSpec:
          type: data-product
          sourceConfig:
            config:
              type: DataProduct
              markDeletedDataProducts: true
              dataProductFilterPattern:
                includes:
                  - ${src}-dp
`
    );

    // Build configs referenced by pipeline
    addFile(
      `${baseName}/${section}/build/data-processing/config-${src}-flare.yaml`,
      `version: v1
name: wf-${src}-flare
type: workflow
tags:
  - Tier.Gold
description: This workflow is responsible for ingesting ${src} for analysis from source into Lakehouse.
workflow:
  title: ${sourceTitle} Source Dataset
  dag:
    - name: ${src}-flare
      description: This workflow is responsible for ingesting ${src} for analysis from source into Lakehouse.
      title: ${sourceTitle} Source Dataset
      spec:
        tags:
          - Tier.Gold
        stack: flare:6.0
        compute: runnable-default
        stackSpec:
          driver:
            coreLimit: 1200m
            cores: 1
            memory: 1024m
          executor:
            coreLimit: 1200m
            cores: 1
            instances: 1
            memory: 1024m
          job:
            explain: true
            inputs:
              - name: ${src}_input
                dataset: ${inputConfig.dataset}
                format: ${inputConfig.format}${inputOptionsBlock}
            logLevel: INFO
            outputs:
              - name: ${src}_final_dataset
                dataset: ${outputDataset}
                format: ${outputTarget.format}${outputOptionsBlock}
                description: Final ${src} dataset.
                tags:
                  - Tier.Gold
            steps:
              - sequence:
                  - name: ${src}_final_dataset
                    sql: |
                      SELECT 
                        *
                      FROM
                        ${src}_input_1
`
    );

    const isCustomers = slugSrc === 'customers';
    const qualityContent = isCustomers
      ? `name: wf-${projectSlug}-${slugSrc}-quality
version: v1
type: workflow
tags:
  - Tier.Gold
description: |
  Performs quality checks on raw ${src} event data to ensure completeness, consistency, and schema compliance—strengthening data trust and enabling better business decisions.
workspace: public
workflow:
  dag:
    - name: ${projectSlug}-${slugSrc}-quality
      description: |
        Performs quality checks on raw ${src} event data to ensure completeness, consistency, and schema compliance—strengthening data trust and enabling better business decisions.
      title: ${sourceTitle} Quality Assertion
      spec:
        stack: soda+python:1.0 
        logLevel: INFO
        compute: runnable-default
        resources:
          requests:
            cpu: 1000m
            memory: 250Mi
          limits:
            cpu: 1000m
            memory: 250Mi
        stackSpec:
          inputs:
            - dataset: ${outputDataset} 
              options:
                engine: minerva
                clusterName: system   
              checks:
                - missing_count(customer_id) = 0:
                    attributes:
                      category: Accuracy
                      description: Customer ID is required and must not contain missing values.

                - duplicate_count(customer_id) = 0:
                    attributes:
                      category: Uniqueness
                      description: Customer ID must be unique and not contain duplicate values.

                - missing_percent(primary_mobile) < 50:
                    attributes:
                      category: Completeness
                      description: At least 50% of customers should have mobile numbers.

                - invalid_count(kyc_status) = 0:
                    valid values: ['verified', 'pending', 'rejected', 'expired']
                    attributes:
                      category: Validity
                      description: KYC status must have valid values.


                - freshness(created_at) <= 730d:
                    attributes:
                      category: Freshness
                      description: Customer records should be created within the last 2 years.


                - schema:
                    name: Confirm that required columns are present
                    warn:
                      when required column missing: 
                        - customer_id
                        - cif_number
                        - full_name
                        - customer_type
                        - status
                        - created_at
                    fail:
                      when required column missing:
                        - customer_id
                        - cif_number
                        - status
                    attributes:
                      category: Schema
                      description: Required columns must be present in the dataset.

                - active_customers_percentage > 50:
                    active_customers_percentage query: |
                      SELECT 
                        COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM ${src}), 0) as active_customers_percentage
                      FROM ${src} 
                      WHERE status = 'active'
                    name: Active Customers Percentage
                    attributes:
                      category: Accuracy
                      description: At least 50% of customers should have active status.

              profile:
                columns:
                  - "*"
`
      : `name: wf-${src}-quality
version: v1
type: workflow
tags:
  - Tier.Gold
description: |
  Performs quality checks on raw ${src} event data to ensure completeness, consistency, and schema compliance.
workspace: public
workflow:
  dag:
    - name: ${src}-quality
      description: |
        Performs quality checks on raw ${src} event data to ensure completeness, consistency, and schema compliance.
      title: ${sourceTitle} Quality Assertion
      spec:
        stack: soda+python:1.0 
        logLevel: INFO
        compute: runnable-default
        resources:
          requests:
            cpu: 1000m
            memory: 250Mi
          limits:
            cpu: 1000m
            memory: 250Mi
        stackSpec:
          inputs:
            - dataset: ${outputDataset} 
              options:
                engine: minerva
                clusterName: system   
              checks:
                - missing_count(${src}_id) = 0:
                    attributes:
                      category: Accuracy
              profile:
                columns:
                  - "*"
`;

    addFile(
      `${baseName}/${section}/build/quality/config-${src}-quality.yaml`,
      qualityContent
    );
  });

  // 3.x Consumer-aligned DP
  addFile(
    `${baseName}/3.1-${consumerName}/deploy/config-${consumerName}-dp.yaml`,
    `name: ${consumerName}-dp
version: v1beta
type: data
description: |
  ${consumerName} consumer-aligned data product delivers business-ready analytics and insights, enabling data-driven decision making and operational excellence.
tags:
  - DPUsecase.${toSlug(baseName)}
  - DPTier.Consumer Aligned
  - DPDomain.${toSlug(baseName)}
purpose: |
  Enables business users to make informed decisions by providing clean, aggregated, and business-ready data for reporting, analytics, and operational dashboards.
v1beta:
  data:
    meta:
      title: ${consumerName}
      sourceCodeUrl: https://example.com/${baseName}
    collaborators:
      - name: owner
        description: owner
      - name: developer
        description: developer
    resource:
      refType: dataos
      ref: bundle:v1beta:${consumerName}-bundle
    inputs:
${sources.map(src => `      - refType: dataos\n        ref: dataset:icebase:${toSlug(baseName)}:${toSlug(src)}`).join('\n') || '      - refType: dataos\n        ref: dataset:icebase:base:dataset'}
    ports:
      rest:
        - url: https://example.com/api/v2/rest
          meta:
            description: REST API access for ${consumerName} data operations

      lens:
        ref: lens:v1alpha:${consumerName}:public  
        refType: dataos

      talos:
        ref: service:v1:${consumerName}-talos-api:public
        refType: dataos
`
  );

  addFile(
    `${baseName}/3.1-${consumerName}/deploy/config-${consumerName}-bundle.yaml`,
    `name: ${consumerName}-bundle
version: v1beta
type: bundle
tags:
  - Tier.Gold
description: Bundle for ${consumerName} consumer data product.
layer: "user"
bundle:
  resources:
    - id: ${consumerName}-dp
      file: ${baseName}/3.1-${consumerName}/deploy/config-${consumerName}-dp.yaml
      workspace: public
    - id: ${consumerName}-lens
      file: ${baseName}/3.1-${consumerName}/semantic-model/deployment.yaml
      workspace: public
`
  );

  addFile(
    `${baseName}/3.1-${consumerName}/deploy/config-data-product-scanner.yaml`,
    `name: wf-${consumerName}-data-product-scanner
version: v1
type: workflow
description: |
  Scans and registers ${consumerName} consumer-aligned data products and semantic models into the data catalog.
workflow:
  dag:
    - name: ${consumerName}-data-product-scanner
      description: |
        Scans the semantic model for ${consumerName} and registers it into the data catalog.
      title: ${consumerName} Data Product Scanner
      spec:
        stack: scanner:2.0
        compute: runnable-default
        runAsUser: metis
        stackSpec:
          type: semantic-model
          sourceConfig:
            config:
              type: SemanticModel
              markDeletedDataProducts: true
              dataProductFilterPattern:
                includes:
                  - ${consumerName}
`
  );

  // Activation - Talos/Lens
  addFile(
    `${baseName}/3.1-${consumerName}/activation/data-apis/lens-talos/config-talos-lens-service.yaml`,
    `name: ${consumerName}-talos-api
version: v1
type: service
tags:
  - dataos:talos-service
  - Domain.${baseName}
description: Talos service for ${consumerName} data.
workspace: public
service:
  servicePort: 3000
  ingress:
    enabled: true
    stripPath: true
    path: /talos/public:${consumerName}-talos-api
    noAuthentication: false
  replicas: 1
  logLevel: DEBUG
  compute: runnable-default
  envs:    
    TALOS_SCHEMA_PATH: ${baseName}/3.1-${consumerName}/activation/data-apis/lens-talos
    TALOS_BASE_PATH: /talos/public:${consumerName}-talos-api
  resources: 
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  stack: talos:2.0
  dataosSecrets:
    - name: ${baseName}-secret
      allKeys: true
  stackSpec:
    repo:
      url: https://example.com/${baseName}.git
      projectDirectory: ${baseName}/3.1-${consumerName}/activation/data-apis/lens-talos
      syncFlags:   
        - --ref=main
`
  );

  addFile(
    `${baseName}/3.1-${consumerName}/activation/data-apis/lens-talos/config.yaml`,
    `name: ${consumerName}
description: A talos app for ${consumerName} API
version: 0.0.1
logLevel: DEBUG
auth:
    heimdallUrl: https://example.com/heimdall
cachePath: /tmp    
sources:
    - name: ${consumerName}
      type: lens
      lensName: 'public:${consumerName}'
`
  );

  addFile(
    `${baseName}/3.1-${consumerName}/activation/data-apis/lens-talos/apis/${consumerName}-sample.sql`,
    `SELECT 
  *
FROM
  ${sources[0] || 'dataset'}
LIMIT 10
`
  );

  addFile(
    `${baseName}/3.1-${consumerName}/activation/data-apis/lens-talos/apis/${consumerName}-sample.yaml`,
    `urlPath: /${consumerName}_sample_api
description: Sample API for ${consumerName}
response : 
    - name: sample_field
      description: Example response field
source: ${consumerName}
`
  );

  // Activation helpers
  addFile(
    `${baseName}/3.1-${consumerName}/activation/data-apis/README.md`,
    `# Data APIs for ${consumerName}

This directory contains API definitions for accessing ${consumerName} data.
`
  );

  addFile(
    `${baseName}/3.1-${consumerName}/activation/custom-application/README.md`,
    `# Custom Application for ${consumerName}

This directory contains custom applications for consuming ${consumerName} data.
`
  );

  addFile(
    `${baseName}/3.1-${consumerName}/activation/notebook/README.md`,
    `# Notebooks for ${consumerName}

This directory contains notebooks for exploring ${consumerName} data.
`
  );

  // Semantic model (lens) assets for consumer
  const lensBasePath = `${baseName}/3.1-${consumerName}/semantic-model/model`;
  const lensDeployPath = `${baseName}/3.1-${consumerName}/semantic-model`;

  // SQLs per source
  sources.forEach((src) => {
    addFile(
      `${lensBasePath}/sqls/${src}.sql`,
      `SELECT
  *
FROM
  icebase.${toSlug(baseName)}.${toSlug(src)}
`
    );
  });

  // Tables per source
  sources.forEach((src) => {
    addFile(
      `${lensBasePath}/tables/${src}.yaml`,
      `tables:
  - name: ${src}
    sql: {{ load_sql('${src}') }}
    description: Comprehensive ${src} data for analytics and reporting
    data_source: icebase
    public: true

    dimensions:
      - name: ${src}_id
        description: "Primary business identifier for ${src}"
        type: string
        sql: ${src}_id
        primary_key: true

    measures:
      - name: total_${src}
        sql: ${src}_id
        type: count
        description: "Total count of ${src} records"
`
    );
  });

  // User groups
  addFile(
    `${lensBasePath}/user_groups.yml`,
    `user_groups:
  - name: reader
    api_scopes:
      - meta
      - data
      - graphql
      - jobs
      - source
    includes: "*"
`
  );

  // Deployment
  addFile(
    `${lensDeployPath}/deployment.yaml`,
    `---
version: v1alpha
name: "${consumerName}"
layer: user
type: lens
tags:
  - Tier.Gold
description: Deployment of ${consumerName} Lens for analytics.
lens:
  compute: runnable-default
  source:
    type: minerva
    name: minervac
    catalog: icebase
  repo:
    url: https://example.com/${baseName}.git
    lensBaseDir: ${baseName}/3.1-${consumerName}/semantic-model
    syncFlags:
      - --ref=main
  api:
    replicas: 1
    logLevel: info
  worker:
    replicas: 1
    logLevel: info
`
  );

  // Images placeholder
  addFile(
    `${baseName}/images/README.md`,
    `# Images

Place diagrams or screenshots related to ${baseName} here.
`
  );

  // Root README
  addFile(
    `${baseName}/README.md`,
    `# ${baseName}

Generated structure for ${baseName} following the customer-market-place template.
`
  );

  return files;
}