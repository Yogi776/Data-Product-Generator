#!/bin/bash

# Script directory - will be updated by install script
SCRIPT_DIR=""

# Determine the script's installation directory
# This allows the script to work from anywhere in the terminal
if [ -n "$SCRIPT_DIR" ]; then
    # If SCRIPT_DIR is set (by install script), use it
    INSTALL_DIR="$SCRIPT_DIR"
else
    # Otherwise, determine the directory where this script is located
    if [ -L "$0" ]; then
        # If the script is a symlink, follow it
        SCRIPT_PATH=$(readlink "$0")
    else
        SCRIPT_PATH="$0"
    fi
    INSTALL_DIR=$(dirname "$SCRIPT_PATH")
fi

# Set the reference directory path
REFERENCE_DIR="$INSTALL_DIR/reference"

# Verify that the reference directory exists
if [ ! -d "$REFERENCE_DIR" ]; then
    echo "Error: Reference directory not found at $REFERENCE_DIR"
    echo "This script requires the reference templates to be available."
    echo "Please ensure the installation was completed correctly."
    exit 1
fi

# Function to display usage
usage() {
    echo "Usage: $0 -p <project_name> [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -p <project_name>                    Project name (required)"
    echo "  -sodp <entity1,entity2,...>          Source of Data Product entities (optional)"
    echo "  -codp <consumption_layer>             Consumption of Data Product layer (optional)"
    echo "  -e <semantic_entity1,semantic_entity2,...>  Semantic entities for consumption layer (optional)"
    echo "  -path <config_file_path>              Custom path to config.yaml file (optional)"
    echo ""
    echo "EXAMPLES:"
    echo "  # Generate both SODP and CODP with same entities"
    echo "  $0 -p customer-360 -sodp customer,product,transaction -codp cust-360"
    echo ""
    echo "  # Generate SODP and CODP with different semantic entities"
    echo "  $0 -p customer-360 -sodp customer,product,transaction -codp cust-360 -e customer,product,transaction,city"
    echo ""
    echo "  # Generate only SODP (Source of Data Product)"
    echo "  $0 -p customer-360 -sodp customer,product,transaction"
    echo ""
    echo "  # Generate only CODP (Consumption of Data Product)"
    echo "  $0 -p customer-360 -codp analytics -e customer,product,transaction"
    echo ""
    echo "  # Generate CODP with custom config file path"
    echo "  $0 -p customer-360 -codp analytics -e customer,product,transaction -path config.yaml"
    echo ""
    echo "  # Generate CODP with default semantic entities (same as SODP)"
    echo "  $0 -p customer-360 -codp analytics"
    echo ""
    echo "IMPORTANT NOTES:"
    echo "  - At least one of -sodp or -codp must be specified"
    echo "  - -codp takes a single layer name (e.g., 'analytics', 'cust-360')"
    echo "  - -e specifies semantic entities for the consumption layer"
    echo "  - -path specifies custom config.yaml file path (relative or absolute)"
    echo "  - Don't confuse: -codp analytics -e customer,product (correct)"
    echo "                   -codp customer,product (incorrect - missing -e)"
    exit 1
}

# Function to create directory if it doesn't exist
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo "Created directory: $1"
    fi
}

# Function to create empty file if it doesn't exist
create_file() {
    if [ ! -f "$1" ]; then
        touch "$1"
        echo "Created file: $1"
    fi
}

# Function to create quality config file from template
create_quality_config() {
    local entity=$1
    local target_file=$2
    # Always recreate the file to ensure proper variable substitution
    cp "$REFERENCE_DIR/config-quality-template.yaml" "$target_file"
    # Create capitalized version of entity name for titles (first letter uppercase, rest lowercase)
    local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local rest_of_word=$(echo "$entity" | cut -c2- | tr '[:upper:]' '[:lower:]')
    local entity_title="${first_char}${rest_of_word}"
    # Replace template variables with actual values
    sed -i '' "s/\${entity}/$entity/g" "$target_file"
    sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
    echo "Created/Updated quality config file: $target_file"
}

# Function to create scanner config file from template
create_scanner_config() {
    local entity=$1
    local target_file=$2
    if [ ! -f "$target_file" ]; then
        cp "$REFERENCE_DIR/config-scanner-template.yaml" "$target_file"
        sed -i '' "s/\${entity}/$entity/g" "$target_file"
        echo "Created scanner config file: $target_file"
    fi
}

# Function to create pipeline config file from template
create_pipeline_config() {
    local entity=$1
    local project_name=$2
    local target_file=$3
    if [ ! -f "$target_file" ]; then
        cp "$REFERENCE_DIR/config-pipeline-template.yaml" "$target_file"
        sed -i '' "s/\${entity}/$entity/g" "$target_file"
        sed -i '' "s/\${project_name}/$project_name/g" "$target_file"
        echo "Created pipeline config file: $target_file"
    fi
}

