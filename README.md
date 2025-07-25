# Data Product Generator

A command-line tool to generate standardized folder structures for data products and consumption layers with support for flexible semantic modeling and config-driven generation.

## Overview

The Data Product Generator automates the creation of consistent project structures for data engineering and analytics projects. It supports both simple data product creation and advanced scenarios where consumption layers need different semantic entities than the underlying data products. The tool now features config-driven generation, allowing you to define entity columns, types, primary keys, and joins in a central configuration file.

### Key Features

- **Global CLI Access**: Install once, use from anywhere in your terminal
- **Standardized Structure**: Creates consistent folder hierarchies for data products and consumption layers
- **Template-Driven**: Uses YAML templates for configuration files with proper variable substitution
- **Config-Driven Generation**: Define entity columns, types, primary keys, and joins in `config.yaml`
- **Dynamic Source/Schema Mapping**: Automatically maps `source.schema.entity` format from config to SQL and YAML
- **Professional SQL Formatting**: Generates clean, well-formatted SQL with 2-space indentation
- **SQL Templates**: Automatic SQL query generation with configurable columns
- **Table YAML Templates**: Dynamic table definitions with dimensions, measures, and joins
- **Selective Join Generation**: Only adds joins when explicitly defined in config
- **Flexible Semantic Modeling**: Supports independent semantic entities in consumption layers
- **Cross-Platform**: Works on macOS, Linux, and Windows (via WSL)
- **Makefile Support**: Simple commands for common operations
- **Quality Config Naming**: Entity-specific quality configuration files
- **Backward Compatible**: New features don't break existing workflows

## Quick Start

### Using Makefile (Recommended)

The easiest way to get started is using the provided Makefile:

```bash
# Install the tool
make install

# Generate a complete customer-360 project (SODP + CODP)
make test

# Generate only Source of Data Product (SODP)
make test-sodp

# Generate only Consumption of Data Product (CODP)
make test-codp
```

### Using Command Line

```bash
# Generate both SODP and CODP with same entities
dp-generator -p customer-360 -sodp customer,product,transaction -codp cust-360

# Generate SODP and CODP with different semantic entities
dp-generator -p customer-360 -sodp customer,product,transaction -codp cust-360 -e customer,product,transaction,city

# Generate only SODP (Source of Data Product)
dp-generator -p customer-360 -sodp customer,product,transaction

# Generate only CODP (Consumption of Data Product) with custom config
dp-generator -p customer-360 -codp analytics -e customer,product,transaction -path custom-config.yaml

# Generate only CODP (Consumption of Data Product) with default config
dp-generator -p customer-360 -codp analytics -e customer,product,transaction
```

## Installation

### Local Installation (No Git Required)

1. **Download** the latest release ZIP or TAR file from your distribution source (email, portal, or shared drive).
2. **Extract** the archive to a folder of your choice, e.g. `~/data-product-generator-cli`.
3. **Open a terminal and change directory:**
   ```bash
   cd ~/data-product-generator-cli
   ```
4. **Install the tool:**
   ```bash
   make install
   # or
   chmod +x install.sh
   ./install.sh
   ```
5. **Restart your terminal** or run:
   ```bash
   source ~/.zshrc   # or source ~/.bashrc if you use bash
   ```
6. **Verify installation:**
   ```bash
   dp-generator --help
   ```
7. **You can now use `dp-generator` from ANY directory!**
   ```bash
   cd ~/Documents
   dp-generator -p customer-360 -sodp customer,product,transaction -codp cust-360

   cd ~/Desktop
   dp-generator -p my-project -codp analytics -e user,order

   cd /tmp
   dp-generator -p test-project -codp analytics -e customer
   ```
8. **Check the output:**
   - `customer-360/customer/build/quality/config-customer-quality.yaml`
   - `customer-360/product/build/quality/config-product-quality.yaml`
   - `customer-360/transaction/build/quality/config-transaction-quality.yaml`

### Installation Details

After installation, the tool creates the following structure:
- **Executable**: `~/bin/dp-generator` - The main CLI tool
- **Supporting files**: `~/bin/dp-generator-files/` - All templates and reference files
- **Templates**: `~/bin/dp-generator-files/reference/` - YAML and SQL templates

The tool is designed to work from **any directory** in your terminal, making it convenient for project generation regardless of your current working directory.

### Installation (With Git)

For users who prefer git:

