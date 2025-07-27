'use client';

import { useState, useEffect } from 'react';
import { DataProduct } from '@/types/dataProduct';

interface DataProductFormProps {
  onAddProduct: (product: DataProduct) => void;
  existingEntities: string[];
  initialData?: { name: string; entity: string };
  onFormReset?: () => void;
}

export default function DataProductForm({ 
  onAddProduct, 
  existingEntities, 
  initialData = { name: '', entity: '' },
  onFormReset 
}: DataProductFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [entityInputs, setEntityInputs] = useState(['']); // Array of entity input values
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Data Product Name is required';
    }

    // Check if at least one entity is provided
    const validEntities = entityInputs.filter(input => input.trim() !== '');
    if (validEntities.length === 0) {
      newErrors.entities = 'At least one entity is required';
    } else {
      // Check for duplicates among new inputs
      const duplicates = validEntities.filter((entity, index) => 
        validEntities.indexOf(entity) !== index
      );
      if (duplicates.length > 0) {
        newErrors.entities = `Duplicate entities found: ${duplicates.join(', ')}`;
      } else {
        // Check for duplicates with existing entities
        const existingDuplicates = validEntities.filter(entity => 
          existingEntities.includes(entity.toLowerCase())
        );
        if (existingDuplicates.length > 0) {
          newErrors.entities = `Entities already exist: ${existingDuplicates.join(', ')}`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Handle multiple entities
      const entities = entityInputs.filter(input => input.trim() !== '').map(e => e.trim());
      for (const entity of entities) {
        const newProduct: DataProduct = {
          name: formData.name,
          entity: entity.toLowerCase(),
          createdAt: new Date()
        };
        onAddProduct(newProduct);
      }
      
      // Reset form
      const resetData = { name: '', entity: '' };
      setFormData(resetData);
      setEntityInputs(['']);
      setErrors({});
      
      // Notify parent component about form reset
      if (onFormReset) {
        onFormReset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('entity-')) {
      const index = parseInt(name.split('-')[1]);
      const newInputs = [...entityInputs];
      newInputs[index] = value;
      setEntityInputs(newInputs);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name] || errors.entities) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        delete newErrors.entities;
        return newErrors;
      });
    }
  };

  const addEntityInput = () => {
    setEntityInputs([...entityInputs, '']);
  };

  const removeEntityInput = (index: number) => {
    if (entityInputs.length > 1) {
      const newInputs = entityInputs.filter((_, i) => i !== index);
      setEntityInputs(newInputs);
    }
  };

  const clearForm = () => {
    setFormData({ name: '', entity: '' });
    setEntityInputs(['']);
    setErrors({});
    if (onFormReset) {
      onFormReset();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Create Source Aligned Data Product
        </h2>
        <button
          onClick={clearForm}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 2a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              Define a Use Case *
            </div>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Customer Analytics"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            required
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Entities *
              </div>
            </label>
            <button
              type="button"
              onClick={addEntityInput}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Entity
            </button>
          </div>
          
          <div className="space-y-3">
            {entityInputs.map((input, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    name={`entity-${index}`}
                    value={input}
                    onChange={handleChange}
                    placeholder={`Entity ${index + 1} (e.g., customer)`}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                      errors.entities ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  />
                </div>
                {entityInputs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntityInput(index)}
                    className="flex items-center justify-center w-10 h-12 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {errors.entities && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.entities}
            </p>
          )}
          
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Add one entity per input field. Example: customer, product, order. Click "Add Entity" to add more fields.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create Data Products
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={clearForm}
            className="px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
} 