# Function to create bundle config file from template
create_bundle_config() {
    local entity=$1
    local project_name=$2
    local target_file=$3
    if [ ! -f "$target_file" ]; then
        cp "$REFERENCE_DIR/bundle-template.yaml" "$target_file"
        sed -i '' "s/\${entity}/$entity/g" "$target_file"
        sed -i '' "s/\${project_name}/$project_name/g" "$target_file"
        echo "Created bundle config file: $target_file"
    fi
}

# Function to create deployment config file from template
create_deploy_config() {
    local entity=$1
    local target_file=$2
    if [ ! -f "$target_file" ]; then
        cp "$REFERENCE_DIR/sodp-template.yaml" "$target_file"
        sed -i '' "s/\${entity}/$entity/g" "$target_file"
        echo "Created deployment config file: $target_file"
    fi
}

# Function to create SQL file from template
create_sql_file() {
    local entity=$1
    local target_file=$2
    local config_file=$3
    
    # Extract source and schema from config file
    local source="lakehouse"
    local schema="sandbox"
    
    if [ -f "$config_file" ]; then
        # Extract source from config
        local config_source=$(grep "^source:" "$config_file" | sed 's/source:[[:space:]]*//')
        if [ -n "$config_source" ]; then
            source="$config_source"
        fi
        
        # Extract schema from config
        local config_schema=$(grep "^schema:" "$config_file" | sed 's/schema:[[:space:]]*//')
        if [ -n "$config_schema" ]; then
            schema="$config_schema"
        fi
    fi
    
    # Check if config file exists and has entity definition with actual columns
    if [ -f "$config_file" ] && grep -q "^  $entity:" "$config_file"; then
        # Extract columns from config dimensions section and create SELECT statement
        local columns=$(sed -n "/^  $entity:/,/^  [a-z]/p" "$config_file" | sed -n "/^    dimensions:/,/^    [a-z]/p" | grep "      - name:" | sed 's/.*name: //')
        
        # Check if we found any actual columns (not just comments)
        if [ -n "$columns" ]; then
            # Generate SQL with specific columns from config
            echo "SELECT" > "$target_file"
            
            # Format each column on its own line
            local first_column=true
            while IFS= read -r column; do
                if [ -n "$column" ]; then
                    if [ "$first_column" = true ]; then
                        echo "  $column," >> "$target_file"
                        first_column=false
                    else
                        echo "  $column," >> "$target_file"
                    fi
                fi
            done <<< "$columns"
            
            # Remove the last comma from the last column
            sed -i '' '$ s/,$//' "$target_file"
            
            echo "FROM" >> "$target_file"
            echo "  ${source}.${schema}.${entity}" >> "$target_file"
            echo "Created/Updated SQL file with config columns: $target_file"
        else
            # No columns defined in config, use template
            echo "SELECT" > "$target_file"
            echo "  *" >> "$target_file"
            echo "FROM" >> "$target_file"
            echo "  ${source}.${schema}.${entity}" >> "$target_file"
            echo "Created/Updated SQL file with template (no config columns): $target_file"
        fi
    else
        # Fallback to template if config doesn't exist
        cp "$REFERENCE_DIR/sql-template.sql" "$target_file"
        sed -i '' "s/\${entity}/$entity/g" "$target_file"
        sed -i '' "s/lakehouse\.sandbox/${source}.${schema}/g" "$target_file"
        echo "Created/Updated SQL file with template: $target_file"
    fi
}

