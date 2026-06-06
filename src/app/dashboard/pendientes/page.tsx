
import { getClients, getLoanPlans, getLoans, getPlazas, getLocalidades, getPromotoras, getAppConfig } from '@/lib/firestore-data';
import type { Client, Loan, LoanPlan, Plaza, Localidad, Promotora } from '@/lib/types';
import { OverduePortfolioClientPage } from '@/components/overdue-portfolio-client-page';
import type { OverdueLoanDetails } from '../cartera-vencida/page';

export default async function OverduePortfolioPage() {
    const [loans, clients, loanPlans, plazas, localidades, promotoras, config] = await Promise.all([
        getLoans(),
        getClients(),
        getLoanPlans(),
        getPlazas(),
        getLocalidades(),
        getPromotoras(),
        getAppConfig(),
    ]);

    const overdueLoansDetails: OverdueLoanDetails[] = loans
        .filter(loan => loan.status !== 'Paid Off' && loan.status !== 'Pagado desde CV')
        .map(loan => {
            const client = clients.find(c => c.id === loan.clientId);
            const loanPlan = loanPlans.find(p => p.id === loan.loanPlanId);
            const promotora = promotoras.find(p => p.id === loan.promotoraId);
            const localidad = localidades.find(l => l.id === promotora?.localidadId);
            const plaza = plazas.find(p => p.id === localidad?.plazaId);

            if (!client || !loanPlan) return null;

            const weeklyPayment = (loan.amount / 1000) * loanPlan.weeklyPaymentRate;
            const today = new Date();
            const loanStartDate = new Date(loan.startDate);
            const baseTerm = loanPlan.termInWeeks;

            // Normalización UTC para el cálculo de semanas
            const startDayUTC = new Date(Date.UTC(loanStartDate.getUTCFullYear(), loanStartDate.getUTCMonth(), loanStartDate.getUTCDate()));
            const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            const daysDiff = Math.round((todayUTC.getTime() - startDayUTC.getTime()) / (1000 * 3600 * 24));
            
            const rawCurrentLoanWeek = Math.max(1, Math.floor((daysDiff - 1) / 7) + 1);
            
            let missedCount = 0;
            for (let i = 1; i <= baseTerm; i++) {
                if (i < rawCurrentLoanWeek) {
                    const p = loan.payments.find(pay => pay.weekNumber === i);
                    if (!p || p.amount < weeklyPayment) missedCount++;
                }
            }

            // REGLA PENDIENTES: 2 o más fallos activa penalización
            const hasPenalty = missedCount >= 2;
            
            const baseTermExpected = baseTerm * weeklyPayment;
            const baseTermPaid = (loan.payments || [])
                .filter(p => p.weekNumber >= 1 && p.weekNumber <= baseTerm)
                .reduce((acc, p) => acc + p.amount, 0);

            const penaltyExpected = hasPenalty ? weeklyPayment : 0;
            const penaltyPaid = (loan.payments || [])
                .filter(p => p.weekNumber > baseTerm)
                .reduce((acc, p) => acc + p.amount, 0);

            const generalPaid = (loan.payments || [])
                .filter(p => p.weekNumber <= 0)
                .reduce((acc, p) => acc + p.amount, 0);

            const totalPaid = baseTermPaid + penaltyPaid + generalPaid;
            const totalExpected = baseTermExpected + penaltyExpected;
            const totalDue = Math.max(0, totalExpected - totalPaid);

            const baseArrearsRaw = Math.max(0, baseTermExpected - baseTermPaid);
            const penaltyArrearRaw = Math.max(0, penaltyExpected - penaltyPaid);

            const baseOverpayment = Math.max(0, baseTermPaid - baseTermExpected);
            const penaltyOverpayment = Math.max(0, penaltyPaid - penaltyExpected);

            let baseArrears = Math.max(0, baseArrearsRaw - penaltyOverpayment);
            let penaltyArrear = Math.max(0, penaltyArrearRaw - baseOverpayment);

            if (generalPaid > 0) {
                const appliedToPenalty = Math.min(penaltyArrear, generalPaid);
                penaltyArrear -= appliedToPenalty;
                const remainingGeneral = generalPaid - appliedToPenalty;
                baseArrears = Math.max(0, baseArrears - remainingGeneral);
            }

            // IMPORTANTE: Un préstamo en esta sección debe estar vigente (no expirado)
            const isExpired = rawCurrentLoanWeek > baseTerm;

            if (!isExpired && missedCount >= 2 && totalDue > 0) {
                return {
                    loan,
                    client,
                    loanPlan,
                    amountDue: totalDue,
                    baseArrears,
                    penaltyArrear,
                    missedPayments: missedCount,
                    hasPenalty: true,
                    hierarchy: {
                        plazaId: plaza?.id || 'N/A',
                        plazaName: plaza?.name || 'N/A',
                        localidadId: localidad?.id || 'N/A',
                        localidadName: localidad?.name || 'N/A',
                        promotoraId: promotora?.id || 'N/A',
                        promotoraName: promotora?.name || 'N/A',
                    }
                };
            }
            
            return null;
        })
        .filter((details): details is OverdueLoanDetails => details !== null);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight uppercase">Pagos Pendientes</h1>
            </div>
            <OverduePortfolioClientPage 
                initialOverdueLoans={overdueLoansDetails}
                clients={clients}
                loanPlans={loanPlans}
                plazas={plazas}
                localidades={localidades}
                promotoras={promotoras}
                title="Pagos Pendientes"
            />
        </div>
    );
}
