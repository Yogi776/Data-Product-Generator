export interface DataProduct {
  name: string;
  entity: string;
  createdAt: Date;
}

export interface FileStructure {
  name: string;
  type: 'directory' | 'file';
  children?: FileStructure[];
  path: string;
} 