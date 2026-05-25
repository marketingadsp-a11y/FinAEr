'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { useAuth } from '@/hooks/use-auth';
import { getAppConfig } from '@/lib/firestore-data';
import { Users, Landmark, Banknote, ArrowRight, TrendingUp, Receipt, ChevronLeft, ChevronRight, List } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Loan } from '@/lib/types';
import Image from 'next/image';
import { ClientesConFallos } from '@/components/clientes-con-fallos';
import { useEffect, useState, useMemo } from 'react';
import Loading from './loading';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

export default function DashboardPage() {
    const { data, loading: dataLoading } = useRealtimeData();
    const { appUser, loading: authLoading } = useAuth();
    const [config, setConfig] = useState<{logoUrl?: string} | null>(null);
    
    // Pagination state for Overdue Loans
    const [currentPage, setCurrentPage] = useState(1);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        getAppConfig().then(setConfig);
    }, []);

    // Safe destructuring with fallbacks to avoid crashes during partial data loads
    const { clients = [], loans = [], loanPlans = [] } = data || {};

    const stats = useMemo(() => {
        if (!data || !appUser) return null;

        const totalClients = clients.length;
        const activeLoansCount = loans.filter((loan) => loan.status === 'Active' || loan.status === 'Overdue').length;
        const totalLoaned = loans.reduce((acc, loan) => acc + loan.amount, 0);

        // Expected weekly collection calculation
        const expectedWeeklyCollection = loans
            .filter((loan) => loan.status === 'Active' || loan.status === 'Overdue')
            .reduce((acc, loan) => {
                const plan = loanPlans.find(p => p.id === loan.loanPlanId);
                if (!plan) return acc;
                const weeklyPayment = (loan.amount / 1000) * plan.weeklyPaymentRate;
                return acc + weeklyPayment;
            }, 0);

        const overdueLoans = loans.filter((loan) => {
            if (loan.status === 'Paid Off' || loan.status === 'Pagado desde CV') return false;
            const plan = loanPlans.find(p => p.id === loan.loanPlanId);
            if (!plan) return false;

            const today = new Date();
            const loanStartDate = new Date(loan.startDate);
            const baseTerm = plan.termInWeeks;

            // Normalización UTC
            const startDayUTC = new Date(Date.UTC(loanStartDate.getUTCFullYear(), loanStartDate.getUTCMonth(), loanStartDate.getUTCDate()));
            const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            const daysDiff = Math.round((todayUTC.getTime() - startDayUTC.getTime()) / (1000 * 3600 * 24));
            const currentLoanWeek = Math.max(1, Math.floor((daysDiff - 1) / 7) + 1);

            const weeklyPayment = (loan.amount / 1000) * plan.weeklyPaymentRate;
            let missedWeeksCount = 0;
            for (let i = 1; i < currentLoanWeek; i++) {
                const p = loan.payments.find(pay => pay.weekNumber === i);
                if (p && p.amount < weeklyPayment) missedWeeksCount++;
            }

            const term = plan.termInWeeks + (missedWeeksCount >= 2 ? 1 : 0);
            return currentLoanWeek > term;
        });

        // Weekly report logic
        const getSaturdayOfWeek = (d: Date) => {
            const date = new Date(d);
            date.setUTCHours(0, 0, 0, 0);
            const day = date.getUTCDay();
            const diff = day === 0 ? -1 : 6 - day;
            date.setUTCDate(date.getUTCDate() + diff);
            return date;
        };
        
        const currentSaturday = getSaturdayOfWeek(new Date());
        currentSaturday.setUTCHours(23, 59, 59, 999);

        const weekStart = new Date(currentSaturday);
        weekStart.setUTCDate(currentSaturday.getUTCDate() - 6);
        weekStart.setUTCHours(0, 0, 0, 0);

        let totalCollectedThisWeek = 0;
        let totalPaymentsThisWeek = 0;

        loans.forEach(loan => {
            (loan.payments || []).forEach(payment => {
                const paymentDate = new Date(payment.date);
                if (paymentDate >= weekStart && paymentDate <= currentSaturday) {
                    totalCollectedThisWeek += payment.amount;
                    totalPaymentsThisWeek += 1;
                }
            });
        });

        const collectionProgress = expectedWeeklyCollection > 0
            ? Math.min(100, Math.round((totalCollectedThisWeek / expectedWeeklyCollection) * 100))
            : 0;

        return {
            totalClients,
            activeLoans: activeLoansCount,
            totalLoaned,
            overdueLoans,
            totalCollectedThisWeek,
            totalPaymentsThisWeek,
            expectedWeeklyCollection,
            collectionProgress
        };
    }, [clients, loans, loanPlans, appUser, data]);

    const overdueLoans = stats?.overdueLoans || [];
    const totalPages = Math.ceil(overdueLoans.length / ITEMS_PER_PAGE);

    const visibleOverdueLoans = useMemo(() => {
        if (showAll) return overdueLoans;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return overdueLoans.slice(start, start + ITEMS_PER_PAGE);
    }, [overdueLoans, currentPage, showAll]);

    // Reset pagination when data changes
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    if (dataLoading || authLoading || !data || !appUser || !stats) {
        return <Loading />;
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ENCABEZADO DE BIENVENIDA (Al inicio de todo) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pb-4 border-b border-dashed border-zinc-200">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight uppercase text-zinc-800">
                        Hola, {appUser?.username}
                    </h1>
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em]">
                        Consola de Resumen Financiero
                    </p>
                </div>
                <Badge variant="outline" className="h-6 font-black uppercase text-[9px] tracking-wider border-emerald-500/20 text-emerald-600 bg-emerald-50/50">
                    Corte: {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
                </Badge>
            </div>

            {/* LOGOTIPO HEADER SECTION (Centrado, debajo de la bienvenida) */}
            {config?.logoUrl && (
                <div className="flex justify-center mb-2">
                    <div className="w-52 h-52 md:w-60 md:h-60 flex items-center justify-center p-2">
                        <div className="relative w-full h-full animate-in fade-in zoom-in duration-700">
                            <Image 
                                src={config.logoUrl} 
                                alt="Logo" 
                                fill
                                className="object-contain rounded-3xl border-4 border-white animate-glow-green bg-white/80 backdrop-blur-sm p-4 animate-float"
                                priority
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* GRID PRINCIPAL DEL DASHBOARD */}
            <div className="grid gap-6 lg:grid-cols-3 items-start">
                
                {/* COLUMNA IZQUIERDA Y CENTRAL: CONTENIDO PRINCIPAL (Estadísticas y Cartera Vencida) */}
                <div className={cn(
                    "space-y-6 lg:col-span-3",
                    appUser.username === 'Cristobal' && "lg:col-span-2"
                )}>

                    {/* TARJETA HERO: COBRANZA SEMANAL Y PROGRESO (Optimizado y Compacto) */}
                    <Card className="relative overflow-hidden border-2 border-emerald-500/10 shadow-md bg-gradient-to-r from-emerald-50/10 via-white to-background rounded-2xl p-4 group hover:shadow-lg hover:border-emerald-500/20 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="space-y-1.5 flex-1 w-full">
                                <div className="flex items-center gap-1.5">
                                    <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                                        <TrendingUp className="h-3.5 w-3.5 stroke-[2.5]" />
                                    </span>
                                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.1em]">
                                        Cobranza de la Semana
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-zinc-800 tracking-tight leading-none">
                                        {formatCurrency(stats.totalCollectedThisWeek)}
                                    </span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                        recaudado
                                    </span>
                                </div>
                                
                                {/* Barra de Progreso Compacta */}
                                <div className="space-y-1 pt-1 w-full max-w-md">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground">
                                        <span>Meta: {formatCurrency(stats.expectedWeeklyCollection)}</span>
                                        <span className="text-emerald-600">{stats.collectionProgress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/30">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                                            style={{ width: `${stats.collectionProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* CONSOLA UNIFICADA DE MÉTRICAS SECUNDARIAS */}
                    <Card className="border-2 shadow-md rounded-3xl overflow-hidden">
                        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-zinc-100">
                            
                            {/* Bloque: Abonos */}
                            <div className="p-5 flex flex-col justify-between hover:bg-zinc-50/50 transition-colors">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">
                                        Abonos Semanales
                                    </span>
                                    <span className="text-2xl font-black text-zinc-800 leading-tight block">
                                        +{stats.totalPaymentsThisWeek}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-sky-600 uppercase mt-2 block">
                                    Pagos registrados
                                </span>
                            </div>

                            {/* Bloque: Total Prestado */}
                            <div className="p-5 flex flex-col justify-between hover:bg-zinc-50/50 transition-colors">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">
                                        Capital Prestado
                                    </span>
                                    <span className="text-2xl font-black text-zinc-800 leading-tight block">
                                        {formatCurrency(stats.totalLoaned)}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-blue-600 uppercase mt-2 block">
                                    Monto total colocado
                                </span>
                            </div>

                            {/* Bloque: Total Clientes */}
                            <div className="p-5 flex flex-col justify-between hover:bg-zinc-50/50 transition-colors">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">
                                        Clientes Totales
                                    </span>
                                    <span className="text-2xl font-black text-zinc-800 leading-tight block">
                                        {stats.totalClients}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-violet-600 uppercase mt-2 block">
                                    Registros activos
                                </span>
                            </div>

                            {/* Bloque: Préstamos Activos */}
                            <div className="p-5 flex flex-col justify-between hover:bg-zinc-50/50 transition-colors">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">
                                        Préstamos Activos
                                    </span>
                                    <span className="text-2xl font-black text-zinc-800 leading-tight block">
                                        {stats.activeLoans}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-amber-600 uppercase mt-2 block">
                                    En curso y cobro
                                </span>
                            </div>

                        </div>
                    </Card>

                    {/* TABLA DE CARTERA VENCIDA */}
                    <Card className="border-2 shadow-lg overflow-hidden rounded-3xl">
                        <CardHeader className="p-4 border-b bg-primary/5 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <List className="h-4 w-4 text-red-600 animate-pulse" /> Préstamos en Cartera Vencida ({overdueLoans.length})
                                </CardTitle>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                    setShowAll(!showAll);
                                    setCurrentPage(1);
                                }}
                                className="h-8 font-black uppercase text-[9px] tracking-widest border-2 gap-1.5"
                            >
                                <List className="h-3.5 w-3.5" />
                                {showAll ? "Ver paginado" : "Mostrar todo"}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-[9px] font-black uppercase tracking-wider py-3.5 pl-6">Cliente</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase tracking-wider">Monto</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase tracking-wider">Plan</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase tracking-wider">Estado</TableHead>
                                            <TableHead className="text-right pr-6"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleOverdueLoans.length > 0 ? (
                                            visibleOverdueLoans.map((loan) => (
                                                <TableRow key={loan.id} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="font-black pl-6 text-[11px] uppercase">
                                                        {clients.find(c => c.id === loan.clientId)?.name || 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-[11px] text-zinc-900">{formatCurrency(loan.amount)}</TableCell>
                                                    <TableCell className="font-bold text-[10px] text-zinc-500 uppercase">{loanPlans.find(p => p.id === loan.loanPlanId)?.name || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="destructive" className="text-[8px] font-black uppercase h-4 px-2">Vencido</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-full">
                                                            <Link href="/dashboard/overdue-portfolio"><ArrowRight className="h-4 w-4" /></Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-[10px] font-black uppercase text-muted-foreground italic">
                                                    No hay préstamos en cartera vencida.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        {!showAll && totalPages > 1 && (
                            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t px-6 bg-zinc-50/50">
                                <div className="text-[10px] font-black uppercase text-muted-foreground">
                                    Mostrando {visibleOverdueLoans.length} de {overdueLoans.length} registros
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 font-black uppercase text-[9px] tracking-widest border-2"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 font-black uppercase text-[9px] tracking-widest border-2"
                                        >
                                            Siguiente
                                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </CardFooter>
                        )}
                        {showAll && overdueLoans.length > ITEMS_PER_PAGE && (
                            <CardFooter className="py-4 border-t justify-center bg-zinc-50/50">
                                <p className="text-[10px] font-black uppercase text-muted-foreground">
                                    Mostrando lista completa ({overdueLoans.length} registros)
                                </p>
                            </CardFooter>
                        )}
                    </Card>
                </div>

                {/* COLUMNA DERECHA: SIDEBAR DE CONTROL (Clientes con Fallos - Solo Cristobal) */}
                {appUser.username === 'Cristobal' && (
                    <div className="space-y-6 lg:col-span-1">
                        <ClientesConFallos loans={loans} clients={clients} loanPlans={loanPlans} />
                    </div>
                )}

            </div>
        </div>
    );
}
