'use client';

import React, { useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, writeBatch, collection, Timestamp } from 'firebase/firestore';
import { 
  UploadCloud, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileCode, 
  ArrowLeft,
  Server
} from 'lucide-react';
import Link from 'next/link';

interface LogMessage {
  type: 'info' | 'success' | 'error' | 'warning';
  text: string;
  time: string;
}

export default function NuevaBasePage() {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (text: string, type: LogMessage['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ type, text, time }, ...prev]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setJsonInput(result);
        addLog(`Archivo "${file.name}" cargado correctamente. Listo para procesar.`, 'success');
      }
    };
    reader.onerror = () => {
      addLog('Error al leer el archivo seleccionado.', 'error');
    };
    reader.readAsText(file);
  };

  const startMigration = async () => {
    if (!jsonInput.trim()) {
      addLog('Por favor, ingresa o carga un archivo JSON válido.', 'warning');
      return;
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonInput);
    } catch (err: any) {
      addLog(`Error al parsear el JSON: ${err.message}`, 'error');
      return;
    }

    setLoading(true);
    setLogs([]);
    setProgress(0);
    setTotal(0);
    setStatusText('Analizando datos...');
    addLog('Iniciando proceso de migración...', 'info');

    try {
      const collectionsToImport = Object.keys(parsedData);
      let calculatedTotal = 0;

      // Count total items
      for (const colName of collectionsToImport) {
        const colData = parsedData[colName];
        if (Array.isArray(colData)) {
          calculatedTotal += colData.length;
        } else if (colData && typeof colData === 'object') {
          calculatedTotal += Object.keys(colData).length;
        }
      }

      if (calculatedTotal === 0) {
        addLog('No se encontraron documentos para importar en el JSON.', 'warning');
        setLoading(false);
        return;
      }

      setTotal(calculatedTotal);
      addLog(`Se encontraron ${calculatedTotal} documentos en ${collectionsToImport.length} colecciones.`, 'info');

      let currentImportedCount = 0;
      let batch = writeBatch(db);
      let operationCount = 0;

      // Date fields that we should convert to Firestore Timestamps
      const dateFields = [
        'startDate', 
        'expectedEndDate', 
        'dateOfBirth', 
        'paymentDate', 
        'lastLoginDate', 
        'timestamp', 
        'createdAt', 
        'updatedAt',
        'fecha',
        'fechaPago',
        'dueDate',
        'nextPaymentDueDate'
      ];

      for (const colName of collectionsToImport) {
        const colData = parsedData[colName];
        
        // Normalize collection data into an array of { id, data }
        let items: { id: string; data: any }[] = [];
        if (Array.isArray(colData)) {
          items = colData.map((item, idx) => {
            const id = item.id || item.uid || item.key || `doc_${idx}_${Date.now()}`;
            const cleanedData = { ...item };
            delete cleanedData.id;
            delete cleanedData.uid;
            delete cleanedData.key;
            return { id: String(id), data: cleanedData };
          });
        } else if (colData && typeof colData === 'object') {
          items = Object.entries(colData).map(([id, val]) => {
            const cleanedData = typeof val === 'object' && val !== null ? { ...val } : { value: val };
            delete (cleanedData as any).id;
            delete (cleanedData as any).uid;
            delete (cleanedData as any).key;
            return { id, data: cleanedData };
          });
        }

        if (items.length === 0) continue;

        addLog(`Importando ${items.length} documentos en la colección "${colName}"...`, 'info');

        for (const item of items) {
          const docData = { ...item.data };

          // Process dates conversion
          for (const key of Object.keys(docData)) {
            const val = docData[key];
            if (dateFields.includes(key) && typeof val === 'string') {
              const parsedDate = Date.parse(val);
              if (!isNaN(parsedDate)) {
                docData[key] = Timestamp.fromMillis(parsedDate);
              }
            }
          }

          const docRef = doc(db, colName, item.id);
          batch.set(docRef, docData, { merge: true });
          
          operationCount++;
          currentImportedCount++;
          setProgress(currentImportedCount);

          if (operationCount >= 400) {
            setStatusText(`Commit de lote (${currentImportedCount}/${calculatedTotal})...`);
            await batch.commit();
            addLog(`Lote de 400 documentos guardados en Firestore.`, 'success');
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
        
        addLog(`Colección "${colName}" procesada.`, 'success');
      }

      // Commit remaining
      if (operationCount > 0) {
        setStatusText('Confirmando último lote...');
        await batch.commit();
        addLog(`Último lote de ${operationCount} documentos guardado.`, 'success');
      }

      setStatusText('Completado');
      addLog('¡La migración e importación de la base de datos finalizó con éxito!', 'success');
    } catch (error: any) {
      console.error(error);
      addLog(`Error fatal durante la importación: ${error.message}`, 'error');
      setStatusText('Error');
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-tr from-sky-100/50 via-background to-blue-100/30 px-4 py-10 relative overflow-hidden font-body">
      {/* Animated glowing blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-primary/20 blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl space-y-6 relative z-10">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors font-bold uppercase text-xs tracking-wider">
          <ArrowLeft className="h-4 w-4" />
          Volver a la App
        </Link>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4 border-b border-zinc-200/50 pb-5">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Server className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase bg-gradient-to-r from-zinc-800 to-zinc-600 bg-clip-text text-transparent">
                Migración de Base de Datos
              </h1>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-[0.2em]">
                Importador temporal sin credenciales de sesión
              </p>
            </div>
          </div>

          {/* WARNING ALERT */}
          <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex gap-3 text-amber-800 animate-pulse">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <h4 className="font-extrabold uppercase tracking-wide">
                ¡Acción requerida en Firebase!
              </h4>
              <p className="leading-relaxed">
                Para que la importación funcione <strong>sin iniciar sesión</strong> en la app, debes habilitar temporalmente la escritura pública en tu proyecto de Firebase.
              </p>
              <div className="bg-white/70 border border-amber-200/50 rounded-xl p-3 mt-2 font-mono text-xs text-amber-950 overflow-x-auto shadow-inner">
                {`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`}
              </div>
              <p className="text-xs font-semibold mt-2 text-amber-700">
                Una vez finalizada la importación, te daremos instrucciones para eliminar esta sección y restaurar las reglas seguras de Firestore.
              </p>
            </div>
          </div>

          {/* Form & File upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-extrabold uppercase text-sm text-zinc-700 tracking-wider">
                1. Cargar archivo de datos (JSON)
              </h3>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 hover:border-primary/50 hover:bg-primary/5 cursor-pointer rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center gap-3 bg-zinc-50/50 group"
              >
                <div className="bg-white shadow border border-zinc-200/50 p-3 rounded-full group-hover:scale-105 transition-transform duration-300">
                  <UploadCloud className="h-6 w-6 text-zinc-500 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-zinc-800 text-sm">Arrastra o selecciona un archivo JSON</p>
                  <p className="text-xs text-zinc-500 mt-1">Exportado de tu base de datos anterior</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>

              <div className="text-center">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">— o pega el código abajo —</span>
              </div>
            </div>

            <div className="space-y-4 flex flex-col">
              <h3 className="font-extrabold uppercase text-sm text-zinc-700 tracking-wider">
                2. Contenido JSON directo
              </h3>
              <div className="relative flex-1 min-h-[160px] flex flex-col">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"clients": [{"id": "1", "firstName": "Juan", ...}], "loans": [...] }'
                  className="w-full flex-1 min-h-[160px] rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 font-mono text-xs focus:ring-2 focus:ring-primary focus:border-transparent resize-y shadow-inner outline-none transition-all"
                  disabled={loading}
                />
                <FileCode className="absolute bottom-3 right-3 h-5 w-5 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {(loading || progress > 0) && (
            <div className="bg-zinc-50/70 border border-zinc-200/30 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-2">
                  {loading && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
                  {statusText || 'Procesando...'}
                </span>
                <span className="font-extrabold text-primary">{progress} / {total} ({progressPercentage}%)</span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-300 shadow-lg shadow-primary/20"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              onClick={startMigration}
              disabled={loading || !jsonInput}
              className="w-full py-4 px-6 bg-primary hover:bg-primary/95 text-white font-extrabold uppercase tracking-widest text-sm rounded-2xl shadow-lg hover:shadow-xl hover:shadow-primary/20 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Importando base de datos...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  Iniciar Importación de Datos
                </>
              )}
            </button>
          </div>

          {/* Logs Terminal */}
          {logs.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-extrabold uppercase text-sm text-zinc-700 tracking-wider">
                Logs del Proceso
              </h3>
              <div className="bg-zinc-950 text-zinc-300 rounded-2xl p-4 font-mono text-xs h-60 overflow-y-auto shadow-inner border border-zinc-800 space-y-1.5 flex flex-col-reverse">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-2 ${
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'error' ? 'text-rose-400' :
                      log.type === 'warning' ? 'text-amber-400' : 'text-zinc-300'
                    }`}
                  >
                    <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                    <span className="font-semibold">{log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : log.type === 'warning' ? '⚠' : 'ℹ'}</span>
                    <span className="whitespace-pre-wrap">{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
