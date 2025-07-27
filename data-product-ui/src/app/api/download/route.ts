import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectName } = body;

    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const projectPath = path.join(process.cwd(), '..', 'data-product-generator-cli', projectName);
    
    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Create a temporary zip file
    const zipFileName = `${projectName}.zip`;
    const zipFilePath = path.join(process.cwd(), 'tmp', zipFileName);
    
    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Create write stream for zip file
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    });

    // Listen for all archive data to be written
    const archivePromise = new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`Archive created: ${archive.pointer()} total bytes`);
        resolve(true);
      });
      
      archive.on('error', (err) => {
        reject(err);
      });
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add the entire project directory to the zip
    archive.directory(projectPath, projectName);

    // Finalize the archive
    await archive.finalize();
    await archivePromise;

    // Read the zip file
    const zipBuffer = fs.readFileSync(zipFilePath);

    // Clean up the temporary file
    fs.unlinkSync(zipFilePath);

    // Return the zip file as a download
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error creating zip file:', error);
    return NextResponse.json(
      { error: 'Failed to create zip file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Download API',
    endpoints: {
      POST: '/api/download - Download project as zip file'
    }
  });
} 