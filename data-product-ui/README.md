# Data Product Generator UI

A modern web application for creating Source Aligned Data Products (SODP) with automated file structure generation.

## Features

### Data Product Generator
- **Interactive Form**: Create data products with name, entity, description, version, and author
- **Real-time Preview**: See the generated file structure as you create data products
- **File Tree Visualization**: Expandable/collapsible file tree showing the complete SODP structure
- **YAML Generation**: Generate actual YAML configuration files for each component
- **Download Options**: Download JSON structure or ZIP file with all YAML files
- **Validation**: Form validation to prevent duplicate entities and ensure required fields
- **Modern UI**: Clean, responsive design built with Next.js and Tailwind CSS

### Lens Generator (NEW! 🎨 Enhanced with Advanced SQL Parser)
- **🚀 SQL Parser (Smart Import)**: Paste complex SQL queries and automatically generate complete table structures
  - **Multi-table JOIN support**: Extracts only SELECT columns, ignores JOIN tables
  - **CAST operations**: Both `CAST(col AS type)` and PostgreSQL `col::type` syntax
  - **Data cleaning functions**: TRIM, UPPER, LOWER, COALESCE, NULLIF, CONCAT, etc.
  - **Nested function handling**: Smart comma splitting respects parentheses depth
  - **Column aliases**: Explicit `AS` and implicit alias support
  - **Table prefix removal**: Cleans `table.column` to just `column`
  - **Smart type inference**: From CAST types, column names, and SQL expressions
  - **Auto-identifies primary keys**: uuid, id, *_id patterns
  - **Generates descriptions**: Human-readable field descriptions
  - **Default measures**: Creates count measure automatically
- **Visual Semantic Model Builder**: Create complete Lens configurations through an intuitive, modern UI
- **Table Management**: Add, edit, and delete tables with rich metadata
- **Tabbed Interface**: Organized tabs for Dimensions, Measures, and Joins
- **Dimension Configuration**: Define columns with types, descriptions, SQL expressions, and primary keys
- **Measure Builder**: Create aggregations (count, sum, avg, min, max, count_distinct) with custom SQL
- **Join Builder with Smart Dropdowns**: Visually configure relationships with intelligent column selection
  - **Table dropdown**: Select from all available tables in project
  - **Column dropdowns**: Select columns from both current and target tables
  - **Auto-generated SQL**: Join condition created automatically from selections
  - **Manual override**: Option to write custom SQL conditions
  - **Relationship types**: 1:1, 1:N, N:1, N:M
  - **Real-time preview**: See generated join condition as you select
- **Schema Configuration**: Set data sources and schemas per table
- **Complete Package Generation**: Generates SQL files + YAML files in proper Lens format
- **ZIP Download**: Export entire Lens project with proper directory structure
- **Professional UI/UX**: Gradient design, color-coded sections, and intuitive workflow

## Generated File Structure

For each source-aligned data product, the following structure is generated:

```
<entity>/
├── build/
│   ├── data-processing/
│   │   └── config-<entity>-flare.yaml
│   └── quality/
│       └── config-<entity>-quality.yaml
└── deploy/
    ├── config-<entity>-scanner.yaml
    ├── config-<entity>-bundle.yaml
    ├── config-<entity>-dp.yaml
    └── pipeline.yaml
```

For each consumer-aligned data product (consumption layer):

```
<consumption-layer>/
├── activation/
│   ├── custom-application/
│   ├── data-apis/
│   └── notebook/
├── build/
│   ├── access-control/
│   └── semantic-model/<name>/
│       ├── deployment.yaml          # At project root
│       └── model/
│           ├── sqls/
│           ├── tables/
│           ├── user_groups.yml      # Inside model folder
│           ├── config.yaml
│           └── docker-compose.yml
└── deploy/
    ├── config-data-product-scanner.yaml
    ├── config-<name>-bundle.yaml
    └── config-<name>-dp.yaml
```

## Configuration Files

