// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, deleteApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Initial config (defaults to env vars or mock values during next build)
let firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key-for-build",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth-domain-for-build",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app-id",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "mock-measurement-id"
};

// Server-side: read firebase-config.json at runtime
if (typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'firebase-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (error) {
    // Fail silently, use default env config
  }
}

// Initialize Firebase as live-bound variables
export let app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export let db = getFirestore(app);
export let auth = getAuth(app);

// Function to re-initialize Firebase dynamically at runtime on the client
export function reinitializeFirebase(newConfig: any) {
  try {
    const apps = getApps();
    if (apps.length) {
      for (const existingApp of apps) {
        deleteApp(existingApp);
      }
    }
    app = initializeApp(newConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    return { app, db, auth };
  } catch (e) {
    console.error("Failed to reinitialize Firebase with new config:", e);
    throw e;
  }
}

