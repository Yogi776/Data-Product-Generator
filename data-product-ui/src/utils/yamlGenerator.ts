import { DataProduct } from '@/types/dataProduct';

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateYamlFiles(dataProduct: DataProduct): GeneratedFile[] {
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
                        ${dataProduct.entity}_input
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

  // Existing Quality configuration
  files.push({
    path: `${dataProduct.entity}/build/quality/config-${dataProduct.entity}-quality.yaml`,
    content: `# Quality Configuration for ${dataProduct.name}
# Generated on ${new Date().toISOString()}

version: "1.0"
entity: "${dataProduct.entity}"
description: "Data quality configuration"
author: "Data Product Generator"

# Quality checks configuration
quality_checks:
  # Completeness checks
  completeness:
    - column: "customer_id"
      check: "not_null"
      threshold: 0.99
      
    - column: "order_date"
      check: "not_null"
      threshold: 0.99
      
  # Uniqueness checks
  uniqueness:
    - column: "order_id"
      check: "unique"
      threshold: 1.0
      
  # Validity checks
  validity:
    - column: "amount"
      check: "greater_than"
      value: 0
      threshold: 0.99
      
    - column: "order_date"
      check: "date_format"
      format: "YYYY-MM-DD"
      threshold: 0.99
      
  # Consistency checks
  consistency:
    - name: "amount_consistency"
      check: "custom_sql"
      query: |
        SELECT COUNT(*) as invalid_records
        FROM ${dataProduct.entity}_data
        WHERE amount < 0 OR amount > 1000000
      threshold: 0
      
  # Freshness checks
  freshness:
    - column: "updated_at"
      check: "max_age_hours"
      value: 24
      threshold: 1.0

# Alerting configuration
alerts:
  email:
    recipients: ["data-team@company.com"]
    subject: "Data Quality Alert - ${dataProduct.name}"
    
  slack:
    channel: "#data-alerts"
    message_template: "Data quality check failed for ${dataProduct.entity}"

# Reporting configuration
reporting:
  schedule: "0 6 * * *"  # Daily at 6 AM
  format: "html"
  recipients: ["data-team@company.com"]
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

  return files;
} 