# Function to create table YAML file from template
create_table_yaml() {
    local entity=$1
    local target_file=$2
    local config_file=$3
    
    # Extract source and schema from config file
    local source="lakehouse"
    local schema="sandbox"
    
    if [ -f "$config_file" ]; then
        # Extract source from config
        local config_source=$(grep "^source:" "$config_file" | sed 's/source:[[:space:]]*//')
        if [ -n "$config_source" ]; then
            source="$config_source"
        fi
        
        # Extract schema from config
        local config_schema=$(grep "^schema:" "$config_file" | sed 's/schema:[[:space:]]*//')
        if [ -n "$config_schema" ]; then
            schema="$config_schema"
        fi
    fi
    
    # Check if config file exists and has entity definition with actual columns
    if [ -f "$config_file" ] && grep -q "^  $entity:" "$config_file"; then
        # Extract dimensions from config dimensions section
        local entity_section=$(sed -n "/^  $entity:/,/^  [a-z]/p" "$config_file" | sed -n "/^    dimensions:/,/^    [a-z]/p" | grep "      - name:")
        
        # Check if we found any actual columns (not just comments)
        if [ -n "$entity_section" ]; then
            # Generate table YAML with specific columns from config
            echo "tables:" > "$target_file"
            echo "  - name: $entity" >> "$target_file"
            echo "    sql: {{ load_sql('$entity') }}" >> "$target_file"
            echo "    description: Comprehensive $entity data for business analytics, reporting, and operational insights" >> "$target_file"
            echo "    data_source: ${source}" >> "$target_file"
            echo "    public: true" >> "$target_file"
            echo "" >> "$target_file"
            
            # Check if joins are defined for this entity in config
            local entity_joins=""
            
            # First check if joins are defined under the entity itself
            if grep -q "joins:" "$config_file" && sed -n "/^  $entity:/,/^  [a-z]/p" "$config_file" | grep -q "^    joins:"; then
                # Extract joins from config for this entity
                entity_joins=$(sed -n "/^  $entity:/,/^  [a-z]/p" "$config_file" | sed -n "/^    joins:/,/^    [a-z]/p" | grep -A 20 "^    joins:")
            elif grep -q "joins:" "$config_file" && grep -A 20 "joins:" "$config_file" | grep -q "^  $entity:"; then
                # Check if joins are defined in a separate joins section
                entity_joins=$(sed -n "/^joins:/,/^[a-z]/p" "$config_file" | sed -n "/^  $entity:/,/^  [a-z]/p" | grep -A 20 "^  $entity:")
            fi
            
            if [ -n "$entity_joins" ]; then
                echo "    joins:" >> "$target_file"
                # Parse and add joins from config
                local current_join_name=""
                local current_relationship=""
                local current_sql=""
                
                while IFS= read -r line; do
                    if [[ $line =~ ^[[:space:]]*-[[:space:]]name:[[:space:]]*(.+)$ ]]; then
                        # If we have a complete join, write it
                        if [ -n "$current_join_name" ] && [ -n "$current_relationship" ] && [ -n "$current_sql" ]; then
                            echo "      - name: $current_join_name" >> "$target_file"
                            echo "        relationship: $current_relationship" >> "$target_file"
                            echo "        sql: $current_sql" >> "$target_file"
                        fi
                        # Start new join
                        current_join_name="${BASH_REMATCH[1]}"
                        current_relationship=""
                        current_sql=""
                    elif [[ $line =~ ^[[:space:]]*relationship:[[:space:]]*(.+)$ ]]; then
                        current_relationship="${BASH_REMATCH[1]}"
                    elif [[ $line =~ ^[[:space:]]*sql:[[:space:]]*(.+)$ ]]; then
                        current_sql="${BASH_REMATCH[1]}"
                    fi
                done <<< "$entity_joins"
                
                # Write the last join if complete
                if [ -n "$current_join_name" ] && [ -n "$current_relationship" ] && [ -n "$current_sql" ]; then
                    echo "      - name: $current_join_name" >> "$target_file"
                    echo "        relationship: $current_relationship" >> "$target_file"
                    echo "        sql: $current_sql" >> "$target_file"
                fi
            fi
            # Note: No else clause - only add joins section if explicitly defined in config
            echo "    dimensions:" >> "$target_file"
            
            while IFS= read -r line; do
                if [[ $line =~ name:[[:space:]]*(.+) ]]; then
                    local col_name="${BASH_REMATCH[1]}"
                    local col_type=$(sed -n "/^  $entity:/,/^  [a-z]/p" "$config_file" | sed -n "/^    dimensions:/,/^    [a-z]/p" | grep -A 1 "      - name: $col_name" | grep "        type:" | sed 's/.*type: //' | head -1)
                    
                    # Check if this column has primary_key defined in config
                    local has_primary_key=$(sed -n "/^  $entity:/,/^  [a-z]/p" "$config_file" | sed -n "/^    dimensions:/,/^    [a-z]/p" | grep -A 3 "      - name: $col_name" | grep "        primary_key:" | sed 's/.*primary_key: //' | head -1)
                    
                    echo "      - name: $col_name" >> "$target_file"
                    echo "        description: \"$col_name field from $entity\"" >> "$target_file"
                    echo "        type: $col_type" >> "$target_file"
                    echo "        sql: $col_name" >> "$target_file"
                    
                    # Set primary_key based on config (only if explicitly set to true)
                    if [ "$has_primary_key" = "true" ]; then
                        echo "        primary_key: true" >> "$target_file"
                    fi
                    echo "" >> "$target_file"
                fi
            done <<< "$entity_section"
            
            echo "    measures:" >> "$target_file"
            echo "      - name: total_$entity" >> "$target_file"
            echo "        sql: ${entity}_id" >> "$target_file"
            echo "        type: count" >> "$target_file"
            echo "        description: \"Total count of $entity records for business metrics and KPI calculations\"" >> "$target_file"
            
            echo "Created/Updated table YAML file with config columns: $target_file"
        else
            # No columns defined in config, use template
            cp "$REFERENCE_DIR/model.yaml" "$target_file"
            sed -i '' "s/\${entity}/$entity/g" "$target_file"
            sed -i '' "s/data_source: icebase/data_source: ${source}/g" "$target_file"
            echo "Created/Updated table YAML file with template (no config columns): $target_file"
        fi
    else
        # Fallback to template if config doesn't exist
        cp "$REFERENCE_DIR/model.yaml" "$target_file"
        sed -i '' "s/\${entity}/$entity/g" "$target_file"
        sed -i '' "s/data_source: icebase/data_source: ${source}/g" "$target_file"
        echo "Created/Updated table YAML file with template: $target_file"
    fi
}

