import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { reinitializeFirebase } from '@/lib/firebase';

export async function GET() {
  const configPath = path.join(process.cwd(), 'firebase-config.json');
  
  // 1. Check JSON file first
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return NextResponse.json({ configured: true, config });
    } catch (error) {
      console.error('Error reading firebase-config.json:', error);
    }
  }

  // 2. Check environment variables as a fallback
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (apiKey && !apiKey.includes('mock') && !apiKey.includes('mock-api-key-for-build')) {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
    return NextResponse.json({ configured: true, config });
  }

  return NextResponse.json({ configured: false });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config } = body;
    
    if (!config || !config.apiKey || !config.projectId) {
      return NextResponse.json({ error: 'Configuración inválida' }, { status: 400 });
    }

    const configPath = path.join(process.cwd(), 'firebase-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Reinitialize server-side Firebase in memory immediately
    try {
      reinitializeFirebase(config);
    } catch (reinitErr) {
      console.error('Failed to reinitialize Firebase on server side:', reinitErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error guardando la configuración' }, { status: 500 });
  }
}
