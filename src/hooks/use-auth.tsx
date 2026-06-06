'use client';

import * as React from 'react';
import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db, reinitializeFirebase } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  type User 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { saveUserAction } from '@/app/dashboard/ajustes/actions';
import type { AppUser, UserPermissions } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string, role: 'admin' | 'supervisor', username: string, permissions: AppUser['permissions']) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch('/api/firebase-config');
        const data = await res.json();
        if (data.configured) {
          reinitializeFirebase(data.config);
          setIsConfigured(true);
          setConfigLoading(false);
        } else {
          setIsConfigured(false);
          setConfigLoading(false);
          setLoading(false);
          
          if (window.location.pathname !== '/instalacion') {
            window.location.href = '/instalacion';
          }
        }
      } catch (error) {
        console.error('Error fetching Firebase config:', error);
        setConfigLoading(false);
        setLoading(false);
      }
    }
    checkConfig();
  }, []);

  useEffect(() => {
    if (!isConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
            const userDocSnap = await getDoc(userDocRef).catch(async (err) => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'get'
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
            });

            if (userDocSnap.exists()) {
              setAppUser({ id: userDocSnap.id, ...userDocSnap.data() } as AppUser);
            } else {
              const username = firebaseUser.email?.split('@')[0] || 'admin';
              const defaultAdminPermissions: UserPermissions = {
                dashboard: true,
                clients: true,
                consultarCliente: true,
                loans: true,
                overduePortfolio: true,
                carteraVencida: true,
                wallet: true,
                plans: true,
                settings: true,
                editClients: true,
                control: true,
                manageUsers: true,
                manageZones: true,
                manageMigration: true,
                managePlans: true,
                manageSystem: true,
                manageMaintenance: true,
                showMobileNavBar: true,
                mobileSections: ['dashboard', 'loans', 'overduePortfolio', 'wallet', 'consultarCliente']
              };
              const newAppUser: Omit<AppUser, 'id'> = {
                username: username.charAt(0).toUpperCase() + username.slice(1),
                role: 'admin',
                permissions: defaultAdminPermissions,
              };
              
              await setDoc(userDocRef, newAppUser).catch(async (err) => {
                  const permissionError = new FirestorePermissionError({
                      path: userDocRef.path,
                      operation: 'create',
                      requestResourceData: newAppUser
                  } satisfies SecurityRuleContext);
                  errorEmitter.emit('permission-error', permissionError);
                  throw permissionError;
              });
              setAppUser({ id: firebaseUser.uid, ...newAppUser } as AppUser);
            }
        } catch (err: any) {
            // Error handling is centralized
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  const signUp = async (email: string, password: string, role: 'admin' | 'supervisor', username: string, permissions: AppUser['permissions']) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;
    
    // We include the password in Firestore so CRISTOBAL can see it as requested.
    await saveUserAction(uid, { username, role, permissions, password });

    return userCredential;
  };

  const signIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = () => {
    return firebaseSignOut(auth).then(() => {
        router.push('/login');
    });
  };

  const value = {
    user,
    appUser,
    loading,
    signUp,
    signIn,
    signOut,
  };

  if (configLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500"></div>
          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] animate-pulse">Iniciando Servidor...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