# Function to create user groups YAML file from template
create_user_groups_yaml() {
    local target_file=$1
    # Always recreate the file to ensure proper variable substitution
    cp "$REFERENCE_DIR/user_groups.yaml" "$target_file"
    echo "Created/Updated user groups YAML file: $target_file"
}

# Function to create deployment YAML file from template
create_deployment_yaml() {
    local entity=$1
    local target_file=$2
    # Always recreate the file to ensure proper variable substitution
    cp "$REFERENCE_DIR/lens-deployment.yaml" "$target_file"
    sed -i '' "s/\${entity}/$entity/g" "$target_file"
    echo "Created/Updated deployment YAML file: $target_file"
}

# Function to create instance-secret lens config file from template
create_instance_secret_lens_config() {
    local entity=$1
    local target_file=$2
    
    cp "$REFERENCE_DIR/config-instance-secret-lens-template.yaml" "$target_file"
    # Create capitalized version of entity name for titles (first letter uppercase, rest lowercase)
    local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local rest_of_word=$(echo "$entity" | cut -c2- | tr '[:upper:]' '[:lower:]')
    local entity_title="${first_char}${rest_of_word}"
    # Replace only the entity_title variable in description, keep the rest as is
    sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
    echo "Created instance-secret lens config file: $target_file"
}

# Function to create workflow failed monitor config file from template
create_workflow_failed_monitor_config() {
    local entity=$1
    local target_file=$2
    
    cp "$REFERENCE_DIR/config-workflow-failed-template.yaml" "$target_file"
    # Create capitalized version of entity name for titles (first letter uppercase, rest lowercase)
    local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local rest_of_word=$(echo "$entity" | cut -c2- | tr '[:upper:]' '[:lower:]')
    local entity_title="${first_char}${rest_of_word}"
    # Replace template variables with actual values
    sed -i '' "s/\${entity}/$entity/g" "$target_file"
    sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
    echo "Created workflow failed monitor config file: $target_file"
}

# Function to create quality checks failed monitor config file from template
create_quality_checks_failed_monitor_config() {
    local entity=$1
    local target_file=$2
    
    cp "$REFERENCE_DIR/config-quality-checks-failed-template.yaml" "$target_file"
    # Create capitalized version of entity name for titles (first letter uppercase, rest lowercase)
    local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local rest_of_word=$(echo "$entity" | cut -c2- | tr '[:upper:]' '[:lower:]')
    local entity_title="${first_char}${rest_of_word}"
    # Replace template variables with actual values
    sed -i '' "s/\${entity}/$entity/g" "$target_file"
    sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
    echo "Created quality checks failed monitor config file: $target_file"
}

# Function to create business rules lens monitor config file from template
create_business_rules_lens_monitor_config() {
    local entity=$1
    local target_file=$2
    
    cp "$REFERENCE_DIR/config-business-rules-lens-template.yaml" "$target_file"
    # Create capitalized version of entity name for titles (first letter uppercase, rest lowercase)
    local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local rest_of_word=$(echo "$entity" | cut -c2- | tr '[:upper:]' '[:lower:]')
    local entity_title="${first_char}${rest_of_word}"
    # Replace template variables with actual values
    sed -i '' "s/\${entity}/$entity/g" "$target_file"
    sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
    echo "Created business rules lens monitor config file: $target_file"
}

# Function to create workflow failed pager config file from template
create_workflow_failed_pager_config() {
    local entity=$1
    local target_file=$2
    
    cp "$REFERENCE_DIR/config-workflow-failed-pager-template.yaml" "$target_file"
    # Create capitalized version of entity name for titles (first letter uppercase, rest lowercase)
    local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local rest_of_word=$(echo "$entity" | cut -c2- | tr '[:upper:]' '[:lower:]')
    local entity_title="${first_char}${rest_of_word}"
    # Replace template variables with actual values
    sed -i '' "s/\${entity}/$entity/g" "$target_file"
    sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
    echo "Created workflow failed pager config file: $target_file"
}

