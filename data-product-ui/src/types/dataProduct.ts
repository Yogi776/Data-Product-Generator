export interface DataProduct {
  name: string;
  entity: string;
  entities?: string[]; // For multiple entities in consumer-aligned products
  type: 'source' | 'consumer';
  createdAt: Date;
}

export interface FileStructure {
  name: string;
  type: 'directory' | 'file';
  children?: FileStructure[];
  path: string;
} 