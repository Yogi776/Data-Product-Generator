export type SourceType = 'snowflake' | 'postgres' | 's3' | 'bigquery' | 'other';

export interface DataProduct {
  name: string;
  entity: string;
  entities?: string[]; // For multiple entities in consumer-aligned products
  type: 'source' | 'consumer';
  createdAt: Date;
  // Optional per-source metadata
  sourceTypes?: SourceType[];
  semanticEntities?: string[];
  // Infra knobs (optional)
  depotName?: string;
  depotType?: string;
  clusterName?: string;
  scannerName?: string;
  depots?: Array<{
    name: string;
    type: string;
    secretName?: string;
  }>;
  scanners?: Array<{
    name: string;
    depot: string;
    includePattern?: string;
  }>;
  secretType?: string; // kept for backward compatibility
}

export interface FileStructure {
  name: string;
  type: 'directory' | 'file';
  children?: FileStructure[];
  path: string;
} 