import { DataProduct } from '@/types/dataProduct';

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateYamlFiles(dataProduct: DataProduct): GeneratedFile[] {
  // Generate different templates based on data product type
  if (dataProduct.type === 'consumer') {
    return generateConsumerAlignedFiles(dataProduct);
  }
  
  // Default to source aligned files
  return generateSourceAlignedFiles(dataProduct);
}

function generateSourceAlignedFiles(dataProduct: DataProduct): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Flare configuration
  files.push({
    path: `${dataProduct.entity}/build/data-processing/config-${dataProduct.entity}-flare.yaml`,
    content: `# Flare Configuration for ${dataProduct.name}
# Generated on ${new Date().toISOString()}
# Based on flare-template.yaml from Data-Product-Generator

version: v1
name: wf-${dataProduct.entity}-flare
type: workflow
tags:
  - Tier.Gold
description: This workflow is responsible for ingesting ${dataProduct.entity} for analysis from source into Lakehouse.

workflow:
  title: ${dataProduct.name} Source Dataset
  dag:
    - name: ${dataProduct.entity}-flare
      description: This workflow is responsible for ingesting ${dataProduct.entity} for analysis from source into Lakehouse.
      title: ${dataProduct.name} Source Dataset
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
              - name: ${dataProduct.entity}_input
                dataset: dataos://thirdparty01:sandbox/${dataProduct.entity}.json?acl=rw
                format: json
                options:
                  multiLine: true

              - name: ${dataProduct.entity}_input
                dataset: dataos://thirdparty01:sandbox/${dataProduct.entity}.csv?acl=rw
                format: csv
                options:
                  header: true
                  inferSchema: true

              - name: ${dataProduct.entity}_input
                dataset: dataos://postgres:sandbox/${dataProduct.entity}?acl=rw
                options:
                  driver: org.postgresql.Driver
                  
              - name: ${dataProduct.entity}_input
                dataset: dataos://bigquery:sandbox/${dataProduct.entity}?acl=rw
                format: Bigquery
            logLevel: INFO
            outputs:
              - name: ${dataProduct.entity}_final_dataset
                dataset: dataos://${dataProduct.entity}_catalog:sandbox/${dataProduct.entity}?acl=rw
                format: Iceberg
                description: The ${dataProduct.entity} table is a structured dataset that contains comprehensive information about various ${dataProduct.entity} within the organization. It serves as a central repository for ${dataProduct.entity} data, facilitating efficient management, analysis, and decision-making processes related to ${dataProduct.entity} operations, logistics, and customer engagement.
                tags:
                  - Tier.Gold
                options:
                  saveMode: overwrite
                  iceberg:
                    properties:
                      write.format.default: parquet
                      write.metadata.compression-codec: gzip
                title: ${dataProduct.name} Source Dataset
            steps:
              - sequence:
                  - name: ${dataProduct.entity}_final_dataset
                    sql: |
                      SELECT 
                        *
                      FROM
                        ${dataProduct.entity}_input_1
                    functions:
                      - name: cleanse_column_names
                      - name: change_column_case
                        case: lower
                      - name: set_type
                        columns:
                          created_at: timestamp
                          updated_at: timestamp
                      - name: drop
                        columns:
                          - temp_column
`
  });

  // Quality template for data-processing section
  files.push({
    path: `${dataProduct.entity}/build/quality/config-${dataProduct.entity}-quality.yaml`,
    content: `name: wf-${dataProduct.entity}-quality
version: v1
type: workflow
tags:
  - Tier.Gold
description: |
  Performs quality checks on raw ${dataProduct.entity} event data to ensure completeness, consistency, and schema compliance—strengthening data trust and enabling better business decisions.
workspace: public
workflow:
  # schedule:
  #   cron: '*/5 * * * *'
  #   concurrencyPolicy: Forbid
  dag:
    - name: ${dataProduct.entity}-quality
      description: |
        Performs quality checks on raw ${dataProduct.entity} event data to ensure completeness, consistency, and schema compliance—strengthening data trust and enabling better business decisions.
      title: ${dataProduct.name} Quality Assertion
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
            - dataset: dataos://icebase:${dataProduct.entity}/${dataProduct.entity}?acl=rw 
              options:
                engine: minerva
                clusterName: system   
              checks:
                - missing_count(${dataProduct.entity}_id) = 0: 
                    attributes:
                      category: Accuracy

                - duplicate_percent(${dataProduct.entity}_id) < 0.10:
                    attributes:
                      category: Validity

                - duplicate_count(${dataProduct.entity}_id) = 0:
                    attributes:
                      category: Uniqueness
                      description: The ${dataProduct.entity} column must not contain duplicate values.

                - missing_count(${dataProduct.entity}_id) = 0:
                    attributes:
                      category: Completeness
                      description: The ${dataProduct.entity} column must not contain missing values.

                - invalid_count(item_name) <= 0:
                    valid regex: \\b(?:DeviceDriverLoaded|DeviceDriverInstall)\\b
                    attributes:
                      category: Validity

                - freshness(created_at)  < 730d:
                    attributes:
                      category: Freshness
                - schema:
                    name: Confirm that required columns are present
                    warn:
                      when required column missing: [${dataProduct.entity}_id]
                    fail:
                      when required column missing:
                        - ${dataProduct.entity}_id
                    attributes:
                      category: Schema 

                -  amount_limit = 1:
                    amount_limit query: |
                      SELECT
                        CASE
                          WHEN cast(amount AS integer)  <= 70 then 1
                          ELSE 0
                        END
                        FROM
                          ${dataProduct.entity}
                    attributes:
                      category: Accuracy
              profile:
                columns:
                  - "*"
`
  });



  // Scanner configuration
  files.push({
    path: `${dataProduct.entity}/deploy/scanner.yaml`,
    content: `version: v1
name: wf-${dataProduct.entity}-scanner
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
                  - ${dataProduct.entity}-dp
`
  });

  // Bundle configuration
  files.push({
    path: `${dataProduct.entity}/deploy/config-${dataProduct.entity}-bundle.yaml`,
    content: `name: ${dataProduct.entity}-bundle
version: v1beta
type: bundle
tags:
  - Tier.Gold
description: The purpose of the bundle is to deploy the resources of the ${dataProduct.entity} Data Product, making it available for consumption in ${dataProduct.entity}.
layer: "user"
bundle:
  resources:
    - id: ${dataProduct.entity}-pipeline
      file: ${dataProduct.entity}/${dataProduct.entity}/deploy/pipeline.yaml
      workspace: public
`
  });

  // Data Product configuration
  files.push({
    path: `${dataProduct.entity}/deploy/config-${dataProduct.entity}-dp.yaml`,
    content: `name: ${dataProduct.entity}-dp
version: v1beta
type: data
description: |
  ${dataProduct.entity} delivers structured, time-stamped event data that reveals key operational signals, enabling observability and data-driven optimization.
tags:
  - DPUsecase.Device Performance Analysis
  - DPTier.Source Aligned
  - DPDomain.Device Intelligence
purpose: |
  Enables faster decisions and performance insights by converting raw events into trusted, analytics-ready data for monitoring and diagnostics.
v1beta:
  data:
    meta:
      title: ${dataProduct.entity}
      sourceCodeUrl: https://bitbucket.org/rubik_/solutions/src/canned-demo/customer-solution/device-telemetry/device-process-event/
      trackerUrl: https://rubikai.atlassian.net/browse/DPRB-86?atlOrigin=eyJpIjoiM2U5NGM2ZTRkZDc4NGNjZGEzMmVmMDgyMzBlMWUxMWYiLCJwIjoiaiJ9
    collaborators:
      - name: yogeshkhangode
        description: owner
      - name: kishanmahajan
        description: developer
    resource:
      refType: dataos
      ref: bundle:v1beta:${dataProduct.entity}-bundle
    inputs:
      - refType: depot
        ref: dataos://postgres:public/${dataProduct.entity}
    outputs:
      - refType: dataos
        ref: dataset:lakehouse:sandbox:${dataProduct.entity}
`
  });

  // Pipeline configuration
  files.push({
    path: `${dataProduct.entity}/deploy/pipeline.yaml`,
    content: `version: v1
name: wf-${dataProduct.entity}-pipeline
type: workflow
tags:
  - Tier.Gold
  - Domain.${dataProduct.entity}
description: The "wf-${dataProduct.entity}-pipeline" is a data pipeline focused on processing ${dataProduct.entity} data. It involves stages such as data ingestion and quality assurance to derive insights.
workflow:
  # schedule:
  #   cron: '0 2 * * 6'
  #   concurrencyPolicy: Forbid
  title: ${dataProduct.entity} Pipeline
  dag: 
    - name: ${dataProduct.entity}-ingestion
      file: ${dataProduct.entity}/${dataProduct.entity}/build/data-processing/config-${dataProduct.entity}-flare.yaml
      retry: 
        count: 2
        strategy: "OnFailure"

    - name: ${dataProduct.entity}-quality
      file: ${dataProduct.entity}/${dataProduct.entity}/build/quality/config-${dataProduct.entity}-quality.yaml
      retry: 
        count: 2
        strategy: "OnFailure"        
      dependencies:
        - ${dataProduct.entity}-ingestion
`
  });

  // Source Aligned Observability - Monitor Configuration
  files.push({
    path: `${dataProduct.entity}/observability/monitor/config-source-workflow-failed-monitor.yaml`,
    content: `name: source-workflow-failed-monitor
version: v1alpha
type: monitor
tags:
  - dataos:type:resource
  - source-workflow-failed-monitor
description: Attention! The source-aligned workflow for ${dataProduct.entity} has experienced a failure. Please be rest assured, we are currently investigating the cause of the failure. Your patience is appreciated as we work to resolve this issue. Please refer to the logs for additional information.
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
    name: source-workflowfailed
    severity: high
    incident_type: source-workflowruntimefailure
`
  });

  // Source Aligned Observability - Quality Checks Failed Monitor
  files.push({
    path: `${dataProduct.entity}/observability/monitor/config-source-quality-checks-failed-monitor.yaml`,
    content: `name: source-quality-checks-failed-monitor
version: v1alpha
type: monitor
tags:
  - dataos:type:resource
  - dataos:layer:user
description: Alerts! Recent source data quality check for ${dataProduct.entity} has resulted in a failure due to ambiguities found in the data. It appears there are inconsistencies or inaccuracies that require your immediate attention.
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
        ql: 
          WITH cte AS (
            SELECT
              CASE
                WHEN check_outcome = 'fail' THEN 0
                ELSE NULL
              END AS result,
              timestamp
            FROM
              icebase.sys01.soda_quality_checks
            WHERE
              collection = '${dataProduct.entity}_source'
              AND dataset = '${dataProduct.entity}'
              AND from_iso8601_timestamp(timestamp) >= (CURRENT_TIMESTAMP - INTERVAL '30' MINUTE)
          )
          SELECT
            DISTINCT result
          FROM
            cte
          WHERE
            result IS NOT NULL
  
    rightExpression:
      queryCoefficient: 1
      queryConstant: 0
    operator: equals
  incident:
    name: source-soda-check-fail
    severity: high
    incident_type: source-soda-quality
`
  });

  // Source Aligned Observability - Pager Configuration
  files.push({
    path: `${dataProduct.entity}/observability/pager/config-source-workflow-failed-pager.yaml`,
    content: `name: source-workflow-failed-pager
version: v1alpha
type: pager
tags:
  - dataos:type:resource
  - source-workflow-failed-pager
description: This is for sending Alerts on Microsoft Teams for source-aligned workflow failures.
workspace: public
pager:
  conditions:
    - valueJqFilter: .properties.name
      operator: equals
      value: source-workflowfailed
    - valueJqFilter: .properties.incident_type
      operator: equals
      value: source-workflowruntimefailure
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
            "summary": "Source Workflow has Failed - ${dataProduct.entity}",
            "themeColor": "0076D7",
            "sections": [
              {
                "activityTitle": "Dear Team,",
                "activitySubtitle": "⚠️ Our system detected an issue with the source-aligned workflow for ${dataProduct.entity} and was unable to complete the process as expected.",
                "facts": [
                  {
                    "name": "   The following source workflow has failed:",
                    "value": "{{ index (splitn ":" 4 .ReportContext.ResourceId) "_2" }}"
                  },
                  {
                    "name": "   Failure Time:",
                    "value": "{{ .CreateTime }}"
                  },
                  {
                    "name": "   Severity:",
                    "value": "{{ .Properties.severity }}"
                  },
                  {
                    "name": "   Data Product:",
                    "value": "${dataProduct.entity}"
                  }
                ]
              },
              {
                "text": "Source Data Processing Issue detected !!! \n\n We understand the importance of timely and accurate data processing, and our team is actively working to resolve the issue and get the source pipeline back up and running as soon as possible."
              }
            ]
          }
`
  });

  return files;
}

