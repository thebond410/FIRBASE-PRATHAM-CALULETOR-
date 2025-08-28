
"use client";

import { useRouter } from 'next/navigation';
import { getCalculatedBills, clearAllBills, importBillsFromCSV } from '@/lib/data';
import type { CalculatedBill } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, BarChart, Banknote, AlertTriangle, User, Trash2, List } from 'lucide-react';
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
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { billTableColumns, BillTableColumn } from '@/lib/types';
import { format } from 'date-fns';

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

// Define which columns are for import/export to exclude calculated fields
const importExportColumns: BillTableColumn[] = billTableColumns.filter(
  (col) => !['totalDays', 'interestDays', 'interestAmount', 'interestRate'].includes(col.id)
);


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

const partyCardColors = [
  "from-orange-50 to-yellow-50 border-orange-400",
  "from-blue-50 to-indigo-50 border-blue-400",
  "from-green-50 to-lime-50 border-green-400",
  "from-pink-50 to-red-50 border-pink-400",
  "from-purple-50 to-violet-50 border-purple-400",
];

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [bills, setBills] = useState<CalculatedBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { summary, overdueParties } = calculateSummaries(bills);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchBills = async () => {
      setIsLoading(true);
      const fetchedBills = await getCalculatedBills();
      setBills(fetchedBills);
      setIsLoading(false);
    };
    fetchBills();
  }, []);

  const summaryCards = [
    { title: "Total Entries", value: summary.totalEntries.toLocaleString(), icon: BarChart, gradient: "from-blue-500 to-indigo-500" },
    { title: "Total Net Amount", value: `₹${summary.totalNetAmount.toLocaleString('en-IN')}`, icon: Banknote, gradient: "from-green-500 to-lime-500" },
    { title: "Overdue Amount", value: `₹${summary.overdueAmount.toLocaleString('en-IN')}`, icon: AlertTriangle, gradient: "from-red-500 to-orange-500" },
  ];
  
  const handlePartyClick = (partyName: string) => {
    router.push(`/bill-list?party=${encodeURIComponent(partyName)}`);
  };

  const handleClearData = async () => {
    try {
      await clearAllBills();
      setBills([]);
      toast({
        title: 'Data Cleared',
        description: 'All bill data has been permanently deleted.',
      });
    } catch (error: any) {
      toast({
        title: 'Error Clearing Data',
        description: error.message,
        variant: 'destructive',
      });
    }
    setAlertOpen(false);
  };
  
  const handleDownloadTemplate = () => {
    const headers = importExportColumns.map(col => col.id).join(',');
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'bill_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadList = () => {
    if (bills.length === 0) {
      toast({ title: "No data to export", description: "There are no bills to download."});
      return;
    }
    const headers = importExportColumns.map(col => col.id).join(',');
    const csvRows = bills.map(bill => {
        return importExportColumns.map(col => {
            const value = bill[col.id as keyof CalculatedBill];
             if (value instanceof Date) {
                return format(value, 'dd/MM/yyyy');
            }
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',');
    });

    const csvString = [headers, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'bill_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result;
        if (typeof text !== 'string') {
            toast({ title: "File Error", description: "Could not read the file content.", variant: "destructive"});
            return;
        }
        try {
            const result = await importBillsFromCSV(text);
            if (result.success) {
                toast({ title: "Import Successful", description: `${result.count} bills have been imported.`});
                const fetchedBills = await getCalculatedBills();
                setBills(fetchedBills); // Refresh the list
            } else {
                toast({ title: "Import Failed", description: result.error, variant: "destructive"});
            }
        } catch (error: any) {
             toast({ title: "Import Error", description: error.message, variant: "destructive"});
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };


  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col space-y-4 p-0">

      <section className="grid grid-cols-4 gap-2">
        <Button onClick={() => fileInputRef.current?.click()} className={`text-white font-semibold text-xs h-12 bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 transition-opacity`}>
            <Upload className="mr-1 h-4 w-4" />
            Upload
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />

        <Button onClick={handleDownloadTemplate} className={`text-white font-semibold text-xs h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 transition-opacity`}>
            <Download className="mr-1 h-4 w-4" />
            Template
        </Button>
        <Button onClick={handleDownloadList} className={`text-white font-semibold text-xs h-12 bg-gradient-to-r from-green-500 to-lime-500 hover:opacity-90 transition-opacity`}>
            <List className="mr-1 h-4 w-4" />
            List
        </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              This action cannot be undone. This will permanently delete all bill data from your Supabase table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleClearData}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    