# Function to create quality checks failed pager config file from template
create_quality_checks_failed_pager_config() {
    local entity=$1
    local target_file=$2
    
    cp "$REFERENCE_DIR/config-quality-checks-failed-pager-template.yaml" "$target_file"
    # Create capitalized version of entity name for titles (first letter uppercase, rest lowercase)
    local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local rest_of_word=$(echo "$entity" | cut -c2- | tr '[:upper:]' '[:lower:]')
    local entity_title="${first_char}${rest_of_word}"
    # Replace template variables with actual values
    sed -i '' "s/\${entity}/$entity/g" "$target_file"
    sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
    echo "Created quality checks failed pager config file: $target_file"
}

# Function to create business rules lens pager config file from template
create_business_rules_lens_pager_config() {
    local entity=$1
    local target_file=$2
    
    cp "$REFERENCE_DIR/config-business-rules-lens-pager-template.yaml" "$target_file"
    # Create capitalized version of entity name for titles (first letter uppercase, rest lowercase)
    local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local rest_of_word=$(echo "$entity" | cut -c2- | tr '[:upper:]' '[:lower:]')
    local entity_title="${first_char}${rest_of_word}"
    # Replace template variables with actual values
    sed -i '' "s/\${entity}/$entity/g" "$target_file"
    sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
    echo "Created business rules lens pager config file: $target_file"
}

# Function to create data app Dockerfile
create_data_app_dockerfile() {
    local target_file=$1
    local project_name=$2
    local consumption_layer=$3
    
    cat > "$target_file" << 'EOF'
# Multi-stage build for data application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
EOF

    echo "Created data app Dockerfile: $target_file"
}

# Function to create data app deployment YAML
create_data_app_deployment_yaml() {
    local target_file=$1
    local project_name=$2
    local consumption_layer=$3
    
    # Copy template and replace variables
    cp "$REFERENCE_DIR/data-app-deployment-template.yaml" "$target_file"
    sed -i '' "s/\${project_name}/$project_name/g" "$target_file"
    sed -i '' "s/\${consumption_layer}/$consumption_layer/g" "$target_file"
    
    echo "Created data app deployment YAML: $target_file"
}

# Function to create LLM model deployment YAML
create_llm_model_deployment_yaml() {
    local target_file=$1
    local project_name=$2
    local consumption_layer=$3
    
    # Copy template and replace variables
    cp "$REFERENCE_DIR/llm-model-deployment-template.yaml" "$target_file"
    sed -i '' "s/\${project_name}/$project_name/g" "$target_file"
    sed -i '' "s/\${consumption_layer}/$consumption_layer/g" "$target_file"
    
    echo "Created LLM model deployment YAML: $target_file"
}

# Function to create LLM example configuration file
create_llm_example_config() {
    local target_file=$1
    local project_name=$2
    local consumption_layer=$3
    
    # Copy template and replace variables
    cp "$REFERENCE_DIR/llm-example-template.txt" "$target_file"
    sed -i '' "s/\${project_name}/$project_name/g" "$target_file"
    sed -i '' "s/\${consumption_layer}/$consumption_layer/g" "$target_file"
    
    echo "Created LLM example configuration: $target_file"
}

# Function to create docker secret config file
create_docker_secret_config() {
    local target_file=$1
    
    # Copy template (no variable substitution needed for this file)
    cp "$REFERENCE_DIR/config-docker-secret-template.yaml" "$target_file"
    
    echo "Created docker secret config: $target_file"
}

# Function to create LLM secret config file
create_llm_secret_config() {
    local target_file=$1
    
    # Copy template (no variable substitution needed for this file)
    cp "$REFERENCE_DIR/config-llm-secret-template.yaml" "$target_file"
    
    echo "Created LLM secret config: $target_file"
}

