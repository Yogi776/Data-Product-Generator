'use client';

import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { ToastContainer, ToastType, ToastData } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Dimension {
  name: string;
  description: string;
  type: 'string' | 'number' | 'time' | 'boolean';
  sql: string;
  primary_key: boolean;
}

interface Measure {
  name: string;
  description: string;
  type: 'count' | 'count_distinct' | 'sum' | 'avg' | 'min' | 'max';
  sql: string;
}

interface Join {
  name: string;
  relationship: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
  sql: string;
}

interface Table {
  name: string;
  description: string;
  data_source: string;
  schema: string;
  dimensions: Dimension[];
  measures: Measure[];
  joins: Join[];
}

interface LensConfig {
  project_name: string;
  source: string;
  tables: Table[];
}

export default function LensGenerator() {
  const [config, setConfig] = useState<LensConfig>({
    project_name: '',
    source: 'icebase',
    tables: []
  });

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'dimensions' | 'measures' | 'joins'>('dimensions');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [sqlInput, setSqlInput] = useState('');
  const [showSqlParser, setShowSqlParser] = useState(false);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Toast helper functions
  const showToast = useCallback((type: ToastType, message: string, details?: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message, details, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showError = useCallback((message: string, details?: string) => {
    showToast('error', message, details);
  }, [showToast]);

  const showSuccess = useCallback((message: string, details?: string) => {
    showToast('success', message, details);
  }, [showToast]);

  const showWarning = useCallback((message: string, details?: string) => {
    showToast('warning', message, details, 7000);
  }, [showToast]);

  const showInfo = useCallback((message: string, details?: string) => {
    showToast('info', message, details);
  }, [showToast]);

  // Confirmation dialog helper
  const showConfirmation = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  }, []);

  const closeConfirmation = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Validation functions
  const validateProjectName = useCallback((name: string): { valid: boolean; error?: string } => {
    if (!name.trim()) {
      return { valid: false, error: 'Project name is required' };
    }
    if (name.length < 3) {
      return { valid: false, error: 'Project name must be at least 3 characters' };
    }
    if (name.length > 48) {
      return { valid: false, error: 'Project name must be 48 characters or less' };
    }
    const validPattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!validPattern.test(name)) {
      return {
        valid: false,
        error: 'Project name must:\n- Use only lowercase letters, numbers, and hyphens\n- Start and end with alphanumeric characters\n- Not contain spaces or special characters'
      };
    }
    return { valid: true };
  }, []);

  const validateTableName = useCallback((name: string, existingNames: string[] = [], currentIndex?: number): { valid: boolean; error?: string } => {
    if (!name.trim()) {
      return { valid: false, error: 'Table name is required' };
    }
    const validPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!validPattern.test(name)) {
      return {
        valid: false,
        error: 'Table name must start with a letter and contain only letters, numbers, and underscores'
      };
    }
    // Check for duplicates (excluding current table if editing)
    const otherNames = existingNames.filter((_, idx) => idx !== currentIndex);
    if (otherNames.includes(name)) {
      return { valid: false, error: `Table "${name}" already exists. Please use a unique name.` };
    }
    return { valid: true };
  }, []);

  const validateTable = useCallback((table: Table, index: number): string[] => {
    const errors: string[] = [];
    const tableName = table.name || `Table #${index + 1}`;

    // Validate table name
    const nameValidation = validateTableName(table.name, config.tables.map(t => t.name), index);
    if (!nameValidation.valid) {
      errors.push(`${tableName}: ${nameValidation.error}`);
    }

    // Validate dimensions
    if (table.dimensions.length === 0) {
      errors.push(`${tableName}: At least one dimension is required`);
    }

    const dimensionNames = new Set<string>();
    table.dimensions.forEach((dim, idx) => {
      if (!dim.name.trim()) {
        errors.push(`${tableName} - Dimension #${idx + 1}: Name is required`);
      } else {
        if (dimensionNames.has(dim.name)) {
          errors.push(`${tableName}: Duplicate dimension name "${dim.name}"`);
        }
        dimensionNames.add(dim.name);
      }
      if (!dim.sql && !dim.name) {
        errors.push(`${tableName} - Dimension "${dim.name || '#' + (idx + 1)}": SQL expression is required`);
      }
    });

    // Validate measures
    const measureNames = new Set<string>();
    table.measures.forEach((measure, idx) => {
      if (!measure.name.trim()) {
        errors.push(`${tableName} - Measure #${idx + 1}: Name is required`);
      } else {
        if (measureNames.has(measure.name)) {
          errors.push(`${tableName}: Duplicate measure name "${measure.name}"`);
        }
        measureNames.add(measure.name);
      }
      if (!measure.sql.trim()) {
        errors.push(`${tableName} - Measure "${measure.name || '#' + (idx + 1)}": SQL expression is required`);
      }
    });

    // Validate joins
    table.joins.forEach((join, idx) => {
      if (!join.name.trim()) {
        errors.push(`${tableName} - Join #${idx + 1}: Target table name is required`);
      }
      if (!join.sql.trim()) {
        errors.push(`${tableName} - Join "${join.name || '#' + (idx + 1)}": Join condition is required`);
      }
    });

    return errors;
  }, [config.tables, validateTableName]);

  const validateAllBeforeDownload = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate project name
    const projectValidation = validateProjectName(config.project_name);
    if (!projectValidation.valid) {
      errors.push(`Project: ${projectValidation.error}`);
    }

    // Validate tables
    if (config.tables.length === 0) {
      errors.push('At least one table is required');
      return { valid: false, errors };
    }

    config.tables.forEach((table, idx) => {
      const tableErrors = validateTable(table, idx);
      errors.push(...tableErrors);
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }, [config, validateProjectName, validateTable]);

  // Parse SQL and generate table structure (Enhanced)
  const parseSQLQuery = (sql: string) => {
    // Validation
    if (!sql.trim()) {
      showError('SQL query is empty', 'Please enter a valid SELECT query');
      return;
    }

    if (!sql.toUpperCase().includes('SELECT')) {
      showError('Invalid SQL query', 'Query must contain a SELECT statement');
      return;
    }

    if (!sql.toUpperCase().includes('FROM')) {
      showError('Invalid SQL query', 'Query must contain a FROM clause');
      return;
    }

    try {
      // Check for complex features that may need manual review
      if (sql.toUpperCase().includes('WITH')) {
        showWarning('CTE detected', 'Query contains WITH clause (CTE). Generated dimensions may need manual adjustment.');
      }

      if (sql.toUpperCase().includes('OVER (')) {
        showWarning('Window functions detected', 'Query contains window functions. Please verify generated dimensions.');
      }

      // Clean up SQL - preserve structure but normalize whitespace
      let cleanSql = sql.trim();
      // Normalize multiple spaces/tabs/newlines to single space
      cleanSql = cleanSql.replace(/\s+/g, ' ');
      
      // Extract table name from FROM clause (only the primary table, ignore JOINs)
      // Match: FROM table or FROM source.schema.table
      const fromMatch = cleanSql.match(/FROM\s+["']?(\w+)["']?\.["']?(\w+)["']?\.["']?(\w+)["']?(?:\s+(?:as\s+)?\w+)?(?:\s+(?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?(?:\s+OUTER)?\s+JOIN|WHERE|GROUP|ORDER|LIMIT|$)/i) ||
                       cleanSql.match(/FROM\s+["']?(\w+)["']?\.["']?(\w+)["']?(?:\s+(?:as\s+)?\w+)?(?:\s+(?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?(?:\s+OUTER)?\s+JOIN|WHERE|GROUP|ORDER|LIMIT|$)/i) ||
                       cleanSql.match(/FROM\s+["']?(\w+)["']?(?:\s+(?:as\s+)?\w+)?(?:\s+(?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?(?:\s+OUTER)?\s+JOIN|WHERE|GROUP|ORDER|LIMIT|$)/i);
      
      let tableName = '';
      let schemaName = 'sandbox';
      let dataSource = 'icebase';
      
      if (fromMatch) {
        if (fromMatch[3]) {
          // Format: source.schema.table
          dataSource = fromMatch[1];
          schemaName = fromMatch[2];
          tableName = fromMatch[3];
        } else if (fromMatch[2]) {
          // Format: schema.table
          schemaName = fromMatch[1];
          tableName = fromMatch[2];
        } else {
          tableName = fromMatch[1];
        }
      }

      if (!tableName) {
        showError('Could not extract table name', 'Unable to parse table name from FROM clause. Please check your SQL syntax.');
        return;
      }

      // Extract columns from SELECT clause only (before FROM)
      const selectMatch = cleanSql.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
      if (!selectMatch) {
        showError('Invalid SELECT query', 'Could not parse SQL query. Please ensure it has SELECT ... FROM structure.');
        return;
      }

      const columnsText = selectMatch[1];
      
      // Split by comma, but be smart about nested functions
      const columnLines: string[] = [];
      let buffer = '';
      let parenDepth = 0;
      
      for (let i = 0; i < columnsText.length; i++) {
        const char = columnsText[i];
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;
        
        if (char === ',' && parenDepth === 0) {
          columnLines.push(buffer.trim());
          buffer = '';
        } else {
          buffer += char;
        }
      }
      if (buffer.trim()) {
        columnLines.push(buffer.trim());
      }
      
      const dimensions: Dimension[] = [];
      
      columnLines.forEach((line) => {
        if (!line || line === '*') return;
        
        let originalLine = line;
        // Remove quotes
        line = line.replace(/["'`]/g, '');
        
        // Handle CAST operations: CAST(col AS type) or col::type
        let castMatch = line.match(/CAST\s*\(\s*(.+?)\s+AS\s+(\w+)\s*\)/i);
        let pgCastMatch = line.match(/(.+?)::([\w\s()]+)(?:\s+(?:as\s+)?(\w+))?$/i);
        
        let sqlExpression = '';
        let columnName = '';
        let inferredType: Dimension['type'] = 'string';
        
        if (castMatch) {
          // Handle: CAST(expression AS type) [AS alias]
          const innerExpr = castMatch[1].trim();
          const castType = castMatch[2].toLowerCase();
          
          // Check if there's an alias after CAST
          const afterCast = line.substring(line.indexOf(')') + 1).trim();
          const aliasMatch = afterCast.match(/(?:as\s+)?(\w+)/i);
          
          sqlExpression = innerExpr;
          columnName = aliasMatch ? aliasMatch[1] : innerExpr.replace(/\W+/g, '_');
          
          // Infer type from CAST type
          if (castType.includes('int') || castType.includes('numeric') || castType.includes('decimal') || castType.includes('float') || castType.includes('double')) {
            inferredType = 'number';
          } else if (castType.includes('timestamp') || castType.includes('datetime') || castType.includes('date')) {
            inferredType = 'time';
          } else if (castType.includes('bool')) {
            inferredType = 'boolean';
          }
        } else if (pgCastMatch) {
          // Handle: expression::type [AS alias]
          sqlExpression = pgCastMatch[1].trim();
          const castType = pgCastMatch[2].toLowerCase();
          columnName = pgCastMatch[3] || sqlExpression.replace(/\W+/g, '_');
          
          if (castType.includes('int') || castType.includes('numeric') || castType.includes('decimal')) {
            inferredType = 'number';
          } else if (castType.includes('timestamp') || castType.includes('date')) {
            inferredType = 'time';
          } else if (castType.includes('bool')) {
            inferredType = 'boolean';
          }
        } else {
          // Handle regular columns with optional functions and aliases
          // Check for "AS alias" or implicit alias
          const aliasMatch = line.match(/^(.+?)\s+(?:as\s+)?(\w+)$/i);
          
          if (aliasMatch && aliasMatch[2].toLowerCase() !== 'from' && !aliasMatch[2].toLowerCase().includes('join')) {
            sqlExpression = aliasMatch[1].trim();
            columnName = aliasMatch[2];
          } else {
            // No alias, extract column name from expression
            sqlExpression = line.trim();
            
            // Try to extract column name from common patterns
            // Remove common SQL functions to get base column
            let baseColumn = sqlExpression;
            
            // Handle functions: TRIM(col), UPPER(col), LOWER(col), COALESCE(col, default), etc.
            const functionMatch = baseColumn.match(/(?:TRIM|UPPER|LOWER|INITCAP|LENGTH|SUBSTR|SUBSTRING|CONCAT|COALESCE|NULLIF|IFNULL|NVL|GREATEST|LEAST)\s*\(\s*(.+?)\s*(?:,.*?)?\)/i);
            if (functionMatch) {
              baseColumn = functionMatch[1];
            }
            
            // Remove table prefixes (table.column or alias.column)
            baseColumn = baseColumn.replace(/^\w+\./, '');
            
            // Clean up to valid identifier
            columnName = baseColumn.replace(/[^\w]/g, '_').replace(/^_+|_+$/g, '') || 'column';
            
            // If expression looks simple, use it as-is
            if (/^\w+$/.test(sqlExpression)) {
              columnName = sqlExpression;
            }
          }
        }

        if (!columnName) return;

        // Infer type from column name if not already inferred from CAST
        if (inferredType === 'string') {
          const lowerName = columnName.toLowerCase();
          const lowerExpr = sqlExpression.toLowerCase();
          
          if (lowerName.includes('date') || lowerName.includes('timestamp') || lowerName === 'timestamp' ||
              lowerExpr.includes('timestamp') || lowerExpr.includes('date') || 
              lowerName.includes('time') || lowerName === 'time') {
            inferredType = 'time';
          } else if (lowerName.includes('count') || lowerName.includes('amount') || 
                     lowerName.includes('price') || lowerName.includes('capacity') ||
                     lowerName.includes('cycle') || lowerName.includes('remaining') ||
                     lowerName.includes('quantity') || lowerName.includes('total') ||
                     lowerExpr.includes('::int') || lowerExpr.includes('::bigint') ||
                     lowerExpr.includes('::numeric')) {
            inferredType = 'number';
          } else if (lowerName.includes('is_') || lowerName.includes('has_') || 
                     lowerName.endsWith('_flag') || lowerName.startsWith('flag_') ||
                     lowerExpr.includes('::bool')) {
            inferredType = 'boolean';
          }
        }

        // Check if it's a potential primary key
        const lowerName = columnName.toLowerCase();
        const isPrimaryKey = lowerName === 'id' || lowerName === 'uuid' || 
                           lowerName.endsWith('_id') || lowerName === `${tableName}_id`;

        // Generate meaningful description based on column patterns
        let description = '';
        if (isPrimaryKey) {
          description = `Unique identifier for ${tableName}`;
        } else if (lowerName.includes('name')) {
          description = `Name of the ${tableName}`;
        } else if (lowerName.includes('date') && !lowerName.includes('update')) {
          description = `Date when ${tableName} was created or recorded`;
        } else if (lowerName.includes('created')) {
          description = `Creation timestamp for ${tableName}`;
        } else if (lowerName.includes('updated') || lowerName.includes('modified')) {
          description = `Last update timestamp for ${tableName}`;
        } else if (lowerName.includes('timestamp')) {
          description = `Timestamp for ${tableName} record`;
        } else if (lowerName.includes('count')) {
          description = `Count value for ${columnName.replace(/_/g, ' ')}`;
        } else if (lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('cost')) {
          description = `Monetary amount for ${columnName.replace(/_/g, ' ')}`;
        } else if (lowerName.includes('status')) {
          description = `Current status of ${tableName}`;
        } else if (lowerName.includes('type')) {
          description = `Type or category of ${tableName}`;
        } else if (lowerName.includes('code')) {
          description = `Code identifier for ${columnName.replace(/_/g, ' ')}`;
        } else if (lowerName.includes('flag') || lowerName.startsWith('is_') || lowerName.startsWith('has_')) {
          description = `Indicates whether ${columnName.replace(/^(is_|has_)|_flag$/g, '').replace(/_/g, ' ')}`;
        } else if (lowerName.includes('description') || lowerName.includes('note')) {
          description = `Detailed description or notes`;
        } else if (lowerName.includes('email')) {
          description = `Email address`;
        } else if (lowerName.includes('phone') || lowerName.includes('mobile')) {
          description = `Contact phone number`;
        } else if (lowerName.includes('address')) {
          description = `Physical address information`;
        } else {
          // Default: format the column name nicely
          description = columnName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        }

        dimensions.push({
          name: columnName,
          description: description,
          type: inferredType,
          sql: sqlExpression,
          primary_key: isPrimaryKey
        });
      });

      if (dimensions.length === 0) {
        showError('No columns found', 'No valid columns found in SELECT clause. Please check your SQL query.');
        return;
      }

      // Create basic measure
      const primaryKeyDim = dimensions.find(d => d.primary_key);
      const measures: Measure[] = [{
        name: `total_${tableName}`,
        description: `Total count of ${tableName} records`,
        type: 'count',
        sql: primaryKeyDim ? primaryKeyDim.name : dimensions[0]?.name || '*'
      }];

      // Add the new table
      const newTable: Table = {
        name: tableName,
        description: `Comprehensive ${tableName} data for business analytics, reporting, and operational insights`,
        data_source: dataSource,
        schema: schemaName,
        dimensions: dimensions,
        measures: measures,
        joins: []
      };

      setConfig(prev => ({
        ...prev,
        source: dataSource,
        tables: [...prev.tables, newTable]
      }));

      setSelectedTable(config.tables.length);
      setSqlInput('');
      setShowSqlParser(false);
      
      showSuccess(
        'SQL parsed successfully!',
        `Generated ${dimensions.length} dimensions and 1 measure for table "${tableName}"`
      );
    } catch (error) {
      console.error('Error parsing SQL:', error);
      showError(
        'Error parsing SQL query',
        error instanceof Error ? error.message : 'Please check the format and try again.'
      );
    }
  };

  // Add new table
  const addTable = () => {
    setConfig(prev => ({
      ...prev,
      tables: [
        ...prev.tables,
        {
          name: '',
          description: '',
          data_source: 'icebase',
          schema: 'sandbox',
          dimensions: [],
          measures: [],
          joins: []
        }
      ]
    }));
    setSelectedTable(config.tables.length);
  };

  // Update table
  const updateTable = (index: number, field: keyof Table, value: string) => {
    setConfig(prev => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === index ? { ...table, [field]: value } : table
      )
    }));
  };

  // Delete table
  const deleteTable = (index: number) => {
    const tableName = config.tables[index]?.name || `Table #${index + 1}`;
    showConfirmation(
      'Delete Table',
      `Are you sure you want to delete "${tableName}"? This action cannot be undone.`,
      () => {
        setConfig(prev => ({
          ...prev,
          tables: prev.tables.filter((_, i) => i !== index)
        }));
        if (selectedTable === index) {
          setSelectedTable(null);
        }
        showSuccess('Table deleted', `"${tableName}" has been removed.`);
      }
    );
  };

  // Add dimension
  const addDimension = (tableIndex: number) => {
    setConfig(prev => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === tableIndex
          ? {
              ...table,
              dimensions: [
                ...table.dimensions,
                { name: '', description: '', type: 'string', sql: '', primary_key: false }
              ]
            }
          : table
      )
    }));
  };

  // Update dimension
  const updateDimension = (
    tableIndex: number,
    dimIndex: number,
    field: keyof Dimension,
    value: string | boolean
  ) => {
    setConfig(prev => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === tableIndex
          ? {
              ...table,
              dimensions: table.dimensions.map((dim, j) =>
                j === dimIndex ? { ...dim, [field]: value } : dim
              )
            }
          : table
      )
    }));
  };

  // Delete dimension
  const deleteDimension = (tableIndex: number, dimIndex: number) => {
    const dimName = config.tables[tableIndex]?.dimensions[dimIndex]?.name || `Dimension #${dimIndex + 1}`;
    showConfirmation(
      'Delete Dimension',
      `Delete "${dimName}"? This cannot be undone.`,
      () => {
        setConfig(prev => ({
          ...prev,
          tables: prev.tables.map((table, i) =>
            i === tableIndex
              ? {
                  ...table,
                  dimensions: table.dimensions.filter((_, j) => j !== dimIndex)
                }
              : table
          )
        }));
        showInfo('Dimension deleted', `"${dimName}" has been removed.`);
      }
    );
  };

  // Add measure
  const addMeasure = (tableIndex: number) => {
    setConfig(prev => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === tableIndex
          ? {
              ...table,
              measures: [
                ...table.measures,
                { name: '', description: '', type: 'count', sql: '' }
              ]
            }
          : table
      )
    }));
  };

  // Update measure
  const updateMeasure = (
    tableIndex: number,
    measureIndex: number,
    field: keyof Measure,
    value: string
  ) => {
    setConfig(prev => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === tableIndex
          ? {
              ...table,
              measures: table.measures.map((measure, j) =>
                j === measureIndex ? { ...measure, [field]: value } : measure
              )
            }
          : table
      )
    }));
  };

  // Delete measure
  const deleteMeasure = (tableIndex: number, measureIndex: number) => {
    const measureName = config.tables[tableIndex]?.measures[measureIndex]?.name || `Measure #${measureIndex + 1}`;
    showConfirmation(
      'Delete Measure',
      `Delete "${measureName}"? This cannot be undone.`,
      () => {
        setConfig(prev => ({
          ...prev,
          tables: prev.tables.map((table, i) =>
            i === tableIndex
              ? {
                  ...table,
                  measures: table.measures.filter((_, j) => j !== measureIndex)
                }
              : table
          )
        }));
        showInfo('Measure deleted', `"${measureName}" has been removed.`);
      }
    );
  };

  // Add join
  const addJoin = (tableIndex: number) => {
    setConfig(prev => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === tableIndex
          ? {
              ...table,
              joins: [
                ...table.joins,
                { name: '', relationship: 'many_to_one', sql: '' }
              ]
            }
          : table
      )
    }));
  };

  // Update join
  const updateJoin = (
    tableIndex: number,
    joinIndex: number,
    field: keyof Join,
    value: string
  ) => {
    setConfig(prev => ({
      ...prev,
      tables: prev.tables.map((table, i) =>
        i === tableIndex
          ? {
              ...table,
              joins: table.joins.map((join, j) =>
                j === joinIndex ? { ...join, [field]: value } : join
              )
            }
          : table
      )
    }));
  };

  // Delete join
  const deleteJoin = (tableIndex: number, joinIndex: number) => {
    const joinName = config.tables[tableIndex]?.joins[joinIndex]?.name || `Join #${joinIndex + 1}`;
    showConfirmation(
      'Delete Join',
      `Delete join to "${joinName}"? This cannot be undone.`,
      () => {
        setConfig(prev => ({
          ...prev,
          tables: prev.tables.map((table, i) =>
            i === tableIndex
              ? {
                  ...table,
                  joins: table.joins.filter((_, j) => j !== joinIndex)
                }
              : table
          )
        }));
        showInfo('Join deleted', `Join to "${joinName}" has been removed.`);
      }
    );
  };

  // Generate SQL file
  const generateSQLFile = (table: Table): string => {
    // Generate column list from dimensions
    const columns = table.dimensions.map(dim => {
      // If SQL expression is different from name, use it with alias
      if (dim.sql && dim.sql !== dim.name) {
        return `  ${dim.sql} as ${dim.name}`;
      }
      // Otherwise just use the column name
      return `  ${dim.name}`;
    }).join(',\n');

    // Build FROM clause - always include full path (data_source.schema.table_name)
    const dataSource = table.data_source || 'icebase';
    const schema = table.schema || 'sandbox';
    const fromClause = `${dataSource}.${schema}.${table.name}`;

    return `SELECT
${columns}
FROM
  ${fromClause}
`;
  };

  // Generate Table YAML file
  const generateTableYAML = (table: Table): string => {
    let yaml = `tables:\n`;
    yaml += `  - name: ${table.name}\n`;
    yaml += `    sql: {{ load_sql('${table.name}') }}\n`;
    yaml += `    description: ${table.description || `Comprehensive ${table.name} data for business analytics, reporting, and operational insights`}\n`;
    yaml += `    data_source: ${table.data_source}\n`;
    yaml += `    public: true\n\n`;

    if (table.joins.length > 0) {
      yaml += `    joins:\n`;
      table.joins.forEach(join => {
        if (join.name && join.sql) {
          yaml += `      - name: ${join.name}\n`;
          yaml += `        relationship: ${join.relationship}\n`;
          yaml += `        sql: "${join.sql}"\n\n`;
        }
      });
    }

    if (table.dimensions.length > 0) {
      yaml += `    dimensions:\n`;
      table.dimensions.forEach(dim => {
        if (dim.name) {
          yaml += `      - name: ${dim.name}\n`;
          yaml += `        description: "${dim.description || `${dim.name} field`}"\n`;
          yaml += `        type: ${dim.type}\n`;
          yaml += `        sql: ${dim.sql || dim.name}\n`;
          if (dim.primary_key) {
            yaml += `        primary_key: true\n`;
          }
          yaml += `\n`;
        }
      });
    }

    if (table.measures.length > 0) {
      yaml += `    measures:\n`;
      table.measures.forEach(measure => {
        if (measure.name) {
          yaml += `      - name: ${measure.name}\n`;
          yaml += `        sql: ${measure.sql || measure.name}\n`;
          yaml += `        type: ${measure.type}\n`;
          yaml += `        description: "${measure.description || `${measure.name} metric`}"\n\n`;
        }
      });
    }

    return yaml;
  };

  // Generate user_groups.yml
  const generateUserGroupsYAML = (): string => {
    return `user_groups:
  - name: default
    api_scopes:
      - meta
      - data
      - graphql
      - jobs
      - source
    includes: "*"
`;
  };

  // Generate deployment.yaml
  const generateDeploymentYAML = (): string => {
    const projectName = config.project_name || 'lens-project';
    return `version: v1alpha
name: ${projectName}
type: lens
tags:
  - lens
description: Lens deployment for ${projectName}
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
    lensBaseDir: ${projectName}/model
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
`;
  };

  // Download as ZIP with comprehensive validation
  const downloadLensPackage = async () => {
    // Comprehensive validation before download
    const validation = validateAllBeforeDownload();
    
    if (!validation.valid) {
      showError(
        'Validation Failed',
        `Please fix the following issues:\n\n${validation.errors.join('\n')}`
      );
      return;
    }

    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const projectName = config.project_name;
      const projectFolder = zip.folder(projectName)!;
      const modelFolder = projectFolder.folder('model')!;
      const sqlsFolder = modelFolder.folder('sqls')!;
      const tablesFolder = modelFolder.folder('tables')!;

      // Generate SQL and Table YAML files for each table
      let filesGenerated = 0;
      config.tables.forEach(table => {
        if (table.name) {
          try {
            sqlsFolder.file(`${table.name}.sql`, generateSQLFile(table));
            tablesFolder.file(`${table.name}.yaml`, generateTableYAML(table));
            filesGenerated += 2;
          } catch (err) {
            console.error(`Error generating files for table ${table.name}:`, err);
            throw new Error(`Failed to generate files for table "${table.name}"`);
          }
        }
      });

      // Add user_groups.yml to model folder
      try {
        modelFolder.file('user_groups.yml', generateUserGroupsYAML());
        filesGenerated++;
      } catch (err) {
        console.error('Error generating user_groups.yml:', err);
        throw new Error('Failed to generate user_groups.yml');
      }

      // Add deployment.yaml to project root (not inside model folder)
      try {
        projectFolder.file('deployment.yaml', generateDeploymentYAML());
        filesGenerated++;
      } catch (err) {
        console.error('Error generating deployment.yaml:', err);
        throw new Error('Failed to generate deployment.yaml');
      }

      // Generate ZIP
      const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}-lens.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

      showSuccess(
        'Package downloaded successfully!',
        `Generated ${filesGenerated} files for ${config.tables.length} table(s)`
      );
    } catch (error) {
      console.error('Error generating ZIP:', error);
      showError(
        'Failed to generate lens package',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Wrapper function for SQL parsing with loading state
  const handleParseSql = async () => {
    if (!sqlInput.trim()) {
      showError('SQL query is empty', 'Please enter a valid SELECT query');
      return;
    }

    setIsParsing(true);
    try {
      // Use setTimeout to allow loading state to render
      await new Promise(resolve => setTimeout(resolve, 100));
      parseSQLQuery(sqlInput);
    } finally {
      setIsParsing(false);
    }
  };

  const isValid = config.project_name.trim() !== '' && config.tables.some(t => t.name.trim() !== '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <a
              href="/data-product-generator"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
            >
              ← Back
            </a>
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Lens Generator
              </h1>
              <p className="text-gray-600 mt-2">
                Build semantic models visually with Lens
              </p>
            </div>
            <div className="w-[100px]"></div>
          </div>
        </header>

        {/* Project Configuration */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Configuration</h2>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={config.project_name}
              onChange={(e) => {
                const value = e.target.value;
                setConfig(prev => ({ ...prev, project_name: value }));
                
                // Show validation error if not empty and invalid
                if (value && !validateProjectName(value).valid) {
                  const validation = validateProjectName(value);
                  if (validation.error) {
                    // Don't show toast on every keystroke, just visual feedback
                  }
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                config.project_name && !validateProjectName(config.project_name).valid
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-purple-500'
              }`}
              placeholder="customer-360"
            />
            {config.project_name && !validateProjectName(config.project_name).valid && (
              <p className="text-xs text-red-600 mt-1">
                {validateProjectName(config.project_name).error}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Data will be sourced from: <span className="font-mono text-purple-600">icebase.sandbox</span>
            </p>
          </div>
        </div>

        {/* SQL Parser - Quick Add */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">
                🚀 Quick Add from SQL
              </h2>
            </div>
            <button
              onClick={() => setShowSqlParser(!showSqlParser)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {showSqlParser ? 'Hide' : 'Show SQL Parser'}
            </button>
          </div>
          
          {showSqlParser && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Paste your SQL SELECT query below and we&apos;ll automatically generate the table structure with dimensions, measures, and proper types!
              </p>
              <textarea
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm bg-white"
                placeholder="SELECT&#10;    uuid,&#10;    CAST(d_id AS varchar) as device_id,&#10;    TRIM(battery_condition) as condition,&#10;    UPPER(battery_status) as status,&#10;    battery_cycle_count::integer as cycles,&#10;    COALESCE(warranty_date, manufacture_date) as warranty,&#10;    timestamp&#10;FROM&#10;    icebase.telemetry.battery b&#10;LEFT JOIN icebase.telemetry.device d ON b.device_id = d.id"
                rows={12}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleParseSql}
                  disabled={!sqlInput.trim() || isParsing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isParsing ? (
                    <>
                      <svg className="animate-spin h-5 w-5 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Parsing...
                    </>
                  ) : (
                    '✨ Parse SQL & Generate Table'
                  )}
                </button>
                <button
                  onClick={() => setSqlInput('')}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <p className="text-xs text-green-800 font-medium mb-2">💡 Enhanced Parser Features:</p>
                <ul className="text-xs text-green-700 space-y-1 ml-4">
                  <li>✓ <strong>Multi-table joins</strong>: Extracts only SELECT columns, ignores JOIN tables</li>
                  <li>✓ <strong>CAST operations</strong>: <code className="bg-white px-1 rounded">CAST(col AS type)</code> or <code className="bg-white px-1 rounded">col::type</code></li>
                  <li>✓ <strong>Data cleaning</strong>: TRIM, UPPER, LOWER, COALESCE, NULLIF, etc.</li>
                  <li>✓ <strong>Smart type inference</strong>: From CAST, column names, and expressions</li>
                  <li>✓ <strong>Column aliases</strong>: <code className="bg-white px-1 rounded">col AS alias</code> or implicit aliases</li>
                  <li>✓ <strong>Nested functions</strong>: Properly splits complex SELECT with commas inside functions</li>
                  <li>✓ <strong>Auto-identifies PKs</strong>: uuid, id, *_id patterns</li>
                  <li>✓ <strong>Table prefixes</strong>: Removes <code className="bg-white px-1 rounded">table.column</code> to get clean names</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Tables List */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Tables</h2>
                <button
                  onClick={addTable}
                  className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm text-sm"
                >
                  + Add
                </button>
              </div>

              <div className="space-y-2">
                {config.tables.map((table, index) => (
                  <div
                    key={index}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTable === index
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedTable(index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={table.name}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateTable(index, 'name', e.target.value);
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        placeholder="Table name"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTable(index);
                        }}
                        className="ml-2 px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-600">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {table.dimensions.length} dims
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                        {table.measures.length} measures
                      </span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {table.joins.length} joins
                      </span>
                    </div>
                  </div>
                ))}

                {config.tables.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 mb-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <p className="text-sm">No tables yet</p>
                    <p className="text-xs mt-1">Click &quot;Add&quot; to create one</p>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Table Info */}
            {selectedTable !== null && config.tables[selectedTable] && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Selected: {config.tables[selectedTable].name || 'Unnamed'}
                </h3>
                <div className="space-y-2 text-xs text-blue-800">
                  <div className="flex items-center justify-between bg-white bg-opacity-50 rounded px-3 py-2">
                    <span className="font-medium">SQL Path:</span>
                    <span className="text-blue-900 font-mono">icebase.sandbox.{config.tables[selectedTable].name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="bg-blue-100 rounded px-2 py-1.5 text-center">
                      <div className="font-bold text-blue-900">{config.tables[selectedTable].dimensions.length}</div>
                      <div className="text-blue-700">Dimensions</div>
                    </div>
                    <div className="bg-green-100 rounded px-2 py-1.5 text-center">
                      <div className="font-bold text-green-900">{config.tables[selectedTable].measures.length}</div>
                      <div className="text-green-700">Measures</div>
                    </div>
                    <div className="bg-purple-100 rounded px-2 py-1.5 text-center">
                      <div className="font-bold text-purple-900">{config.tables[selectedTable].joins.length}</div>
                      <div className="text-purple-700">Joins</div>
                    </div>
                  </div>
                  {config.tables[selectedTable].dimensions.some(d => d.primary_key) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-2">
                      <span className="font-medium text-yellow-800">Primary Key: </span>
                      <span className="text-yellow-900 font-mono text-xs">
                        {config.tables[selectedTable].dimensions.find(d => d.primary_key)?.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <button
                onClick={downloadLensPackage}
                disabled={!isValid || isDownloading}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download Lens Package
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Generates SQL + YAML files in a ZIP
              </p>
            </div>
          </div>

          {/* Middle & Right Panel - Table Configuration */}
          {selectedTable !== null && config.tables[selectedTable] && (
            <div className="lg:col-span-2 space-y-6">
              {/* Table Details */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Table: {config.tables[selectedTable].name || 'Unnamed'}
                </h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={config.tables[selectedTable].description}
                    onChange={(e) =>
                      updateTable(selectedTable, 'description', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Table description"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    SQL will be generated from: <span className="font-mono text-purple-600">icebase.sandbox.{config.tables[selectedTable].name}</span>
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setActiveTab('dimensions')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                      activeTab === 'dimensions'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Dimensions ({config.tables[selectedTable].dimensions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('measures')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                      activeTab === 'measures'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Measures ({config.tables[selectedTable].measures.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('joins')}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                      activeTab === 'joins'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Joins ({config.tables[selectedTable].joins.length})
                  </button>
                </div>

                {/* Dimensions Tab */}
                {activeTab === 'dimensions' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600">
                        Define columns and attributes for this table
                      </p>
                      <button
                        onClick={() => addDimension(selectedTable)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        + Add Dimension
                      </button>
                    </div>

                    <div className="space-y-4">
                      {config.tables[selectedTable].dimensions.map((dim, dimIndex) => (
                        <div key={dimIndex} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <input
                              type="text"
                              value={dim.name}
                              onChange={(e) =>
                                updateDimension(selectedTable, dimIndex, 'name', e.target.value)
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Name (e.g., customer_id)"
                            />
                            <div className="flex gap-2">
                              <select
                                value={dim.type}
                                onChange={(e) =>
                                  updateDimension(selectedTable, dimIndex, 'type', e.target.value)
                                }
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="string">string</option>
                                <option value="number">number</option>
                                <option value="time">time</option>
                                <option value="boolean">boolean</option>
                              </select>
                              <label className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-md">
                                <input
                                  type="checkbox"
                                  checked={dim.primary_key}
                                  onChange={(e) =>
                                    updateDimension(
                                      selectedTable,
                                      dimIndex,
                                      'primary_key',
                                      e.target.checked
                                    )
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm font-medium">PK</span>
                              </label>
                              <button
                                onClick={() => deleteDimension(selectedTable, dimIndex)}
                                className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={dim.description}
                            onChange={(e) =>
                              updateDimension(selectedTable, dimIndex, 'description', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                            placeholder="Description"
                          />
                          <input
                            type="text"
                            value={dim.sql}
                            onChange={(e) =>
                              updateDimension(selectedTable, dimIndex, 'sql', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="SQL expression (defaults to column name)"
                          />
                        </div>
                      ))}

                      {config.tables[selectedTable].dimensions.length === 0 && (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          <p className="text-sm">No dimensions yet</p>
                          <p className="text-xs mt-1">Add columns to your table</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Measures Tab */}
                {activeTab === 'measures' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600">
                        Define aggregations and metrics
                      </p>
                      <button
                        onClick={() => addMeasure(selectedTable)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        + Add Measure
                      </button>
                    </div>

                    <div className="space-y-4">
                      {config.tables[selectedTable].measures.map((measure, measureIndex) => (
                        <div key={measureIndex} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <input
                              type="text"
                              value={measure.name}
                              onChange={(e) =>
                                updateMeasure(selectedTable, measureIndex, 'name', e.target.value)
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder="Name (e.g., total_sales)"
                            />
                            <div className="flex gap-2">
                              <select
                                value={measure.type}
                                onChange={(e) =>
                                  updateMeasure(selectedTable, measureIndex, 'type', e.target.value)
                                }
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="count">count</option>
                                <option value="count_distinct">count_distinct</option>
                                <option value="sum">sum</option>
                                <option value="avg">avg</option>
                                <option value="min">min</option>
                                <option value="max">max</option>
                              </select>
                              <button
                                onClick={() => deleteMeasure(selectedTable, measureIndex)}
                                className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={measure.description}
                            onChange={(e) =>
                              updateMeasure(selectedTable, measureIndex, 'description', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
                            placeholder="Description"
                          />
                          <input
                            type="text"
                            value={measure.sql}
                            onChange={(e) =>
                              updateMeasure(selectedTable, measureIndex, 'sql', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                            placeholder="SQL expression (e.g., sales_amount)"
                          />
                        </div>
                      ))}

                      {config.tables[selectedTable].measures.length === 0 && (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          <p className="text-sm">No measures yet</p>
                          <p className="text-xs mt-1">Add metrics to your table</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Joins Tab */}
                {activeTab === 'joins' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600">
                        Define relationships with other tables
                      </p>
                      <button
                        onClick={() => addJoin(selectedTable)}
                        className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        + Add Join
                      </button>
                    </div>

                    <div className="space-y-4">
                      {config.tables[selectedTable].joins.map((join, joinIndex) => (
                        <div key={joinIndex} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="relative">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Target Table
                              </label>
                              {config.tables.length > 1 ? (
                                <div className="flex gap-2">
                                  <select
                                    value={join.name}
                                    onChange={(e) =>
                                      updateJoin(selectedTable, joinIndex, 'name', e.target.value)
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                  >
                                    <option value="">-- Select Table --</option>
                                    {config.tables.map((table, idx) => 
                                      idx !== selectedTable && table.name ? (
                                        <option key={idx} value={table.name}>
                                          {table.name}
                                        </option>
                                      ) : null
                                    )}
                                  </select>
                                  <input
                                    type="text"
                                    value={join.name}
                                    onChange={(e) =>
                                      updateJoin(selectedTable, joinIndex, 'name', e.target.value)
                                    }
                                    className="w-24 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                                    placeholder="Or type..."
                                  />
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={join.name}
                                  onChange={(e) =>
                                    updateJoin(selectedTable, joinIndex, 'name', e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="Target table name"
                                />
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Relationship
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={join.relationship}
                                  onChange={(e) =>
                                    updateJoin(selectedTable, joinIndex, 'relationship', e.target.value)
                                  }
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  <option value="one_to_one">1:1 (one to one)</option>
                                  <option value="one_to_many">1:N (one to many)</option>
                                  <option value="many_to_one">N:1 (many to one)</option>
                                  <option value="many_to_many">N:M (many to many)</option>
                                </select>
                                <button
                                  onClick={() => deleteJoin(selectedTable, joinIndex)}
                                  className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md"
                                  title="Delete join"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Join Condition
                            </label>
                            
                            {/* Column Dropdowns for Join */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Current Table Column</label>
                                <select
                                  value={join.sql.match(/\{TABLE\.([^}]+)\}/)?.[1] || ''}
                                  onChange={(e) => {
                                    const currentCol = e.target.value;
                                    if (!currentCol) return;
                                    
                                    // Try to extract existing target column or use first available
                                    const targetCol = join.sql.match(/\{[^}]*\.([^}]+)\}$/)?.[1] || '';
                                    const finalTargetCol = targetCol || (join.name && config.tables.find(t => t.name === join.name)?.dimensions[0]?.name) || '';
                                    
                                    if (finalTargetCol) {
                                      updateJoin(selectedTable, joinIndex, 'sql', 
                                        `{TABLE.${currentCol}} = {${join.name || 'target'}.${finalTargetCol}}`
                                      );
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                >
                                  <option value="">-- Select Column --</option>
                                  {config.tables[selectedTable].dimensions.map((dim, idx) => (
                                    <option key={idx} value={dim.name}>
                                      {dim.name} {dim.primary_key ? '🔑' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              <div className="flex items-center justify-center pt-6">
                                <span className="text-purple-600 font-bold text-lg">=</span>
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Target Table Column</label>
                                <select
                                  value={join.sql.match(/\{[^}]*\.([^}]+)\}$/)?.[1] || ''}
                                  onChange={(e) => {
                                    const targetCol = e.target.value;
                                    if (!targetCol) return;
                                    
                                    // Try to extract existing current column or use first available
                                    const currentCol = join.sql.match(/\{TABLE\.([^}]+)\}/)?.[1] || config.tables[selectedTable].dimensions[0]?.name || '';
                                    
                                    if (currentCol) {
                                      updateJoin(selectedTable, joinIndex, 'sql', 
                                        `{TABLE.${currentCol}} = {${join.name || 'target'}.${targetCol}}`
                                      );
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                  disabled={!join.name}
                                >
                                  <option value="">-- Select Column --</option>
                                  {join.name && config.tables.find(t => t.name === join.name)?.dimensions.map((dim, idx) => (
                                    <option key={idx} value={dim.name}>
                                      {dim.name} {dim.primary_key ? '🔑' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            {/* Manual SQL Input */}
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Edit SQL Manually (based on dropdown selection)
                              </label>
                              <input
                                type="text"
                                value={join.sql}
                                onChange={(e) =>
                                  updateJoin(selectedTable, joinIndex, 'sql', e.target.value)
                                }
                                className="w-full px-3 py-2 border-2 border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm bg-white"
                                placeholder={`{TABLE.${config.tables[selectedTable].name}_id} = {${join.name || 'target'}.${join.name || 'target'}_id}`}
                              />
                              <p className="text-xs text-purple-600 mt-1 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                {join.sql ? 'You can edit this SQL condition directly' : 'Use dropdowns above to generate SQL, then edit as needed'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {config.tables[selectedTable].joins.length === 0 && (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          <p className="text-sm">No joins yet</p>
                          <p className="text-xs mt-1">Connect tables with relationships</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Tips */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Quick Tips
                </h3>
                <ul className="text-xs text-blue-800 space-y-2">
                  <li>• <strong>Dimensions</strong>: Columns for filtering and grouping (customer_id, name, created_at)</li>
                  <li>• <strong>Measures</strong>: Aggregated metrics (count, sum, avg) for analysis</li>
                  <li>• <strong>Joins</strong>: Define relationships between tables using SQL expressions</li>
                  <li>• <strong>Primary Key</strong>: Mark unique identifier column (one per table)</li>
                  <li>• <strong>Types</strong>: string (text), number (numeric), time (dates/timestamps), boolean (true/false)</li>
                  <li>• Use <code className="bg-white px-1 rounded">{'{TABLE.column}'}</code> for current table, <code className="bg-white px-1 rounded">{'{target.column}'}</code> for target in joins</li>
                </ul>
              </div>
            </div>
          )}

          {selectedTable === null && (
            <div className="lg:col-span-2 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg
                  className="mx-auto h-24 w-24 text-gray-300 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-lg font-medium">Select a table to configure</p>
                <p className="text-sm mt-2">or create a new one to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmation}
      />
    </div>
  );
}
