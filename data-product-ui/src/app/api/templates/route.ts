import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type');

    const templatesDir = path.join(process.cwd(), '..', 'data-product-generator-cli', 'reference');

    if (templateType === 'config') {
      // Return the main config template
      const configPath = path.join(process.cwd(), '..', 'data-product-generator-cli', 'config.yaml');
      
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        return NextResponse.json({
          type: 'config',
          content: configContent,
          description: 'Main configuration template for data product entities'
        });
      }
    }

    // Return available template types
    const templates = {
      config: {
        description: 'Main configuration file defining entities, dimensions, and relationships',
        example: {
          logical_model: 'analytics',
          source: 'icebase',
          schema: 'retail',
          entities: {
            customer: {
              dimensions: [
                { name: 'customer_id', type: 'number', primary_key: true },
                { name: 'customer_name', type: 'string' },
                { name: 'customer_email', type: 'string' }
              ]
            }
          }
        }
      },
      sodp: {
        description: 'Source of Data Product template',
        example: {
          name: '${entity}-dp',
          version: 'v1beta',
          type: 'data',
          description: 'Data product description',
          tags: ['DPUsecase.Device Performance Analysis', 'DPTier.Source Aligned'],
          purpose: 'Enables faster decisions and performance insights'
        }
      },
      model: {
        description: 'Data model template with tables, dimensions, and measures',
        example: {
          tables: [
            {
              name: '${entity}',
              sql: '{{ load_sql(\'${entity}\') }}',
              description: 'Comprehensive ${entity} data for business analytics',
              data_source: 'icebase',
              public: true,
              dimensions: [
                {
                  name: '${entity}_id',
                  description: 'Primary business identifier',
                  type: 'string',
                  sql: '${entity}_id',
                  primary_key: true
                }
              ],
              measures: [
                {
                  name: 'total_${entity}',
                  sql: '${entity}_id',
                  type: 'count',
                  description: 'Total count of ${entity} records'
                }
              ]
            }
          ]
        }
      }
    };

    return NextResponse.json({
      templates,
      availableTypes: Object.keys(templates)
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
} 