# Function to create config YAML file with entity definitions
create_config_yaml() {
    local target_file=$1
    local semantic_entities=$2
    
    # Create config file with minimal entity definitions
    echo "# Data Product Configuration" > "$target_file"
    echo "# Generated automatically by dp-generator" >> "$target_file"
    echo "# Customize this file to define your entity columns and types" >> "$target_file"
    echo "" >> "$target_file"
    echo "logical_model: analytics" >> "$target_file"
    echo "source: icebase" >> "$target_file"
    echo "schema: retail" >> "$target_file"
    echo "entities:" >> "$target_file"
    
    # Add entity definitions based on semantic entities (minimal structure)
    IFS=',' read -ra ENTITIES_ARRAY <<< "$semantic_entities"
    for entity in "${ENTITIES_ARRAY[@]}"; do
        echo "  $entity:" >> "$target_file"
        echo "    dimensions:" >> "$target_file"
        echo "      # Add your columns here. Example:" >> "$target_file"
        echo "      # - name: ${entity}_id" >> "$target_file"
        echo "      #   type: number" >> "$target_file"
        echo "      #   primary_key: true" >> "$target_file"
        echo "      # - name: ${entity}_name" >> "$target_file"
        echo "      #   type: string" >> "$target_file"
        echo "      # - name: created_at" >> "$target_file"
        echo "      #   type: timestamp" >> "$target_file"
        echo "" >> "$target_file"
    done
    
    # Add joins section template
    echo "" >> "$target_file"
    echo "# Join relationships between entities" >> "$target_file"
    echo "joins:" >> "$target_file"
    echo "  # Example join definitions:" >> "$target_file"
    echo "  # transaction:" >> "$target_file"
    echo "  #   - name: customer" >> "$target_file"
    echo "  #     relationship: many_to_one" >> "$target_file"
    echo "  #     sql: \"{TABLE.customer_id} = {customer.customer_id}\"" >> "$target_file"
    echo "  #   - name: product" >> "$target_file"
    echo "  #     relationship: many_to_one" >> "$target_file"
    echo "  #     sql: \"{TABLE.product_id} = {product.product_id}\"" >> "$target_file"
    
    echo "Created/Updated config YAML file: $target_file"
    echo "Note: Please customize the config.yaml file to define your entity columns, types, and joins"
}

# Function to create flare data processing config file from template
create_flare_config() {
    local entity=$1
    local project_name=$2
    local target_file=$3
    if [ ! -f "$target_file" ]; then
        cp "$REFERENCE_DIR/flare-template.yaml" "$target_file"
        # Create capitalized version of entity name for titles
        local first_char=$(echo "$entity" | cut -c1 | tr '[:lower:]' '[:upper:]')
        local rest_of_word=$(echo "$entity" | cut -c2-)
        local entity_title="${first_char}${rest_of_word}"
        # Replace template variables with actual values
        sed -i '' "s/\${entity}/$entity/g" "$target_file"
        sed -i '' "s/\${entity_title}/$entity_title/g" "$target_file"
        sed -i '' "s/\${project_name}/$project_name/g" "$target_file"
        sed -i '' "s/\${output_catalog}/icebase/g" "$target_file"
        echo "Created flare config file: $target_file"
    fi
}

# Function to generate Source of Data Product (SODP) structure
generate_sodp() {
    local project_name=$1
    local entities=$2
    
    echo "Generating Source of Data Product (SODP) structure..."
    
    # Convert comma-separated entities to array
    IFS=',' read -ra DATA_PRODUCTS <<< "$entities"
    
    # Create structure for each data product
    for product in "${DATA_PRODUCTS[@]}"; do
        echo "Creating SODP for entity: $product"
        
        # Build directory structure
        create_dir "$project_name/$product/build/data-processing"
        create_dir "$project_name/$product/build/quality"
        create_dir "$project_name/$product/deploy"

        # Create configuration files
        create_flare_config "$product" "$project_name" "$project_name/$product/build/data-processing/config-$product-flare.yaml"
        create_quality_config "$product" "$project_name/$product/build/quality/config-$product-quality.yaml"
        create_scanner_config "$product" "$project_name/$product/deploy/config-$product-scanner.yaml"
        create_bundle_config "$product" "$project_name" "$project_name/$product/deploy/config-$product-bundle.yaml"
        create_deploy_config "$product" "$project_name/$product/deploy/config-$product-dp.yaml"
        create_pipeline_config "$product" "$project_name" "$project_name/$product/deploy/pipeline.yaml"
    done
    
    echo "SODP structure created successfully for entities: ${DATA_PRODUCTS[*]}"
}

