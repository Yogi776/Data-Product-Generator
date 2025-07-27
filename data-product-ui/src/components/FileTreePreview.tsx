'use client';

import { useState } from 'react';
import { DataProduct, FileStructure } from '@/types/dataProduct';

interface FileTreePreviewProps {
  dataProducts: DataProduct[];
}

interface TreeNodeProps {
  node: FileStructure;
  level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const indent = level * 16;

  const toggleExpanded = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    }
  };

  const getIcon = () => {
    if (node.type === 'directory') {
      return isExpanded ? (
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 hover:bg-gray-50 cursor-pointer ${
          node.type === 'directory' ? 'font-medium' : 'font-normal'
        }`}
        style={{ paddingLeft: `${indent}px` }}
        onClick={toggleExpanded}
      >
        <span className="mr-2">{getIcon()}</span>
        <span className={`${node.type === 'directory' ? 'text-blue-600' : 'text-gray-700'}`}>
          {node.name}
        </span>
      </div>
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTreePreview({ dataProducts }: FileTreePreviewProps) {
  const generateFileStructure = (): FileStructure[] => {
    if (dataProducts.length === 0) {
      return [];
    }

    return dataProducts.map(product => ({
      name: product.entity,
      type: 'directory' as const,
      path: `/${product.entity}`,
      children: [
        {
          name: 'build',
          type: 'directory' as const,
          path: `/${product.entity}/build`,
          children: [
            {
              name: 'data-processing',
              type: 'directory' as const,
              path: `/${product.entity}/build/data-processing`,
              children: [
                {
                  name: `config-${product.entity}-flare.yaml`,
                  type: 'file' as const,
                  path: `/${product.entity}/build/data-processing/config-${product.entity}-flare.yaml`
                }
              ]
            },
            {
              name: 'quality',
              type: 'directory' as const,
              path: `/${product.entity}/build/quality`,
              children: [
                {
                  name: `config-${product.entity}-quality.yaml`,
                  type: 'file' as const,
                  path: `/${product.entity}/build/quality/config-${product.entity}-quality.yaml`
                }
              ]
            }
          ]
        },
        {
          name: 'deploy',
          type: 'directory' as const,
          path: `/${product.entity}/deploy`,
          children: [
            {
              name: `config-${product.entity}-scanner.yaml`,
              type: 'file' as const,
              path: `/${product.entity}/deploy/config-${product.entity}-scanner.yaml`
            },
            {
              name: `config-${product.entity}-bundle.yaml`,
              type: 'file' as const,
              path: `/${product.entity}/deploy/config-${product.entity}-bundle.yaml`
            },
            {
              name: `config-${product.entity}-dp.yaml`,
              type: 'file' as const,
              path: `/${product.entity}/deploy/config-${product.entity}-dp.yaml`
            },
            {
              name: 'pipeline.yaml',
              type: 'file' as const,
              path: `/${product.entity}/deploy/pipeline.yaml`
            }
          ]
        }
      ]
    }));
  };

  const fileStructure = generateFileStructure();

  if (dataProducts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-gray-500">No data products created yet</p>
        <p className="text-sm text-gray-400">Create a data product to see the file structure</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <div className="space-y-1">
        {fileStructure.map((node, index) => (
          <TreeNode key={index} node={node} level={0} />
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-2">Generated Structure:</p>
          <ul className="space-y-1 text-xs">
            <li>• <code className="bg-gray-200 px-1 rounded">build/</code> - Data processing and quality configurations</li>
            <li>• <code className="bg-gray-200 px-1 rounded">deploy/</code> - Deployment and pipeline configurations</li>
            <li>• <code className="bg-gray-200 px-1 rounded">*.yaml</code> - Configuration files for each component</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 