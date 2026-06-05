import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getAppConfig } from '@/lib/firestore-data';
import Image from 'next/image';
import { LoginForm } from './login-form';

export default async function LoginPage() {
    const config = await getAppConfig();
    const logoUrl = config?.logoUrl;
    const appName = config?.appName || 'CrediControl';

  const isVideoUrl = (url: string | null | undefined) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || url.includes('.mp4') || url.includes('video') || url.includes('mp4');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-sky-100/50 via-background to-blue-100/30 px-4 relative overflow-hidden">
      {/* Animated glowing decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-primary/20 blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-blue-300/20 blur-3xl animate-float pointer-events-none" />

      {/* Glassmorphic login card with entry fade & slide up animations */}
      <Card className="w-full max-w-sm bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <CardHeader className="text-center pt-8 pb-4">
            <div className='flex flex-col items-center justify-center gap-3'>
                {logoUrl && (
                    <div className="relative group">
                        {/* Soft glow behind the logo */}
                        <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-md scale-95 group-hover:scale-105 transition-transform duration-500" />
                        {isVideoUrl(logoUrl) ? (
                            <video
                              src={logoUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="h-24 w-64 object-cover rounded-3xl border border-white/80 shadow-lg bg-white/95 relative z-10 hover:scale-105 transition-all duration-500 animate-float"
                            />
                        ) : (
                            <img 
                              src={logoUrl} 
                              alt="Logo" 
                              className="h-24 w-64 object-cover rounded-3xl border border-white/80 shadow-lg bg-white/95 relative z-10 hover:scale-105 hover:rotate-1 transition-all duration-500 animate-float"
                            />
                        )}
                    </div>
                )}
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight mt-2 uppercase bg-gradient-to-r from-zinc-800 to-zinc-600 bg-clip-text text-transparent">
                        {appName}
                    </h1>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.25em]">
                        Sistema de Control
                    </p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="pb-8">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