# Function to generate Consumption of Data Product (CODP) structure
generate_codp() {
    local project_name=$1
    local consumption_layer=$2
    local semantic_entities=$3
    local config_path=$4
    
    echo "Generating Consumption of Data Product (CODP) structure..."
    
    # If semantic entities are not provided, use SODP entities as default
    if [ -z "$semantic_entities" ]; then
        if [ -n "$SODP_ENTITIES" ]; then
            semantic_entities="$SODP_ENTITIES"
            echo "Using SODP entities as default semantic entities: $semantic_entities"
        else
            echo "Warning: No semantic entities provided and no SODP entities available for default."
            echo "Creating empty CODP structure without semantic entities."
        fi
    fi
    
    # Create CODP directory structure
    create_dir "$project_name/$consumption_layer/activation/custom-application"
    create_dir "$project_name/$consumption_layer/activation/custom-application/data-app"
    create_dir "$project_name/$consumption_layer/activation/custom-application/data-app/app"
    create_dir "$project_name/$consumption_layer/activation/custom-application/llm-model"
    create_dir "$project_name/$consumption_layer/activation/data-apis"
    create_dir "$project_name/$consumption_layer/activation/notebook"
    create_dir "$project_name/$consumption_layer/activation/instance-secret"
    create_dir "$project_name/$consumption_layer/build/access-control"
    create_dir "$project_name/$consumption_layer/build/semantic-model/$consumption_layer/model/sqls"
    create_dir "$project_name/$consumption_layer/build/semantic-model/$consumption_layer/model/tables"
    create_dir "$project_name/$consumption_layer/build/semantic-model/$consumption_layer/model/views"
    create_dir "$project_name/$consumption_layer/deploy"
    create_dir "$project_name/$consumption_layer/observability/monitor"
    create_dir "$project_name/$consumption_layer/observability/pager"

    # Create SQL files for each semantic entity if provided
    if [ -n "$semantic_entities" ]; then
        # Determine config file path
        local config_file="$project_name/$consumption_layer/build/semantic-model/$consumption_layer/model/config.yaml"
        
        if [ -n "$config_path" ]; then
            # Use custom config path if provided
            if [ -f "$config_path" ]; then
                config_file="$config_path"
                echo "Using custom config YAML file: $config_file"
            else
                echo "Warning: Custom config file not found at: $config_path"
                echo "Falling back to default config generation"
                create_config_yaml "$config_file" "$semantic_entities"
                echo "Created default config YAML file: $config_file"
            fi
        else
            # Check if default config file exists, if not create a default one
            if [ ! -f "$config_file" ]; then
                create_config_yaml "$config_file" "$semantic_entities"
                echo "Created default config YAML file: $config_file"
            else
                echo "Using existing config YAML file: $config_file"
            fi
        fi
        
        # Create SQL files for each semantic entity
        IFS=',' read -ra SEMANTIC_ENTITIES_ARRAY <<< "$semantic_entities"
        for entity in "${SEMANTIC_ENTITIES_ARRAY[@]}"; do
            create_sql_file "$entity" "$project_name/$consumption_layer/build/semantic-model/$consumption_layer/model/sqls/$entity.sql" "$config_file"
            create_table_yaml "$entity" "$project_name/$consumption_layer/build/semantic-model/$consumption_layer/model/tables/$entity.yaml" "$config_file"
        done
        echo "Created semantic entities: ${SEMANTIC_ENTITIES_ARRAY[*]}"
        
        # Create instance-secret config files
        echo "Creating instance-secret config files..."
        create_instance_secret_lens_config "general" "$project_name/$consumption_layer/activation/instance-secret/config-instance-secret.yaml"
        create_docker_secret_config "$project_name/$consumption_layer/activation/instance-secret/config-docker-secret.yaml"
        create_llm_secret_config "$project_name/$consumption_layer/activation/instance-secret/config-llm-secret.yaml"
        echo "Created instance-secret config files: config-instance-secret.yaml, config-docker-secret.yaml, config-llm-secret.yaml"
    fi

    # Create data app files in custom-application
    create_data_app_dockerfile "$project_name/$consumption_layer/activation/custom-application/data-app/Dockerfile" "$project_name" "$consumption_layer"
    create_data_app_deployment_yaml "$project_name/$consumption_layer/activation/custom-application/data-app/deployment.yaml" "$project_name" "$consumption_layer"
    
    # Create LLM model files in custom-application
    create_llm_model_deployment_yaml "$project_name/$consumption_layer/activation/custom-application/llm-model/deployment.yaml" "$project_name" "$consumption_layer"
    
    # Create configuration directory structure for LLM
    create_dir "$project_name/$consumption_layer/build/activation/$project_name-llm/configuration"
    create_llm_example_config "$project_name/$consumption_layer/build/activation/$project_name-llm/configuration/examples.txt" "$project_name" "$consumption_layer"
    
    # Create remaining configuration files
    create_user_groups_yaml "$project_name/$consumption_layer/build/semantic-model/$consumption_layer/model/user_groups.yml"
    create_deployment_yaml "$consumption_layer" "$project_name/$consumption_layer/build/semantic-model/$consumption_layer/deployment.yaml"
    create_file "$project_name/$consumption_layer/build/semantic-model/$consumption_layer/docker-compose.yml"
    create_file "$project_name/$consumption_layer/deploy/config-data-product-scanner.yaml"
    create_bundle_config "$consumption_layer" "$project_name" "$project_name/$consumption_layer/deploy/config-$consumption_layer-bundle.yaml"
    create_deploy_config "$consumption_layer" "$project_name/$consumption_layer/deploy/config-$consumption_layer-dp.yaml"
    
    # Create observability configuration files (3 files per directory)
    if [ -n "$semantic_entities" ]; then
        # Use the first entity for template generation (or create generic templates)
        IFS=',' read -ra SEMANTIC_ENTITIES_ARRAY <<< "$semantic_entities"
        first_entity="${SEMANTIC_ENTITIES_ARRAY[0]}"
        
        # Create monitor files (3 files total)
        create_workflow_failed_monitor_config "$first_entity" "$project_name/$consumption_layer/observability/monitor/config-workflow-failed.yaml"
        create_quality_checks_failed_monitor_config "$first_entity" "$project_name/$consumption_layer/observability/monitor/config-quality-checks-failed.yaml"
        create_business_rules_lens_monitor_config "$first_entity" "$project_name/$consumption_layer/observability/monitor/config-business-rules-lens.yaml"
        
        # Create pager files (3 files total)
        create_workflow_failed_pager_config "$first_entity" "$project_name/$consumption_layer/observability/pager/config-workflow-failed.yaml"
        create_quality_checks_failed_pager_config "$first_entity" "$project_name/$consumption_layer/observability/pager/config-quality-checks-failed.yaml"
        create_business_rules_lens_pager_config "$first_entity" "$project_name/$consumption_layer/observability/pager/config-business-rules-lens.yaml"
        
        echo "Created observability configuration files (3 monitor + 3 pager files)"
    fi
    
    echo "CODP structure created successfully for consumption layer: $consumption_layer"
}

