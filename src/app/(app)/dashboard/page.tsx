import { getCalculatedBills } from '@/lib/data';
import type { CalculatedBill } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, BarChart, Banknote, AlertTriangle, User, FileText } from 'lucide-react';

type Summary = {
  totalEntries: number;
  totalNetAmount: number;
  overdueAmount: number;
};

type OverdueParty = {
  party: string;
  billCount: number;
  totalAmount: number;
};

function calculateSummaries(bills: CalculatedBill[]): { summary: Summary; overdueParties: OverdueParty[] } {
  const totalEntries = bills.length;
  const totalNetAmount = bills.reduce((sum, bill) => sum + bill.netAmount, 0);
  const overdueBills = bills.filter(bill => bill.status === 'overdue');
  const overdueAmount = overdueBills.reduce((sum, bill) => sum + bill.netAmount, 0);

  const overduePartiesMap = new Map<string, { billCount: number; totalAmount: number }>();
  overdueBills.forEach(bill => {
    const existing = overduePartiesMap.get(bill.party) || { billCount: 0, totalAmount: 0 };
    existing.billCount++;
    existing.totalAmount += bill.netAmount;
    overduePartiesMap.set(bill.party, existing);
  });

  const overdueParties: OverdueParty[] = Array.from(overduePartiesMap.entries()).map(([party, data]) => ({
    party,
    ...data,
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    summary: { totalEntries, totalNetAmount, overdueAmount },
    overdueParties,
  };
}

const actionButtons = [
    { label: "Upload (.xlsx)", icon: Upload, gradient: "from-teal-500 to-cyan-500" },
    { label: "Download Template", icon: FileText, gradient: "from-blue-500 to-indigo-500" },
    { label: "Download List", icon: Download, gradient: "from-green-500 to-lime-500" },
];

export default function DashboardPage() {
  const bills = getCalculatedBills();
  const { summary, overdueParties } = calculateSummaries(bills);

  const summaryCards = [
    { title: "Total Entries", value: summary.totalEntries.toLocaleString(), icon: BarChart, gradient: "from-blue-500 to-indigo-500" },
    { title: "Total Net Amount", value: `₹${summary.totalNetAmount.toLocaleString('en-IN')}`, icon: Banknote, gradient: "from-green-500 to-lime-500" },
    { title: "Overdue Amount", value: `₹${summary.overdueAmount.toLocaleString('en-IN')}`, icon: AlertTriangle, gradient: "from-red-500 to-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <section className="grid grid-cols-3 gap-4">
        {actionButtons.map(btn => (
          <Button key={btn.label} className={`text-white font-semibold text-sm h-12 bg-gradient-to-r ${btn.gradient} hover:opacity-90 transition-opacity`}>
            <btn.icon className="mr-2 h-5 w-5" />
            {btn.label}
          </Button>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title} className="overflow-hidden shadow-lg">
            <div className={`p-5 bg-gradient-to-br ${card.gradient}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                <CardTitle className="text-sm font-medium text-white">{card.title}</CardTitle>
                <card.icon className="h-5 w-5 text-white/80" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-3xl font-bold text-white">{card.value}</div>
              </CardContent>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Overdue Parties</h2>
        {overdueParties.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {overdueParties.map((party) => (
              <Card key={party.party} className="shadow-md hover:shadow-xl transition-shadow bg-gradient-to-tr from-orange-50 to-yellow-50 border-l-4 border-orange-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-orange-600" />
                    {party.party}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Overdue Bills</p>
                    <p className="font-bold text-lg">{party.billCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-lg">₹{party.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
            <Card className="flex items-center justify-center p-10 border-dashed">
                <p className="text-muted-foreground">No overdue parties. Great job!</p>
            </Card>
        )}
      </section>
    </div>
  );
}
