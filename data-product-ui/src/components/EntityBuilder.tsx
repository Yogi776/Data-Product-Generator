'use client';

import { useState } from 'react';
import { Plus, Trash2, Database, Link } from 'lucide-react';

interface Dimension {
  name: string;
  type: string;
  primary_key?: boolean;
  description?: string;
}

interface Join {
  name: string;
  relationship: string;
  sql: string;
  sourceTable?: string;
  targetTable?: string;
  sourceColumn?: string;
  targetColumn?: string;
}

interface Entity {
  name: string;
  dimensions: Dimension[];
  joins?: Join[];
}

interface EntityBuilderProps {
  entities: Entity[];
  onEntitiesChange: (entities: Entity[]) => void;
}

export default function EntityBuilder({ entities, onEntitiesChange }: EntityBuilderProps) {
  const [activeEntity, setActiveEntity] = useState<string | null>(null);

  const addEntity = () => {
    const newEntity: Entity = {
      name: '',
      dimensions: [],
    };
    onEntitiesChange([...entities, newEntity]);
    setActiveEntity(`entity-${entities.length}`);
  };

  const updateEntity = (index: number, field: keyof Entity, value: any) => {
    const updatedEntities = [...entities];
    updatedEntities[index] = { ...updatedEntities[index], [field]: value };
    onEntitiesChange(updatedEntities);
  };

  const removeEntity = (index: number) => {
    const updatedEntities = entities.filter((_, i) => i !== index);
    onEntitiesChange(updatedEntities);
    if (activeEntity === `entity-${index}`) {
      setActiveEntity(null);
    }
  };

  const addDimension = (entityIndex: number) => {
    const newDimension: Dimension = {
      name: '',
      type: 'string',
    };
    const updatedEntities = [...entities];
    updatedEntities[entityIndex].dimensions.push(newDimension);
    onEntitiesChange(updatedEntities);
  };

  const updateDimension = (entityIndex: number, dimensionIndex: number, field: keyof Dimension, value: any) => {
    const updatedEntities = [...entities];
    updatedEntities[entityIndex].dimensions[dimensionIndex] = {
      ...updatedEntities[entityIndex].dimensions[dimensionIndex],
      [field]: value,
    };
    onEntitiesChange(updatedEntities);
  };

  const removeDimension = (entityIndex: number, dimensionIndex: number) => {
    const updatedEntities = [...entities];
    updatedEntities[entityIndex].dimensions.splice(dimensionIndex, 1);
    onEntitiesChange(updatedEntities);
  };

  const addJoin = (entityIndex: number) => {
    const newJoin: Join = {
      name: '',
      relationship: 'many_to_one',
      sql: '',
      sourceTable: entities[entityIndex].name,
      targetTable: '',
      sourceColumn: '',
      targetColumn: '',
    };
    const updatedEntities = [...entities];
    if (!updatedEntities[entityIndex].joins) {
      updatedEntities[entityIndex].joins = [];
    }
    updatedEntities[entityIndex].joins!.push(newJoin);
    onEntitiesChange(updatedEntities);
  };

  const updateJoin = (entityIndex: number, joinIndex: number, field: keyof Join, value: string) => {
    const updatedEntities = [...entities];
    const currentJoin = updatedEntities[entityIndex].joins![joinIndex];
    
    updatedEntities[entityIndex].joins![joinIndex] = {
      ...currentJoin,
      [field]: value,
    };

    // Auto-generate SQL and name based on selections
    const updatedJoin = updatedEntities[entityIndex].joins![joinIndex];
    
    // Update join name when target table is selected
    if (field === 'targetTable' && value) {
      updatedJoin.name = value;
    }
    
    // Generate SQL based on available information
    if (updatedJoin.sourceTable && updatedJoin.targetTable) {
      if (updatedJoin.sourceColumn && updatedJoin.targetColumn) {
        // Full join with both columns
        updatedJoin.sql = `{${updatedJoin.sourceTable}.${updatedJoin.sourceColumn}} = {${updatedJoin.targetTable}.${updatedJoin.targetColumn}}`;
      } else if (updatedJoin.sourceColumn) {
        // Partial join with only source column - use target's primary key
        const targetPrimaryKey = getPrimaryKeyColumn(updatedJoin.targetTable);
        updatedJoin.sql = `{${updatedJoin.sourceTable}.${updatedJoin.sourceColumn}} = {${updatedJoin.targetTable}.${targetPrimaryKey}}`;
      } else if (updatedJoin.targetColumn) {
        // Partial join with only target column - use source's primary key
        const sourcePrimaryKey = getPrimaryKeyColumn(updatedJoin.sourceTable);
        updatedJoin.sql = `{${updatedJoin.sourceTable}.${sourcePrimaryKey}} = {${updatedJoin.targetTable}.${updatedJoin.targetColumn}}`;
      } else {
        // Basic join with primary keys
        const sourcePrimaryKey = getPrimaryKeyColumn(updatedJoin.sourceTable);
        const targetPrimaryKey = getPrimaryKeyColumn(updatedJoin.targetTable);
        updatedJoin.sql = `{${updatedJoin.sourceTable}.${sourcePrimaryKey}} = {${updatedJoin.targetTable}.${targetPrimaryKey}}`;
      }
    }

    onEntitiesChange(updatedEntities);
  };

  const removeJoin = (entityIndex: number, joinIndex: number) => {
    const updatedEntities = [...entities];
    updatedEntities[entityIndex].joins!.splice(joinIndex, 1);
    onEntitiesChange(updatedEntities);
  };

  // Helper function to get primary key column for an entity
  const getPrimaryKeyColumn = (entityName: string): string => {
    const entity = entities.find(e => e.name === entityName);
    if (entity) {
      const primaryKeyDim = entity.dimensions.find(dim => dim.primary_key);
      if (primaryKeyDim) {
        return primaryKeyDim.name;
      }
      // Fallback to entity_id pattern
      return `${entityName}_id`;
    }
    return `${entityName}_id`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Entities</h3>
        <button
          type="button"
          onClick={addEntity}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Entity
        </button>
      </div>

      {entities.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No entities defined</p>
          <p className="text-sm text-gray-400">Add your first entity to get started</p>
        </div>
      )}

      {entities.map((entity, entityIndex) => (
        <div key={entityIndex} className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={entity.name}
                  onChange={(e) => updateEntity(entityIndex, 'name', e.target.value)}
                  placeholder="Entity name (e.g., customer, product)"
                  className="text-lg font-medium text-gray-900 border-none focus:outline-none focus:ring-0"
                />
              </div>
              <button
                type="button"
                onClick={() => removeEntity(entityIndex)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Dimensions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Dimensions</h4>
                <button
                  type="button"
                  onClick={() => addDimension(entityIndex)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add Dimension
                </button>
              </div>

              {entity.dimensions.length === 0 && (
                <p className="text-sm text-gray-500 italic">No dimensions defined</p>
              )}

              {entity.dimensions.map((dimension, dimensionIndex) => (
                <div key={dimensionIndex} className="grid grid-cols-12 gap-3 mb-3 p-3 bg-gray-50 rounded-md">
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={dimension.name}
                      onChange={(e) => updateDimension(entityIndex, dimensionIndex, 'name', e.target.value)}
                      placeholder="Column name"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={dimension.type}
                      onChange={(e) => updateDimension(entityIndex, dimensionIndex, 'type', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                      <option value="timestamp">Timestamp</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={dimension.primary_key || false}
                        onChange={(e) => updateDimension(entityIndex, dimensionIndex, 'primary_key', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Primary Key</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => removeDimension(entityIndex, dimensionIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Joins */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Joins</h4>
                <button
                  type="button"
                  onClick={() => addJoin(entityIndex)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  <Link className="h-4 w-4 inline mr-1" />
                  Add Join
                </button>
              </div>

              {(!entity.joins || entity.joins.length === 0) && (
                <p className="text-sm text-gray-500 italic">No joins defined</p>
              )}

              {entity.joins?.map((join, joinIndex) => (
                <div key={joinIndex} className="space-y-3 mb-4 p-4 bg-gray-50 rounded-md">
                  {/* Join Header */}
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-700">Join #{joinIndex + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeJoin(entityIndex, joinIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Table Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Source Table</label>
                      <input
                        type="text"
                        value={join.sourceTable || ''}
                        disabled
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Target Table</label>
                      <select
                        value={join.targetTable || ''}
                        onChange={(e) => updateJoin(entityIndex, joinIndex, 'targetTable', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select table...</option>
                        {entities.map((otherEntity, idx) => 
                          idx !== entityIndex && (
                            <option key={idx} value={otherEntity.name}>
                              {otherEntity.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Column Selection */}
                  {join.targetTable && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Source Column</label>
                        <select
                          value={join.sourceColumn || ''}
                          onChange={(e) => updateJoin(entityIndex, joinIndex, 'sourceColumn', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select column...</option>
                          {entity.dimensions.map((dim, dimIdx) => (
                            <option key={dimIdx} value={dim.name}>
                              {dim.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Target Column</label>
                        <select
                          value={join.targetColumn || ''}
                          onChange={(e) => updateJoin(entityIndex, joinIndex, 'targetColumn', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select column...</option>
                          {entities.find(e => e.name === join.targetTable)?.dimensions.map((dim, dimIdx) => (
                            <option key={dimIdx} value={dim.name}>
                              {dim.name}
                            </option>
                          )) || []}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Relationship Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Relationship Type</label>
                    <select
                      value={join.relationship}
                      onChange={(e) => updateJoin(entityIndex, joinIndex, 'relationship', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="many_to_one">Many to One</option>
                      <option value="one_to_many">One to Many</option>
                      <option value="one_to_one">One to One</option>
                      <option value="many_to_many">Many to Many</option>
                    </select>
                  </div>

                  {/* Generated SQL Preview */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Generated SQL
                      {join.sql && (
                        <span className="ml-2 text-xs text-green-600">✓ Auto-generated</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={join.sql || ''}
                      onChange={(e) => updateJoin(entityIndex, joinIndex, 'sql', e.target.value)}
                      className={`w-full px-2 py-1 text-sm border border-gray-300 rounded font-mono ${
                        join.sql 
                          ? 'bg-green-50 text-green-800 border-green-300' 
                          : 'bg-gray-50 text-gray-500'
                      }`}
                      placeholder={
                        join.targetTable 
                          ? "SQL will be auto-generated when columns are selected"
                          : "Select target table to generate SQL"
                      }
                    />
                    {join.sql && (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 You can edit this SQL manually if needed
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 