# Initialize variables
CONFIG_PATH=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -sodp)
            SODP_ENTITIES="$2"
            shift 2
            ;;
        -codp)
            CONSUMPTION_LAYER="$2"
            shift 2
            ;;
        -e)
            SEMANTIC_ENTITIES="$2"
            shift 2
            ;;
        -path)
            CONFIG_PATH="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Check if project name is provided
if [ -z "$PROJECT_NAME" ]; then
    echo "Error: Project name (-p) is required"
    usage
fi

# Check if at least one of SODP or CODP is specified
if [ -z "$SODP_ENTITIES" ] && [ -z "$CONSUMPTION_LAYER" ]; then
    echo "Error: At least one of -sodp or -codp must be specified"
    usage
fi

# Check for common mistake: using -codp with comma-separated entities instead of -e
if [ -n "$CONSUMPTION_LAYER" ] && [[ "$CONSUMPTION_LAYER" == *","* ]]; then
    echo "Error: Common mistake detected!"
    echo "You used: -codp $CONSUMPTION_LAYER"
    echo ""
    echo "The correct syntax should be:"
    echo "  -codp <layer_name> -e <entities>"
    echo ""
    echo "For example:"
    echo "  -codp analytics -e $CONSUMPTION_LAYER"
    echo ""
    echo "Where:"
    echo "  -codp analytics     (single layer name)"
    echo "  -e $CONSUMPTION_LAYER (comma-separated entities)"
    exit 1
fi

# Create base directory
create_dir "$PROJECT_NAME"

# Generate SODP if specified
if [ -n "$SODP_ENTITIES" ]; then
    generate_sodp "$PROJECT_NAME" "$SODP_ENTITIES"
fi

# Generate CODP if specified
if [ -n "$CONSUMPTION_LAYER" ]; then
    generate_codp "$PROJECT_NAME" "$CONSUMPTION_LAYER" "$SEMANTIC_ENTITIES" "$CONFIG_PATH"
fi

# Summary
echo ""
echo "=== Generation Summary ==="
echo "Project: $PROJECT_NAME"
if [ -n "$SODP_ENTITIES" ]; then
    echo "SODP Entities: $SODP_ENTITIES"
fi
if [ -n "$CONSUMPTION_LAYER" ]; then
    echo "CODP Layer: $CONSUMPTION_LAYER"
    if [ -n "$SEMANTIC_ENTITIES" ]; then
        echo "Semantic Entities: $SEMANTIC_ENTITIES"
    elif [ -n "$SODP_ENTITIES" ]; then
        echo "Semantic Entities: $SODP_ENTITIES (defaulted from SODP)"
    else
        echo "Semantic Entities: None (empty CODP structure)"
    fi
    if [ -n "$CONFIG_PATH" ]; then
        echo "Config Path: $CONFIG_PATH"
    fi
fi
echo "=========================" 