### 1. Flare Configuration (`config-<entity>-flare.yaml`)
- Data processing pipeline configuration
- Source connection settings
- SQL transformations
- Output configuration

### 2. Quality Configuration (`config-<entity>-quality.yaml`)
- Data quality checks (completeness, uniqueness, validity)
- Alerting configuration
- Reporting settings

### 3. Scanner Configuration (`config-<entity>-scanner.yaml`)
- Data scanning rules
- Incremental and full scan settings
- Monitoring and alerting

### 4. Bundle Configuration (`config-<entity>-bundle.yaml`)
- Component bundling
- Dependencies management
- Build and distribution settings

### 5. Data Product Configuration (`config-<entity>-dp.yaml`)
- Metadata and schema definition
- Access control settings
- Quality requirements and lineage

### 6. Pipeline Configuration (`pipeline.yaml`)
- End-to-end pipeline definition
- Stage dependencies
- Error handling and monitoring

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd data-product-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Configure Project**:
   - Enter a unique project name
   - Add multiple data product entities (e.g., "customer", "product", "order")
   - Specify a consumption layer name (e.g., "customer-360")
   - Optionally add custom semantic entities

2. **Preview Structure**:
   - Click "Preview" to see the generated file structure
   - The right panel shows a hierarchical view of all files
   - See both source-aligned data products and consumer-aligned consumption layer

3. **Generate Project**:
   - Click "Generate Project" to create all YAML configuration files
   - View generation results and success/error messages
   - All files are generated according to the SODP structure

## Example Usage

### Creating a Multi-Entity Data Product Project

1. Configure the project:
   - **Project Name**: "customr"
   - **Data Product Entities**: "customer", "product"
   - **Consumption Layer**: "customer-360"
   - **Custom Semantic Entities**: (optional, defaults to data product entities)

2. Click "Preview" to see the structure

3. The file structure will be generated:
   ```
   customr/
   ├── Data Products:
   │   ├── customer/
   │   │   ├── build/
   │   │   │   ├── data-processing/config-customer-flare.yaml
   │   │   │   └── quality/config-customer-quality.yaml
   │   │   └── deploy/
   │   │       ├── config-customer-scanner.yaml
   │   │       ├── config-customer-bundle.yaml
   │   │       ├── config-customer-dp.yaml
   │   │       └── pipeline.yaml
   │   └── product/
   │       ├── build/
   │       └── deploy/
   └── Consumption Layer: customer-360/
       ├── activation/
       ├── build/
       │   ├── access-control/
       │   └── semantic-model/customer-360/model/
       │       ├── sqls/ (2 files)
       │       ├── tables/ (2 files)
       │       └── ...
       └── deploy/
   ```

4. Click "Generate Project" to create all configuration files

### Using the Lens Generator

1. **Access the Lens Generator**:
   - Click the "🔍 Lens Generator" button in the top-right corner
   - Or navigate to `/data-product-generator/lens-generator`

2. **Configure Project**:
   - **Project Name**: Your Lens project name (e.g., "customer-360")
   - **Data Source**: DataOS source name (e.g., "icebase")

#### Method 1: Quick Add from SQL (🚀 Recommended)

3. **Use SQL Parser for Fast Setup**:
   - Click "Show SQL Parser" in the green section
   - Paste your SQL SELECT query:
   
   ```sql
   SELECT
       uuid,
       d_id as device_id,
       battery_condition,
       condition_reason,
       battery_cycle_count,
       battery_design_capacity,
       battery_firstused_date,
       battery_fullcharge_capacity,
       battery_manufacture_date,
       battery_manufacture_name,
       battery_remaining_capacity,
       battery_serial_number,
       "timestamp",
       battery_warranty_date,
       battery_warranty_status
   FROM
       "icebase"."telemetry".battery
   ```
   
   - Click "✨ Parse SQL & Generate Table"
   - The parser will automatically:
     - Extract table name: `battery`
     - Extract schema: `telemetry`
     - Extract data source: `icebase`
     - Create 15 dimensions with proper types
     - Identify `uuid` as primary key
     - Generate descriptions for each field
     - Create a default `total_battery` measure
   
   **That's it!** Your table is ready with all dimensions and measures configured.