function generateConsumerAlignedFiles(dataProduct: DataProduct): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Get entities array - use multiple entities if available, otherwise fall back to single entity
  const entities = dataProduct.entities && dataProduct.entities.length > 0 
    ? dataProduct.entities 
    : [dataProduct.entity];

  // Consumer Aligned Data Product configuration
  files.push({
    path: `${dataProduct.entity}/deploy/config-${dataProduct.entity}-dp.yaml`,
    content: `name: ${dataProduct.entity}-dp
version: v1beta
type: data
description: |
  ${dataProduct.entity} consumer-aligned data product delivers business-ready analytics and insights, enabling data-driven decision making and operational excellence.
tags:
  - DPUsecase.Business Intelligence
  - DPTier.Consumer Aligned
  - DPDomain.Business Analytics
purpose: |
  Enables business users to make informed decisions by providing clean, aggregated, and business-ready data for reporting, analytics, and operational dashboards.
v1beta:
  data:
    meta:
      title: ${dataProduct.entity} Consumer Analytics
      sourceCodeUrl: https://bitbucket.org/rubik_/solutions/src/canned-demo/customer-solution/consumer-analytics/
      trackerUrl: https://rubikai.atlassian.net/browse/DPRB-87
    collaborators:
      - name: business-analyst
        description: owner
      - name: data-scientist
        description: developer
    resource:
      refType: dataos
      ref: bundle:v1beta:${dataProduct.entity}-bundle
    inputs:
      - refType: dataos
        ref: dataset:lakehouse:sandbox:${dataProduct.entity}
    outputs:
      - refType: dataos
        ref: dataset:lakehouse:analytics:${dataProduct.entity}_consumer
`
  });

  // Consumer Bundle configuration
  files.push({
    path: `${dataProduct.entity}/deploy/config-${dataProduct.entity}-bundle.yaml`,
    content: `name: ${dataProduct.entity}-bundle
version: v1beta
type: bundle
tags:
  - Tier.Gold
description: The purpose of the bundle is to deploy the consumer-aligned resources of the ${dataProduct.entity} Data Product, making it available for business consumption and analytics.
layer: "user"
bundle:
  resources:
    - id: ${dataProduct.entity}-pipeline
      file: ${dataProduct.entity}/${dataProduct.entity}/build/semantic-model/${dataProduct.entity}/model/deployment.yaml
      workspace: public
`
  });

  // Data Product Scanner Configuration
  files.push({
    path: `${dataProduct.entity}/deploy/config-data-product-scanner.yaml`,
    content: `name: wf-${dataProduct.entity}-data-product-scanner
version: v1
type: workflow
description: |
  Scans and registers ${dataProduct.entity} consumer-aligned data products and semantic models into the data catalog.
workflow:
  dag:
    - name: ${dataProduct.entity}-data-product-scanner
      description: |
        Scans the semantic model for ${dataProduct.entity} and registers it into the data catalog.
      title: ${dataProduct.entity} Data Product Scanner
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
                  - ${dataProduct.entity}
`
  });

  // Activation Layer - Custom Application
  files.push({
    path: `${dataProduct.entity}/activation/custom-application/README.md`,
    content: `# Custom Application for ${dataProduct.entity}

This directory contains custom applications for consuming ${dataProduct.entity} data.

## Structure
- \`applications/\` - Custom application code
- \`config/\` - Application configuration files
- \`docs/\` - Application documentation

## Usage
Custom applications can be developed here to consume the ${dataProduct.entity} data product through various interfaces.
`
  });

  // Activation Layer - Data APIs
  files.push({
    path: `${dataProduct.entity}/activation/data-apis/README.md`,
    content: `# Data APIs for ${dataProduct.entity}

This directory contains API definitions for accessing ${dataProduct.entity} data.

## Structure
- \`openapi/\` - OpenAPI specifications
- \`graphql/\` - GraphQL schemas
- \`rest/\` - REST API definitions

## Usage
Data APIs provide programmatic access to ${dataProduct.entity} data through standardized interfaces.
`
  });

  // Activation Layer - Notebook
  files.push({
    path: `${dataProduct.entity}/activation/notebook/README.md`,
    content: `# Notebooks for ${dataProduct.entity}

This directory contains Jupyter notebooks for exploring and analyzing ${dataProduct.entity} data.

## Structure
- \`exploration/\` - Data exploration notebooks
- \`analysis/\` - Data analysis notebooks
- \`templates/\` - Notebook templates

## Usage
Notebooks provide interactive environments for data scientists and analysts to work with ${dataProduct.entity} data.
`
  });

  // Access Control Configuration
  files.push({
    path: `${dataProduct.entity}/build/access-control/${dataProduct.entity}-access-control.yaml`,
    content: `version: v1
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
      operator: pass_through

---

version: v1
name: filter-policy-broadcom
type: policy
layer: user
description: "data policy to filter process file publisher"
owner:
policy:
  data:
    type: filter
    priority: 75
    dataset_id: icebase.sensor_device.device_process_event_dataset
    selector:
      user:
        match: any
        tags:
          - "roles:id:selective-restricted-access"
    filters:
      - column: process_file_publisher
        operator: equals
        value: "Broadcom"
`
  });
  
  // SQL Views for each entity
  entities.forEach(entity => {
  files.push({
      path: `${dataProduct.entity}/build/semantic-model/${dataProduct.entity}/model/sqls/${entity}.sql`,
      content: `SELECT
  *
FROM
  lakehouse.sandbox.${entity}
`
    });
  });

  // Table Configurations for each entity
  entities.forEach(entity => {
  files.push({
      path: `${dataProduct.entity}/build/semantic-model/${dataProduct.entity}/model/tables/${entity}.yaml`,
      content: `tables:
  - name: ${entity}
    sql: {{ load_sql('${entity}') }}
    description: Comprehensive ${entity} data for business analytics, reporting, and operational insights
    data_source: icebase
    public: true

    joins:
      - name: ${entity}
        relationship: one_to_many
        sql: "{TABLE.${entity}_id}= {${entity}.${entity}_id}"

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
        description: "Total count of ${entity} records for business metrics and KPI calculations"
`
    });
  });

  // User Groups Configuration
  files.push({
    path: `${dataProduct.entity}/build/semantic-model/${dataProduct.entity}/model/user_groups.yml`,
    content: `user_groups:
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
    includes: "*"
`
  });

  // Deployment Configuration
  files.push({
    path: `${dataProduct.entity}/build/semantic-model/${dataProduct.entity}/model/deployment.yaml`,
    content: `---
version: v1alpha
name: "${dataProduct.entity}" # TODO: change this to the correct name
layer: user
type: lens
tags:
  - Tier.Gold
description: Deployment of ${dataProduct.entity} Lens2 for advanced monitoring and optimized management capabilities.
lens:
  compute: runnable-default
  secrets:
    - name: gitsecret # Secret name from instance-secret.yaml
      allKeys: true
  source:
    type: minerva # case 1: minerva
    name: minervac
    catalog: icebase
  # source: # case 2: flash
  #   type: flash
  #   name: exec-360-flash-service-v1
  # source: # case 3: depot
  #   type: depot 
  #   name: snowflake
  repo:
    url: https://bitbucket.org/rubik_/solutions
    lensBaseDir: solutions/ # TODO: change this to the correct path
    syncFlags:  
      - --ref=canned-demo   # TODO: change this to the correct branch
  api:   # optional
    replicas: 1 # optional
    logLevel: info  # optional
    envs:
      LENS2_SCHEDULED_REFRESH_TIMEZONES: "UTC,America/Vancouver,America/Toronto"
    resources: # optional
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 2000m
        memory: 2048Mi
  worker: # optional
    replicas: 1 # optional
    logLevel: info  # optional
    envs:
      LENS2_SCHEDULED_REFRESH_TIMEZONES: "UTC,America/Vancouver,America/Toronto"
    resources: # optional
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1048Mi
  router: # optional
    logLevel: info  # optional
    envs:
      LENS2_SCHEDULED_REFRESH_TIMEZONES: "UTC,America/Vancouver,America/Toronto"
    resources: # optional
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1048Mi
  metric:
    logLevel: info
`
  });

  // Docker Compose for Local Development
  files.push({
    path: `${dataProduct.entity}/build/semantic-model/${dataProduct.entity}/model/docker-compose.yml`,
    content: `version: "2.2"

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
  # LENS2_REFRESH_WORKER: true
  LENS2_SCHEMA_PATH: model
  LENS2_PG_SQL_PORT: 5432
  CACHE_DATA_DIR: "/var/work/.store"
  NODE_ENV: production

services:
  api:
    restart: always
    # image: rubiklabs/lens2:0.35.18-21
    image: rubiklabs/lens2:0.35.18-61-dev
    ports:
      - 4000:4000
      - 25432:5432
      - 13306:13306
    environment:
      <<: *lens2-environment
    volumes:
      - ./model:/etc/dataos/work/model
`
  });

  // Access Control Configuration
  files.push({
    path: `${dataProduct.entity}/build/access-control/${dataProduct.entity}-access-control.yaml`,
    content: `version: v1
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
      operator: pass_through

---
version: v1
name: filter-policy-broadcom
type: policy
layer: user
description: "data policy to filter process file publisher"
owner:
policy:
  data:
    type: filter
    priority: 75
    dataset_id: icebase.sensor_device.device_process_event_dataset
    selector:
      user:
        match: any
        tags:
          - "roles:id:selective-restricted-access"
    filters:
      - column: process_file_publisher
        operator: equals
        value: "Broadcom"
`
  });

  // Data Product Scanner Configuration
  files.push({
    path: `${dataProduct.entity}/deploy/config-data-product-scanner.yaml`,
    content: `name: wf-${dataProduct.entity}-data-product-scanner
version: v1
type: workflow
description: |
  Scans and registers ${dataProduct.entity} consumer-aligned data products and semantic models into the data catalog.
workflow:
  dag:
    - name: ${dataProduct.entity}-data-product-scanner
      description: |
        Scans the semantic model for ${dataProduct.entity} and registers it into the data catalog.
      title: ${dataProduct.entity} Data Product Scanner
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
                  - ${dataProduct.entity}
`
  });

  // Consumer Aligned Monitor Configuration
  files.push({
    path: `${dataProduct.entity}/observability/monitor/config-consumer-workflow-failed-monitor.yaml`,
    content: `name: consumer-workflow-failed-monitor
version: v1alpha
type: monitor
tags:
  - dataos:type:resource
  - consumer-workflow-failed-monitor
description: Attention! The consumer-aligned workflow for ${dataProduct.entity} has experienced a failure. Please be rest assured, we are currently investigating the cause of the failure. Your patience is appreciated as we work to resolve this issue. Please refer to the logs for additional information.
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
    name: consumer-workflowfailed
    severity: high
    incident_type: consumer-workflowruntimefailure
`
  });

  // Consumer Aligned Quality Checks Failed Monitor Configuration
  files.push({
    path: `${dataProduct.entity}/observability/monitor/config-consumer-quality-checks-failed-monitor.yaml`,
    content: `name: consumer-quality-checks-failed-monitor
version: v1alpha
type: monitor
tags:
  - dataos:type:resource
  - dataos:layer:user
description: Alerts! Recent consumer-aligned quality check for ${dataProduct.entity} has resulted in a failure due to ambiguities found in the data. It appears there are inconsistencies or inaccuracies that require your immediate attention.
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
        ql: 
          WITH cte AS (
            SELECT 
              CASE
                WHEN check_outcome = 'fail' THEN 0
                ELSE NULL
              END AS result,
              timestamp
            FROM
              icebase.sys01.soda_quality_checks
            WHERE
              collection = '${dataProduct.entity}_consumer'
              AND dataset = '${dataProduct.entity}_enriched'
              AND from_iso8601_timestamp(timestamp) >= (CURRENT_TIMESTAMP - INTERVAL '30' MINUTE)
          )
            SELECT 
            DISTINCT result
          FROM
            cte
          WHERE
            result IS NOT NULL
  
    rightExpression:
      queryCoefficient: 1
      queryConstant: 0
    operator: equals
  incident:
    name: consumer-soda-check-fail
    severity: high
    incident_type: consumer-soda-quality
`
  });

  // Consumer Aligned Lens Alert Monitor Configuration
  files.push({
    path: `${dataProduct.entity}/observability/monitor/config-consumer-lens-alert-monitor.yaml`,
    content: `name: ${dataProduct.entity}-consumer-business-metric-alert-monitor
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
        ql: 
          SELECT 
            MEASURE(${dataProduct.entity}_consumer.total_${dataProduct.entity}) as total_${dataProduct.entity}
            FROM
              ${dataProduct.entity}_consumer
            LIMIT 
              10
            OFFSET 
              0
        comparisonColumn: {
            name: total_${dataProduct.entity}, # The column that you consider as the comparision column, the value of this columns will be matched against the value of the right hand expression.
            dataType: int64 # The data type
        }
    rightExpression:
      queryCoefficient: 0
      queryConstant: 1000
      query:
    operator: greater_than_equals
  incident:
    type: business-metric
    name: ${dataProduct.entity}_consumer_metric
    category: equation
    severity: info
`
  });

  // Consumer Aligned Workflow Failed Pager Configuration
  files.push({
    path: `${dataProduct.entity}/observability/pager/config-consumer-workflow-failed-pager.yaml`,
    content: `name: consumer-workflow-failed-pager
version: v1alpha
type: pager
tags:
  - dataos:type:resource
  - consumer-workflow-failed-pager
description: This is for sending Alerts on Microsoft Teams for consumer-aligned workflow failures.
workspace: public
pager:
  conditions:
    - valueJqFilter: .properties.name
      operator: equals
      value: consumer-workflowfailed
    - valueJqFilter: .properties.incident_type
      operator: equals
      value: consumer-workflowruntimefailure
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
            "summary": "Consumer Workflow has Failed - ${dataProduct.entity}",
            "themeColor": "0076D7",
            "sections": [
              {
                "activityTitle": "Dear Team,",
                "activitySubtitle": "⚠️ Our system detected an issue with the consumer-aligned workflow for ${dataProduct.entity} and was unable to complete the process as expected.",
                "facts": [
                  {
                    "name": "   The following consumer workflow has failed:",
                    "value": "{{ index (splitn ":" 4 .ReportContext.ResourceId) "_2" }}"
                  },
                  {
                    "name": "   Failure Time:",
                    "value": "{{ .CreateTime }}"
                  },
                  {
                    "name": "   Severity:",
                    "value": "{{ .Properties.severity }}"
                  },
                  {
                    "name": "   Data Product:",
                    "value": "${dataProduct.entity}"
                  }
                ]
              },
              {
                "text": "Consumer Analytics Processing Issue detected !!! \n\n We understand the importance of timely and accurate business analytics, and our team is actively working to resolve the issue and get the consumer pipeline back up and running as soon as possible."
              }
            ]
          }
`
  });

  // Consumer Aligned Quality Check Failed Pager Configuration
  files.push({
    path: `${dataProduct.entity}/observability/pager/config-consumer-quality-check-failed-pager.yaml`,
    content: `name: consumer-quality-failed-pager
version: v1alpha
type: pager
tags:
  - dataos:type:resource
description: This is for sending Alerts on Microsoft Teams for consumer-aligned quality check failures
workspace: public
pager:
  conditions:
    - valueJqFilter: .properties.name
      operator: equals
      value: consumer-soda-check-fail
    - valueJqFilter: .properties.incident_type
      operator: equals
      value: consumer-soda-quality
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
              "summary": "Consumer Quality Check Failure - ${dataProduct.entity}",
              "themeColor": "0076D7",
              "sections": [
                {
                  "activityTitle": "Dear Team,",
                  "activitySubtitle": "⚠️ Our system detected an issue with the consumer-aligned data quality for ${dataProduct.entity}",
                  "activityImage": "https://adaptivecards.io/content/cats/3.png",
                  "facts": [
                    {
                      "name": "   Record Time:",
                      "value": "{{ .CreateTime }}"
                    },
                    {
                      "name": "   Severity:",
                      "value": "{{ .Properties.severity }}"
                    },
                    {
                      "name": "   Data Product:",
                      "value": "${dataProduct.entity}"
                    }
                  ]
                },
                {
                   "title": "Message",
                  "text": "Consumer Quality Check Failure detected !!!\n\n Recent consumer-aligned quality check for ${dataProduct.entity} has resulted in a failure due to ambiguities found in the business-ready data. It appears there are inconsistencies or inaccuracies that require your immediate attention."
                },
                {
                  "text": "\n\n"
                }
              ]
            }
`
  });

  // Consumer Aligned Lens Alert Pager Configuration
  files.push({
    path: `${dataProduct.entity}/observability/pager/config-consumer-lens-alert-pager.yaml`,
    content: `name: ${dataProduct.entity}-consumer-business-metric-alert-pager
version: v1alpha
type: pager
tags:
  - dataos:type:resource
description: This is for sending Alerts on Microsoft Teams for consumer-aligned business metric alerts.
workspace: public
pager:
  conditions:
    - valueJqFilter: .properties.name
      operator: equals
      value: ${dataProduct.entity}_consumer_metric
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
          "summary": "📊 Consumer Business Alert: {{ properties.name | replace: '_', ' ' | capitalize }}",
          "themeColor": "{% if properties.severity == 'critical' %}FF0000{% elsif properties.severity == 'warning' %}FFA500{% else %}0076D7{% endif %}",
          "sections": [
            {
              "activityTitle": "🚨 Consumer Business Metric Alert",
              "activitySubtitle": "{{ properties.category | capitalize }} threshold exceeded for ${dataProduct.entity} - Action Required",
              "facts": [
                {
                  "name": "Data Product:",
                  "value": "${dataProduct.entity}"
                },
                {
                  "name": "Metric:",
                  "value": "{{ properties.name | replace: '_', ' ' | capitalize }}"
                },
                {
                  "name": "Current Value:",
                  "value": "{{ equationContext.queryExpressions[0].leftExpressionValue }}"
                },
                {
                  "name": "Threshold:",
                  "value": "{{ equationContext.queryExpressions[0].rightExpressionValue }}"
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
              "text": "**Business Impact:**\nThis alert indicates that the consumer-aligned business metric for ${dataProduct.entity} has exceeded the expected threshold. The current value requires immediate attention for business analytics and reporting."
            },
            {
              "text": "**Recommended Actions:**\n• Review recent business activities that may have caused this change\n• Check related operational metrics for correlation\n• Consider if this represents a trend or isolated event\n• Contact the data team if you need additional analysis"
            },
            {
              "text": "For detailed analysis or to adjust alert thresholds, please contact the Data Operations team."
            }
          ]
        }
`
  });

  return files;
} 