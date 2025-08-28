
"use client";

import { useRouter } from 'next/navigation';
import { getCalculatedBills } from '@/lib/data';
import type { CalculatedBill } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, BarChart, Banknote, AlertTriangle, User, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';
import { cn } from '@/lib/utils';


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
    { label: "Upload", icon: Upload, gradient: "from-teal-500 to-cyan-500" },
    { label: "Template", icon: Download, gradient: "from-blue-500 to-indigo-500" },
    { label: "List", icon: Download, gradient: "from-green-500 to-lime-500" },
];

const partyCardColors = [
  "from-orange-50 to-yellow-50 border-orange-400",
  "from-blue-50 to-indigo-50 border-blue-400",
  "from-green-50 to-lime-50 border-green-400",
  "from-pink-50 to-red-50 border-pink-400",
  "from-purple-50 to-violet-50 border-purple-400",
];

export default function DashboardPage() {
  const router = useRouter();
  const bills = getCalculatedBills();
  const { summary, overdueParties } = calculateSummaries(bills);
  const [isAlertOpen, setAlertOpen] = useState(false);

  const summaryCards = [
    { title: "Total Entries", value: summary.totalEntries.toLocaleString(), icon: BarChart, gradient: "from-blue-500 to-indigo-500" },
    { title: "Total Net Amount", value: `₹${summary.totalNetAmount.toLocaleString('en-IN')}`, icon: Banknote, gradient: "from-green-500 to-lime-500" },
    { title: "Overdue Amount", value: `₹${summary.overdueAmount.toLocaleString('en-IN')}`, icon: AlertTriangle, gradient: "from-red-500 to-orange-500" },
  ];
  
  const handlePartyClick = (partyName: string) => {
    router.push(`/bill-list?party=${encodeURIComponent(partyName)}`);
  };

  return (
    <div className="flex flex-col space-y-4 p-0">
      <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>

      <section className="grid grid-cols-4 gap-2">
        {actionButtons.map(btn => (
          <Button key={btn.label} className={`text-white font-semibold text-xs h-12 bg-gradient-to-r ${btn.gradient} hover:opacity-90 transition-opacity`}>
            <btn.icon className="mr-1 h-4 w-4" />
            {btn.label}
          </Button>
        ))}
         <Button onClick={() => setAlertOpen(true)} className="text-white font-semibold text-xs h-12 bg-gradient-to-r from-red-500 to-pink-500 hover:opacity-90 transition-opacity">
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
        </Button>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="overflow-hidden border-0 shadow-lg">
            <div className={`bg-gradient-to-br ${card.gradient} p-4`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                <CardTitle className="text-sm font-medium text-white">{card.title}</CardTitle>
                <card.icon className="h-5 w-5 text-white/80" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-bold text-white">{card.value}</div>
              </CardContent>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold tracking-tight">Overdue Parties</h2>
        {overdueParties.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
            {overdueParties.map((party, index) => (
              <Card key={party.party} onClick={() => handlePartyClick(party.party)} className={cn("shadow-md border-0 bg-gradient-to-tr border-l-4 cursor-pointer", partyCardColors[index % partyCardColors.length])}>
                <CardHeader className="p-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-5 w-5" />
                    {party.party}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 text-sm p-4 pt-0">
                  <div>
                    <p className="text-muted-foreground text-xs">Overdue Bills</p>
                    <p className="font-bold text-md">{party.billCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Amount</p>
                    <p className="font-bold text-md">₹{party.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
            <Card className="flex items-center justify-center border-dashed p-6">
                <p className="text-muted-foreground">No overdue parties. Great job!</p>
            </Card>
        )}
      </section>
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                console.log("Removing all data...");
                setAlertOpen(false);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