#### Method 2: Manual Configuration

If you prefer to configure tables manually:

3. **Add Tables**:
   - Click "+ Add" to create a new table
   - Enter table name (e.g., "customer", "transaction")
   - Set table description and schema
   - Click on a table to configure its details

4. **Configure Dimensions** (Columns):
   - Switch to the "Dimensions" tab
   - Click "+ Add Dimension"
   - Fill in:
     - **Name**: Column name (e.g., "customer_id")
     - **Type**: string, number, time, or boolean
     - **Description**: Business description
     - **SQL**: Column expression (defaults to name)
     - **PK**: Check if primary key

5. **Create Measures** (Metrics):
   - Switch to the "Measures" tab
   - Click "+ Add Measure"
   - Fill in:
     - **Name**: Metric name (e.g., "total_customers")
     - **Type**: count, count_distinct, sum, avg, min, or max
     - **Description**: What this metric represents
     - **SQL**: Column to aggregate

6. **Define Joins** (Relationships):
   - Switch to the "Joins" tab
   - Click "+ Add Join"
   - Fill in:
     - **Target Table**: Name of table to join with
     - **Relationship**: one_to_one, one_to_many, many_to_one, or many_to_many
     - **SQL**: Join condition using {TABLE.column} = {target.column} syntax

#### Download Your Lens Package

7. **Download Lens Package**:
   - Click "Download Lens Package"
   - Receives a ZIP file with complete Lens structure

**Generated Structure:**
```
customer-360-lens.zip
└── customer-360/
    ├── deployment.yaml          # DataOS deployment configuration (at root)
    └── model/
        ├── sqls/
        │   ├── customer.sql
        │   └── transaction.sql
        ├── tables/
        │   ├── customer.yaml
        │   └── transaction.yaml
        └── user_groups.yml       # API access control (in model)
```

**Example Generated Files:**

**sqls/customer.sql:**
```sql
SELECT
  *
FROM
  lakehouse.sandbox.customer
```

**tables/customer.yaml:**
```yaml
tables:
  - name: customer
    sql: {{ load_sql('customer') }}
    description: Comprehensive customer data for analytics
    data_source: icebase
    public: true

    dimensions:
      - name: customer_id
        description: "Primary identifier for customer"
        type: string
        sql: customer_id
        primary_key: true

      - name: customer_name
        description: "Name of the customer"
        type: string
        sql: customer_name

      - name: created_at
        description: "Creation timestamp"
        type: time
        sql: created_at

    measures:
      - name: total_customer
        sql: customer_id
        type: count
        description: "Total count of customer records"

    joins:
      - name: transaction
        relationship: one_to_many
        sql: "{TABLE.customer_id} = {transaction.customer_id}"
```

**user_groups.yml:**
```yaml
user_groups:
  - name: default
    api_scopes:
      - meta
      - data
      - graphql
      - jobs
      - source
    includes: "*"
```

**deployment.yaml:**
```yaml
version: v1alpha
name: customer-360
type: lens
tags:
  - lens
description: Lens deployment for customer-360
lens:
  compute: runnable-default
  secrets:
    - name: bitbucket-r
      allKeys: true
  source:
    type: minerva
    name: system
    catalog: icebase
  repo:
    url: https://bitbucket.org/tmdc/lens2
    lensBaseDir: customer-360/model
    syncFlags:
      - --ref=lens2-dev
  api:
    replicas: 1
    logLevel: info
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
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 2000m
        memory: 2048Mi
  router:
    logLevel: info
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 2000m
        memory: 2048Mi
```

## Technology Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **File Generation**: Custom YAML generator
- **File Compression**: JSZip for ZIP file creation

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main application page with interactive generator
│   └── globals.css         # Global styles
├── types/
│   └── dataProduct.ts      # TypeScript type definitions
└── utils/
    └── yamlGenerator.ts    # YAML file generation utility
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
