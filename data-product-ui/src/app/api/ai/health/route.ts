import { NextResponse } from 'next/server';

export async function GET() {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    status: 'ok',
    apiKeyConfigured: hasApiKey,
    message: hasApiKey 
      ? 'OpenAI API key is configured' 
      : 'OpenAI API key is NOT configured - add it to .env or .env.local',
    timestamp: new Date().toISOString()
  });
}

