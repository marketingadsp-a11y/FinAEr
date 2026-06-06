'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  Key, 
  User, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import { reinitializeFirebase } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function InstalacionPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form States
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
  });

  const [adminConfig, setAdminConfig] = useState({
    name: 'Administrador',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [businessConfig, setBusinessConfig] = useState({
    appName: 'CrediControl',
  });

  const handleFirebaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirebaseConfig({ ...firebaseConfig, [e.target.name]: e.target.value.trim() });
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminConfig({ ...adminConfig, [e.target.name]: e.target.value.trim() });
  };

  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusinessConfig({ ...businessConfig, [e.target.name]: e.target.value });
  };

  // Validation
  const isFirebaseValid = 
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId && 
    firebaseConfig.storageBucket && 
    firebaseConfig.messagingSenderId && 
    firebaseConfig.appId;

  const isAdminValid = 
    adminConfig.name && 
    adminConfig.email && 
    adminConfig.password && 
    adminConfig.password === adminConfig.confirmPassword &&
    adminConfig.password.length >= 6;

  const isBusinessValid = businessConfig.appName.trim().length > 0;

  const handleNext = () => {
    setError(null);
    if (step === 1 && !isFirebaseValid) {
      setError('Por favor, completa todos los campos obligatorios de Firebase.');
      return;
    }
    if (step === 2 && !isAdminValid) {
      if (adminConfig.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else if (adminConfig.password !== adminConfig.confirmPassword) {
        setError('Las contraseñas no coinciden.');
      } else {
        setError('Por favor, completa todos los campos del Administrador.');
      }
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleInstall = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Save config to Server (writes firebase-config.json)
      const saveRes = await fetch('/api/firebase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: firebaseConfig }),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json();
        throw new Error(errData.error || 'No se pudo guardar el archivo de configuración en el servidor.');
      }

      // 2. Re-initialize Firebase instance dynamically on client
      const services = reinitializeFirebase(firebaseConfig);

      // 3. Register Administrator User in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        services.auth, 
        adminConfig.email, 
        adminConfig.password
      );
      const uid = userCredential.user.uid;

      // 4. Seed Firestore default collections
      const defaultAdminPermissions = {
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

      // User document
      await setDoc(doc(services.db, 'users', uid), {
        username: adminConfig.name,
        role: 'admin',
        permissions: defaultAdminPermissions,
        password: adminConfig.password, // Stored in Firestore as requested
      });

      // App Config document
      await setDoc(doc(services.db, 'config', 'main'), {
        appName: businessConfig.appName,
        logoUrl: '',
        faviconUrl: '',
      });

      // Wallet main doc
      await setDoc(doc(services.db, 'wallet', 'main'), {
        balance: 0,
      });

      // Seed default structural data (Plaza, Localidad, Promotora)
      await setDoc(doc(services.db, 'plazas', 'plaza_inicial'), {
        name: 'Plaza Central',
      });

      await setDoc(doc(services.db, 'localidades', 'localidad_inicial'), {
        name: 'Centro',
        plazaId: 'plaza_inicial',
      });

      await setDoc(doc(services.db, 'promotoras', 'promotora_inicial'), {
        name: 'Promotora Principal',
        localidadId: 'localidad_inicial',
      });

      setSuccess(true);
      
      // Delay before redirecting to allow Firebase state to propagate
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error inesperado durante la instalación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950 text-white selection:bg-emerald-500 selection:text-black">
      {/* Decorative neon ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-3xl">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
        
        <CardHeader className="space-y-2 pb-6 border-b border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Database className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Instalación</span>
            </div>
            <Badge variant="outline" className="text-[9px] uppercase border-zinc-800 text-zinc-400">
              Paso {step} de 3
            </Badge>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-white uppercase">
            {success ? 'Instalación Completada' : 'Inicializar Sistema'}
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            {success 
              ? 'El sistema se ha configurado correctamente. Redirigiendo al panel...' 
              : 'Configura tus credenciales y conecta tu base de datos para comenzar a operar.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 min-h-[300px] flex flex-col justify-center">
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-950/40 border-red-500/30 text-red-200 rounded-2xl">
              <AlertTriangle className="h-4 w-4 stroke-red-400" />
              <AlertTitle className="text-[10px] font-black uppercase tracking-wider text-red-400">Error en la instalación</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in duration-500">
              <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 animate-pulse">
                <CheckCircle2 className="h-16 w-16" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wide text-center">¡Instalado con éxito!</h3>
              <p className="text-xs text-zinc-400 text-center max-w-sm">
                Se han creado las colecciones de Firestore y el administrador de forma segura. Redirigiendo en segundos...
              </p>
            </div>
          ) : (
            <>
              {/* STEP 1: FIREBASE OPTIONS */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-4">
                    <Key className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Configuración de Firebase</h3>
                  </div>

                  <Alert className="bg-emerald-950/20 border-emerald-500/20 text-emerald-200 rounded-2xl p-3">
                    <Info className="h-4 w-4 stroke-emerald-400" />
                    <AlertDescription className="text-[10px] leading-relaxed">
                      Crea un proyecto en Firebase, habilita <strong>Firestore Database</strong> y <strong>Email/Password Auth</strong> en la consola de Firebase, y pega los datos del Web App aquí.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Project ID *</Label>
                      <Input 
                        name="projectId"
                        placeholder="finaer-xxxxx" 
                        value={firebaseConfig.projectId}
                        onChange={handleFirebaseChange}
                        className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">API Key *</Label>
                      <Input 
                        name="apiKey"
                        placeholder="AIzaSy..." 
                        value={firebaseConfig.apiKey}
                        onChange={handleFirebaseChange}
                        className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Auth Domain *</Label>
                      <Input 
                        name="authDomain"
                        placeholder="xxxx.firebaseapp.com" 
                        value={firebaseConfig.authDomain}
                        onChange={handleFirebaseChange}
                        className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Storage Bucket *</Label>
                      <Input 
                        name="storageBucket"
                        placeholder="xxxx.firebasestorage.app" 
                        value={firebaseConfig.storageBucket}
                        onChange={handleFirebaseChange}
                        className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Messaging Sender ID *</Label>
                      <Input 
                        name="messagingSenderId"
                        placeholder="85392..." 
                        value={firebaseConfig.messagingSenderId}
                        onChange={handleFirebaseChange}
                        className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">App ID *</Label>
                      <Input 
                        name="appId"
                        placeholder="1:85392:web:xxxx" 
                        value={firebaseConfig.appId}
                        onChange={handleFirebaseChange}
                        className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Measurement ID (Opcional)</Label>
                    <Input 
                      name="measurementId"
                      placeholder="G-XXXXXX" 
                      value={firebaseConfig.measurementId}
                      onChange={handleFirebaseChange}
                      className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: ADMIN CREDENTIALS */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-4">
                    <User className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Administrador del Sistema</h3>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Nombre del Administrador *</Label>
                    <Input 
                      name="name"
                      placeholder="Nombre de Usuario (ej. Administrador)" 
                      value={adminConfig.name}
                      onChange={handleAdminChange}
                      className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Correo Electrónico *</Label>
                    <Input 
                      name="email"
                      type="email"
                      placeholder="admin@correo.com" 
                      value={adminConfig.email}
                      onChange={handleAdminChange}
                      className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Contraseña *</Label>
                      <Input 
                        name="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres" 
                        value={adminConfig.password}
                        onChange={handleAdminChange}
                        className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Confirmar Contraseña *</Label>
                      <Input 
                        name="confirmPassword"
                        type="password"
                        placeholder="Repite la contraseña" 
                        value={adminConfig.confirmPassword}
                        onChange={handleAdminChange}
                        className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: BUSINESS CONFIG & SUMMARY */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-2">
                    <Settings className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Configuración del Negocio</h3>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Nombre de la Aplicación *</Label>
                    <Input 
                      name="appName"
                      placeholder="ej: CrediControl o FinAEr" 
                      value={businessConfig.appName}
                      onChange={handleBusinessChange}
                      className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-emerald-500/30 rounded-xl text-xs h-10"
                    />
                  </div>

                  <div className="border-t border-zinc-800/50 pt-4 mt-2">
                    <h4 className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mb-3">Resumen de Instalación</h4>
                    
                    <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/40 text-[11px] leading-relaxed">
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase tracking-wider font-bold">Base de Datos</span>
                        <span className="font-bold text-zinc-200">Firebase: {firebaseConfig.projectId}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase tracking-wider font-bold">Administrador</span>
                        <span className="font-bold text-zinc-200">{adminConfig.name} ({adminConfig.email})</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase tracking-wider font-bold">App</span>
                        <span className="font-bold text-zinc-200">{businessConfig.appName}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase tracking-wider font-bold">Inicialización</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Datos por Defecto Activos
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>

        {!success && (
          <CardFooter className="flex justify-between border-t border-zinc-800/50 pt-5 pb-5">
            {step > 1 ? (
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={loading}
                className="h-10 text-[10px] font-black uppercase tracking-wider border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-white rounded-xl px-5"
              >
                <ChevronLeft className="h-4 w-4 mr-1.5" /> Atrás
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button 
                onClick={handleNext}
                className="h-10 text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-zinc-950 rounded-xl px-5"
              >
                Siguiente <ChevronRight className="h-4 w-4 ml-1.5 stroke-[3]" />
              </Button>
            ) : (
              <Button 
                onClick={handleInstall}
                disabled={loading || !isBusinessValid}
                className="h-10 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 rounded-xl px-6 font-bold shadow-lg shadow-emerald-500/10"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Instalando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Completar Instalación
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
