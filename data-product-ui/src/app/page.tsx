'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import DataProductForm from '@/components/DataProductForm';
import FileTreePreview from '@/components/FileTreePreview';
import { DataProduct } from '@/types/dataProduct';
import { generateYamlFiles } from '@/utils/yamlGenerator';

export default function Home() {
  const [dataProducts, setDataProducts] = useState<DataProduct[]>([]);
  const [formData, setFormData] = useState({ name: '', entity: '' });
  const [isDownloading, setIsDownloading] = useState(false);

  const handleAddDataProduct = (product: DataProduct) => {
    setDataProducts(prev => [...prev, product]);
  };

  const handleRemoveDataProduct = (index: number) => {
    setDataProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddToForm = (product: DataProduct) => {
    setFormData({
      name: product.name,
      entity: product.entity
    });
  };

  const handleDownloadYamlFiles = async () => {
    if (dataProducts.length === 0) {
      alert('No data products to download');
      return;
    }

    setIsDownloading(true);

    try {
      // Create a zip file with all YAML files
      const zip = new JSZip();

      dataProducts.forEach(product => {
        const files = generateYamlFiles(product);
        files.forEach(file => {
          zip.file(file.path, file.content);
        });
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'data-product-yaml-files.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearAll = () => {
    if (dataProducts.length === 0) return;
    
    if (confirm(`Are you sure you want to remove all ${dataProducts.length} data products?`)) {
      setDataProducts([]);
    }
  };

  const existingEntities = dataProducts.map(product => product.entity);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Data Product Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Building seamless Data Products to solve business problems
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <DataProductForm 
              onAddProduct={handleAddDataProduct} 
              existingEntities={existingEntities}
              initialData={formData}
              onFormReset={() => setFormData({ name: '', entity: '' })}
            />
            
            {/* Existing Data Products */}
            {dataProducts.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Existing Data Products ({dataProducts.length})
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadYamlFiles}
                      disabled={isDownloading}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Download YAML
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {dataProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 2a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">{product.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({product.entity})</span>
                          <p className="text-xs text-gray-400 mt-1">
                            Created {product.createdAt.toLocaleDateString()} at {product.createdAt.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddToForm(product)}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors text-xs font-medium"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add
                        </button>
                        <button
                          onClick={() => handleRemoveDataProduct(index)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors text-xs font-medium"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - File Tree Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">
                Generated File Structure
              </h3>
            </div>
            <FileTreePreview dataProducts={dataProducts} />
          </div>
        </div>
      </div>
    </div>
  );
}
