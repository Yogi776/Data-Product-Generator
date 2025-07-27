import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectName, sodpEntities, codpLayer, semanticEntities, configPath } = body;

    // Validate required fields
    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!sodpEntities && !codpLayer) {
      return NextResponse.json(
        { error: 'At least one of SODP entities or CODP layer must be specified' },
        { status: 400 }
      );
    }

    // Build the command
    let command = `cd ../data-product-generator-cli && ./create_structure.sh -p ${projectName}`;

    if (sodpEntities) {
      command += ` -sodp ${sodpEntities.join(',')}`;
    }

    if (codpLayer) {
      command += ` -codp ${codpLayer}`;
    }

    if (semanticEntities) {
      command += ` -e ${semanticEntities.join(',')}`;
    }

    if (configPath) {
      command += ` -path ${configPath}`;
    }

    console.log('Executing command:', command);

    // Execute the CLI command
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('CLI stderr:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: 'Data product structure created successfully',
      output: stdout,
      projectName,
      generatedFiles: await getGeneratedFiles(projectName)
    });

  } catch (error) {
    console.error('Error creating data product:', error);
    return NextResponse.json(
      { error: 'Failed to create data product structure', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getGeneratedFiles(projectName: string): Promise<string[]> {
  try {
    const projectPath = path.join(process.cwd(), '..', projectName);
    const files: string[] = [];

    if (fs.existsSync(projectPath)) {
      const readDir = promisify(fs.readdir);
      const readFile = promisify(fs.readFile);
      const stat = promisify(fs.stat);

      async function scanDirectory(dirPath: string, relativePath: string = '') {
        const items = await readDir(dirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const relativeItemPath = path.join(relativePath, item);
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            await scanDirectory(fullPath, relativeItemPath);
          } else {
            files.push(relativeItemPath);
          }
        }
      }

      await scanDirectory(projectPath);
    }

    return files;
  } catch (error) {
    console.error('Error scanning generated files:', error);
    return [];
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Data Product Generator API',
    endpoints: {
      POST: '/api/data-product - Create a new data product structure'
    }
  });
} 