```bash
git clone https://github.com/Yogi776/dataos-mcp-development.git
cd data-product-generator-cli
make install
```

The installer will:
- Create the bin directory in your home folder (if it doesn't exist)
- Copy the script to ~/bin/dp-generator
- Copy all supporting files/templates to ~/bin/dp-generator-files/
- Make it executable
- Add ~/bin to your PATH in .bashrc and .zshrc (if not already present)
- Verify the installation

## Usage

### Makefile Commands

The Makefile provides convenient shortcuts for common operations:

```bash
# Show all available commands
make help

# Install the tool
make install

# Generate customer-360 project (deletes existing and recreates)
make test

# Generate custom project
make custom PROJECT=my-project ENTITIES=user,order CONSUMPTION=analytics SEMANTIC=user,order,region

# Clean up generated projects
make clean

# Test the generator
make test
```

### Command Line Usage

After installation, you can use the tool from anywhere in your terminal:

```bash
dp-generator -p <project_name> -e <entity1,entity2,...> -c <consumption_layer> [-s <semantic_entity1,semantic_entity2,...>] [-path <config_file_path>]
```

### Parameters

- `-p`: Project name (required) - The name of your data product project
- `-sodp`: Comma-separated list of entities (optional) - Source of Data Product entities that will have build/deploy configurations
- `-codp`: Consumption layer name (optional) - Name of the Consumption of Data Product layer directory (single name, not comma-separated)
- `-e`: Comma-separated list of semantic entities (optional) - Entities for semantic modeling in consumption layer (defaults to entities from `-sodp` if available)
- `-path`: Path to custom config.yaml file (optional) - Use a custom configuration file instead of generating a default one

**Important Notes**:
- At least one of `-sodp` or `-codp` must be specified
- `-codp` takes a single layer name (e.g., 'analytics', 'cust-360'), not comma-separated entities
- Use `-e` to specify semantic entities for the consumption layer
- Use `-path` to specify a custom `config.yaml` file for config-driven generation
- **Common Mistake**: `-codp customer,product` (incorrect) should be `-codp analytics -e customer,product` (correct)

### Basic Examples

1. **Complete Customer Analytics Project**:
```bash
dp-generator -p customer-360 -sodp customer,product,transaction -codp c-360
```
   This creates:
   - Source of Data Products: `customer/`, `product/`, `transaction/` (with build/deploy configs)
   - Consumption of Data Product layer: `c-360/` with semantic models for customer, product, transaction

2. **Sales Analytics Project**:
```bash
dp-generator -p sales-360 -sodp sales,orders,inventory -codp sales-analytics
```

3. **HR Analytics Project**:
```bash
dp-generator -p hr-360 -sodp employee,department,payroll -codp hr-analytics
```

### Advanced Examples with Config-Driven Generation

4. **Customer Analytics with Custom Config**:
   ```bash
   dp-generator -p customer-360 -codp analytics -e customer,product,transaction -path custom-config.yaml
   ```
   This creates a consumption layer with SQL queries and table definitions based on your custom `config.yaml`.

5. **Financial Analytics with Geographic Dimensions**:
   ```bash
   dp-generator -p financial-360 -sodp transaction,account,balance -codp financial-analytics -e transaction,account,balance,country,currency -path financial-config.yaml
   ```

6. **E-commerce Analytics with Marketing Dimensions**:
   ```bash
   dp-generator -p ecommerce-360 -sodp order,product,customer -codp ecommerce-analytics -e order,product,customer,campaign,channel,segment -path ecommerce-config.yaml
   ```

### Flexible Generation Examples

7. **Generate Only Source of Data Products**:
   ```bash
   dp-generator -p customer-360 -sodp customer,product,transaction
   ```
   This creates only the data product structure without consumption layer.

8. **Generate Only Consumption Layer with Default Config**:
   ```bash
   dp-generator -p customer-360 -codp c-360 -e customer,product,transaction
   ```
   This creates a consumption layer with a default `config.yaml` that you can customize.

9. **Generate Only Consumption Layer with Custom Config**:
   ```bash
   dp-generator -p customer-360 -codp c-360 -e customer,product,transaction -path my-config.yaml
   ```
   This creates a consumption layer using your custom configuration file.

## Configuration-Driven Generation

The dp-generator now supports config-driven generation through a `config.yaml` file. This allows you to define:

- **Entity columns and types**
- **Primary keys**
- **Join relationships**
- **SQL query structure**

### Config File Structure

```yaml
logical_model: analytics
source: icebase
schema: retail

# Entity definitions with columns and types
entities:
  customer:
    dimensions:
      - name: customer_id
        type: number
        primary_key: true
      - name: customer_name
        type: string
      - name: customer_email
        type: string
      - name: customer_phone
        type: string

  product:
    dimensions:
      - name: product_id
        type: number
        primary_key: true
      - name: product_name
        type: string
      - name: product_price
        type: number
      - name: product_category
        type: string

  transaction:
    dimensions:
      - name: transaction_id
        type: number
        primary_key: true
      - name: customer_id
        type: number
      - name: product_id
        type: number
      - name: transaction_amount
        type: number

    joins: # Joins defined directly under the entity
      - name: customer
        relationship: many_to_one
        sql: "{TABLE.customer_id} = {customer.customer_id}"
      - name: product
        relationship: many_to_one
        sql: "{TABLE.product_id} = {product.product_id}"
```

### Config File Options

**Default Config Generation**: If no `-path` is specified, the tool generates a default `config.yaml` with commented examples:

```yaml
# Data Product Configuration
# Generated automatically by dp-generator
# Customize this file to define your entity columns and types

logical_model: analytics
source: icebase
schema: retail
entities:
  customer:
    dimensions:
      # Add your columns here. Example:
      # - name: customer_id
      #   type: number
      #   primary_key: true
      # - name: customer_name
      #   type: string
      # - name: created_at
      #   type: timestamp

  product:
    dimensions:
      # Add your columns here. Example:
      # - name: product_id
      #   type: number
      #   primary_key: true
      # - name: product_name
      #   type: string
      # - name: created_at
      #   type: timestamp

  transaction:
    dimensions:
      # Add your columns here. Example:
      # - name: transaction_id
      #   type: number
      #   primary_key: true
      # - name: transaction_name
      #   type: string
      # - name: created_at
      #   type: timestamp

# Join relationships between entities
joins:
  # Example join definitions:
  # transaction:
  #   - name: customer
  #     relationship: many_to_one
  #     sql: "{TABLE.customer_id} = {customer.customer_id}"
  #   - name: product
  #     relationship: many_to_one
  #     sql: "{TABLE.product_id} = {product.product_id}"
```

**Custom Config**: Use the `-path` option to specify your own configuration file:

```bash
dp-generator -p my-project -codp analytics -e customer,product,transaction -path my-custom-config.yaml
```

### Generated Output

Based on your `config.yaml`, the tool generates:

**SQL Files** (e.g., `customer.sql`):
```sql
SELECT
  customer_id,
  customer_name,
  customer_email,
  customer_phone
FROM
  icebase.retail.customer
```

**Table YAML Files** (e.g., `customer.yaml`):
```yaml
tables:
  - name: customer
    sql: {{ load_sql('customer') }}
    description: Comprehensive customer data for business analytics, reporting, and operational insights
    data_source: icebase
    public: true

    dimensions:
      - name: customer_id
        description: "customer_id field from customer"
        type: number
        sql: customer_id
        primary_key: true

      - name: customer_name
        description: "customer_name field from customer"
        type: string
        sql: customer_name

      - name: customer_email
        description: "customer_email field from customer"
        type: string
        sql: customer_email

      - name: customer_phone
        description: "customer_phone field from customer"
        type: string
        sql: customer_phone

    measures:
      - name: total_customer
        sql: customer_id
        type: count
        description: "Total count of customer records for business metrics and KPI calculations"
```

**Tables with Joins** (e.g., `transaction.yaml`):
```yaml
tables:
  - name: transaction
    sql: {{ load_sql('transaction') }}
    description: Comprehensive transaction data for business analytics, reporting, and operational insights
    data_source: icebase
    public: true

    joins:
      - name: customer
        relationship: many_to_one
        sql: "{TABLE.customer_id} = {customer.customer_id}"
      - name: product
        relationship: many_to_one
        sql: "{TABLE.product_id} = {product.product_id}"

    dimensions:
      - name: transaction_id
        description: "transaction_id field from transaction"
        type: number
        sql: transaction_id
        primary_key: true

      - name: customer_id
        description: "customer_id field from transaction"
        type: number
        sql: customer_id

      - name: product_id
        description: "product_id field from transaction"
        type: number
        sql: product_id

      - name: transaction_amount
        description: "transaction_amount field from transaction"
        type: number
        sql: transaction_amount

    measures:
      - name: total_transaction
        sql: transaction_id
        type: count
        description: "Total count of transaction records for business metrics and KPI calculations"
```

### Key Features of Config-Driven Generation

1. **Dynamic SQL Generation**: SQL queries are generated with only the columns defined in your config
2. **Professional SQL Formatting**: Clean, well-formatted SQL with 2-space indentation and proper line breaks
3. **Dynamic Source/Schema Mapping**: Automatically uses `{source}.{schema}.{entity}` format from config
4. **Primary Key Support**: Set `primary_key: true` for any column to mark it as a primary key
5. **Selective Joins**: Only tables with explicitly defined joins get a `joins:` section
6. **Type Mapping**: Column types from config are properly mapped to table YAML
7. **Clean Output**: No comments or unnecessary text in generated SQL files

### SQL Formatting Standards

The dp-generator generates SQL queries following professional formatting standards:

**Format Structure:**
```sql
SELECT
  column1,
  column2,
  column3
FROM
  source.schema.table
```

**Key Formatting Rules:**
- **SELECT**: On its own line
- **Columns**: Each column on its own line with 2-space indentation
- **Commas**: After each column except the last one
- **FROM**: On its own line
- **Table**: On its own line with 2-space indentation
- **Dynamic Mapping**: Uses `{source}.{schema}.{entity}` from config.yaml
- **No Comments**: Clean, production-ready SQL without comments

**Examples:**

**Config-Driven SQL (with specific columns):**
```sql
SELECT
  customer_id,
  customer_name,
  customer_email,
  customer_phone
FROM
  icebase.retail.customer
```

**Template SQL (with SELECT *):**
```sql
SELECT
  *
FROM
  icebase.retail.customer
```

## Generated Structure

The tool creates a comprehensive folder structure for each project:

### Source of Data Product Structure (for each entity in `-sodp`)
```
<project_name>/
├── <entity>/
│   ├── build/
│   │   ├── data-processing/
│   │   │   └── config-<entity>-flare.yaml
│   │   └── quality/
│   │       └── config-<entity>-quality.yaml
│   └── deploy/
│       ├── config-<entity>-scanner.yaml
│       ├── config-<entity>-bundle.yaml
│       ├── config-<entity>-dp.yaml
│       └── pipeline.yaml
```

### Consumption of Data Product Structure
```
<project_name>/
├── <consumption_layer>/
│   ├── activation/
│   │   ├── custom-application/
│   │   ├── data-apis/
│   │   └── notebook/
│   ├── build/
│   │   ├── access-control/
│   │   └── semantic-model/
│   │       └── <consumption_layer>/
│   │           └── model/
│   │               ├── sqls/
│   │               │   ├── <semantic_entity1>.sql
│   │               │   ├── <semantic_entity2>.sql
│   │               │   └── ...
│   │               ├── tables/
│   │               │   ├── <semantic_entity1>.yaml
│   │               │   ├── <semantic_entity2>.yaml
│   │               │   └── ...
│   │               ├── views/
│   │               ├── user_groups.yml
│   │               ├── deployment.yaml
│   │               ├── config.yaml
│   │               └── docker-compose.yml
│   ├── deploy/
│   │   ├── config-data-product-scanner.yaml
│   │   ├── config-<consumption_layer>-bundle.yaml
│   │   └── config-<consumption_layer>-dp.yaml
│   └── observability/
```

### Key Differences: Source of Data Products vs Semantic Entities

- **Source of Data Products (`-sodp` parameter)**: Create full build/deploy infrastructure with quality checks, pipelines, and deployment configurations
- **Semantic Entities (`-e` parameter)**: Create only SQL models and YAML table definitions in the consumption layer for semantic modeling

## Configuration Files

### Quality Configuration Files

Each entity gets its own quality configuration file with proper naming:
- `config-customer-quality.yaml` - Customer quality checks
- `config-product-quality.yaml` - Product quality checks  
- `config-transaction-quality.yaml` - Transaction quality checks

Quality config files include:
- Data completeness checks
- Schema validation
- Duplicate detection
- Missing value checks
- Proper entity title capitalization

### Template Variables

The generator supports the following template variables:
- `${entity}` - The entity name (e.g., "customer")
- `${entity_title}` - Capitalized entity name (e.g., "Customer")
- `${project_name}` - The project name
- `${output_catalog}` - Output catalog name (default: "icebase")

## Use Cases

### Complete Data Product with Consumption Layer
When you need both source data products and consumption layer with the same entities:
```bash
dp-generator -p simple-project -sodp customer,order -codp analytics
```

### Complex Analytics with Additional Dimensions
When your consumption layer needs additional semantic entities for analytics:
```bash
dp-generator -p complex-project -sodp customer,order,product -codp analytics -e customer,order,product,region,channel,segment
```

### Data Product with External Reference Data
When you have source data products but need to reference external entities in your semantic layer:
```bash
dp-generator -p external-ref -sodp sales,product -codp reporting -e sales,product,geography,time,currency
```

### Source-Only Data Products
When you only need to create source data products without consumption layer:
```bash
dp-generator -p source-only -sodp customer,product,transaction
```

### Consumption-Only Layer with Custom Config
When you only need to create a consumption layer with custom column definitions:
```bash
dp-generator -p consumption-only -codp analytics -e customer,product,transaction -path custom-config.yaml
```

### Config-Driven Analytics
When you want to define your data model in a configuration file:
```bash
dp-generator -p config-driven -codp analytics -e customer,product,transaction -path my-data-model.yaml
```

## Requirements

### System Requirements
- **macOS**: 10.15 (Catalina) or higher (recommended)
- **Linux**: Most modern distributions
- **Windows**: Use WSL or Git Bash

### Dependencies
- Bash shell (available on Linux, macOS, and Windows via WSL)
- Git (for cloning the repository)
- Basic file system permissions
- Write access to ~/bin directory

## Troubleshooting

### General Issues

1. **Command not found after installation**:
   ```bash
   source ~/.bashrc  # for bash
   # or
   source ~/.zshrc   # for zsh
   ```

2. **Permission errors**:
   ```bash
   chmod +x ~/bin/dp-generator
   ```

3. **Template files missing**:
   Ensure you're running from the project root directory with all reference templates present.

### Config-Driven Generation Issues

1. **Config file not found**:
   ```bash
   # Check if the config file exists
   ls -la custom-config.yaml
   
   # Use absolute path if needed
   dp-generator -p my-project -codp analytics -e customer,product -path /full/path/to/config.yaml
   ```

2. **SQL files using template instead of config columns**:
   - Check that your `config.yaml` has the correct structure
   - Ensure columns are defined under the `dimensions` section for each entity
   - Verify the config file is being read (check the generation summary)

3. **Table YAML missing joins**:
   - Ensure joins are defined under the correct entity in your `config.yaml`
   - Check the indentation and structure of your joins section

4. **Primary keys not working**:
   - Make sure `primary_key: true` is set for the correct columns
   - Check that the column name matches exactly

5. **SQL formatting issues**:
   - SQL files are generated with 2-space indentation by default
   - Each column appears on its own line for better readability
   - No comments are included in generated SQL files
   - Dynamic source/schema mapping uses values from config.yaml

6. **Source/schema not mapping correctly**:
   - Ensure `source:` and `schema:` are defined in your config.yaml
   - Check that the values are not empty or commented out
   - The tool falls back to `lakehouse.sandbox` if not specified

### Installation Issues

1. **PATH not updated after installation**:
   - Restart your terminal application
   - Or manually run: `source ~/.zshrc` (for zsh) or `source ~/.bashrc` (for bash)

2. **Permission denied errors**:
   - Ensure the script is executable: `chmod +x install.sh`
   - Check that you have write permissions to ~/bin directory

3. **Command not found after installation**:
   - Verify that ~/bin was added to your PATH
   - Check that the script was copied correctly: `ls -la ~/bin/dp-generator`

### Common Usage Issues

1. **Semantic entities not created**: Ensure the `-e` parameter is correctly formatted with comma-separated values
2. **Missing directories**: Check that all required parameters are provided
3. **Template substitution errors**: Verify that entity names don't contain special characters
4. **Quality config files not updated**: Run `make test` to delete and recreate projects with latest changes
5. **SQL files and tables not created**: Make sure you're using the correct syntax:
   - **Incorrect**: `dp-generator -p project -codp customer,product,transaction`
   - **Correct**: `dp-generator -p project -codp analytics -e customer,product,transaction`
6. **Wrong consumption layer name**: `-codp` should be a single name, not comma-separated entities
7. **Config file not being used**: Check the generation summary to see which config path is being used


## License

This project is open source and available under the MIT License. 