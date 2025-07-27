'use client';

import { useState } from 'react';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';

interface ConfigPreviewProps {
  config: any;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export default function ConfigPreview({ config, isVisible, onToggleVisibility }: ConfigPreviewProps) {
  const [copied, setCopied] = useState(false);

  const yamlConfig = `logical_model: ${config.logicalModel || 'analytics'}
source: ${config.source || 'icebase'}
schema: ${config.schema || 'retail'}

# Entity definitions with columns and types
entities:
${config.entities?.map((entity: any) => `  ${entity.name}:
    dimensions:
${entity.dimensions?.map((dim: any) => `      - name: ${dim.name}
        type: ${dim.type}${dim.primary_key ? '\n        primary_key: true' : ''}`).join('\n') || ''}
${entity.joins && entity.joins.length > 0 ? `
    joins:
${entity.joins.map((join: any) => `      - name: ${join.name || join.targetTable || 'join'}
        relationship: ${join.relationship}
        sql: "${join.sql || ''}"`).join('\n')}` : ''}`).join('\n\n') || ''}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(yamlConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (!isVisible) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Configuration Preview</h3>
          <button
            onClick={onToggleVisibility}
            className="text-gray-500 hover:text-gray-700"
          >
            <Eye className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Configuration Preview</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={onToggleVisibility}
              className="text-gray-500 hover:text-gray-700"
            >
              <EyeOff className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto text-sm font-mono text-gray-800 whitespace-pre-wrap">
          {yamlConfig}
        </pre>
      </div>
    </div>
  );
} 