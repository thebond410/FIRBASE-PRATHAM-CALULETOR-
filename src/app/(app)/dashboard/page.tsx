
"use client";

import { useRouter } from 'next/navigation';
import { clearAllBills, getCalculatedBills } from '@/lib/data';
import { importBills } from '@/app/actions';
import type { CalculatedBill } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, BarChart, Banknote, AlertTriangle, User, Trash2, List, Loader2, KeyRound } from 'lucide-react';
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
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { billTableColumns, BillTableColumn } from '@/lib/types';
import { format } from 'date-fns';
import { getSupabaseClient } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


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

// Define which columns are for import/export. 
const importExportColumns: BillTableColumn[] = billTableColumns.filter(c => !['totalDays', 'interestDays', 'interestAmount'].includes(c.id));


function calculateSummaries(bills: CalculatedBill[]): { summary: Summary; overdueParties: OverdueParty[] } {
  if (!bills || bills.length === 0) {
    return {
      summary: { totalEntries: 0, totalNetAmount: 0, overdueAmount: 0 },
      overdueParties: [],
    };
  }

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
  const [isUploading, setIsUploading] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { summary, overdueParties } = useMemo(() => calculateSummaries(bills), [bills]);
  
  const fetchBills = useCallback(async () => {
    // Avoid setting isLoading to true on re-fetches to prevent UI flashing
    const fetchedBills = await getCalculatedBills();
    setBills(fetchedBills);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchBills();
    
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.log("Supabase client not available, real-time updates disabled.");
        return;
    };

    const channel = supabase.channel('realtime-bills')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' },
        (payload) => {
          console.log('Change received!', payload);
          // Just refetch all data to keep it simple
          fetchBills();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to real-time bill updates!');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };

  }, [fetchBills]);

  const summaryCards = [
    { title: "Total Entries", value: summary.totalEntries.toLocaleString(), icon: BarChart, gradient: "from-blue-500 to-indigo-500" },
    { title: "Total Net Amount", value: `₹${summary.totalNetAmount.toLocaleString('en-IN')}`, icon: Banknote, gradient: "from-green-500 to-lime-500" },
    { title: "Overdue Amount", value: `₹${summary.overdueAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: AlertTriangle, gradient: "from-red-500 to-orange-500" },
  ];
  
  const handlePartyClick = (partyName: string) => {
    router.push(`/bill-list?party=${encodeURIComponent(partyName)}`);
  };

  const handleClearData = async () => {
    if (clearPassword !== 'Manoj34001') {
      toast({
        title: 'Incorrect Password',
        description: 'The password you entered is incorrect. Data was not cleared.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await clearAllBills();
      // State will be updated by real-time sync
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
    setClearPassword('');
    setAlertOpen(false);
  };
  
  const handleDownloadTemplate = () => {
    const headers = importExportColumns.map(col => col.id);
    const sampleEntry = {
        billDate: '01/04/2024',
        billNo: '101',
        party: 'Sample Party Name',
        pes: 'Sample PES',
        meter: '123 Mtr',
        rate: 10.50,
        netAmount: 15000.00,
        creditDays: 30,
        interestPaid: 'No',
        recDate: '15/04/2024',
        recAmount: 15000.00,
        chequeNumber: '123456',
        bankName: 'Sample Bank',
        companyName: 'Sample Company',
        mobile: '9876543210'
    };
    
    // Ensure the order of values matches the headers
    const sampleEntryValues = headers.map(header => sampleEntry[header as keyof typeof sampleEntry] ?? '');
    const dataToExport = [sampleEntryValues];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bills");
    XLSX.writeFile(wb, "bill_import_template.xls");
  };

  const handleDownloadList = () => {
    if (bills.length === 0) {
      toast({ title: "No data to export", description: "There are no bills to download."});
      return;
    }

    const headers = importExportColumns.map(col => col.id);
    const data = bills.map(bill => {
        return importExportColumns.map(col => {
            const value = bill[col.id as keyof CalculatedBill];
             if (col.id === 'billDate' || col.id === 'recDate') {
                return value ? format(new Date(value as string), 'dd/MM/yyyy') : '';
             }
            return value;
        });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bill List");
    XLSX.writeFile(wb, "bill_list.xls");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
            toast({ title: "File Error", description: "Could not read the file content.", variant: "destructive"});
            setIsUploading(false);
            return;
        }
        try {
            const result = await importBills(arrayBuffer, file.type);
            if (result.success) {
                let description = `${result.count} bill(s) have been imported.`;
                if (result.skipped && result.skipped > 0) {
                    description += ` ${result.skipped} duplicate bill(s) were skipped.`;
                }
                toast({ title: "Import Successful", description });
                // Data will be updated via real-time sync
            } else {
                toast({ title: "Import Failed", description: result.error, variant: "destructive"});
            }
        } catch (error: any) {
             toast({ title: "Import Error", description: error.message, variant: "destructive"});
        } finally {
            setIsUploading(false);
        }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };


  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-4 gap-2">
            {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
            {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
         <div className="space-y-2">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-4 p-0">

      <section className="grid grid-cols-4 gap-2">
        <Button onClick={() => fileInputRef.current?.click()} className={`text-white font-semibold text-xs h-12 bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 transition-opacity`} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Upload
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xls, .xlsx" />

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

      <section className="grid grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="overflow-hidden border-0 shadow-lg">
            <div className={`bg-gradient-to-br ${card.gradient} p-2 md:p-4`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-0">
                <CardTitle className="text-[10px] md:text-sm font-medium text-white">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-base md:text-2xl font-bold text-white">{card.value}</div>
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
              <Card key={party.party} onClick={() => handlePartyClick(party.party)} className={cn("shadow-md border-0 bg-gradient-to-tr border-l-4 cursor-pointer p-0", partyCardColors[index % partyCardColors.length])}>
                <CardHeader className="p-2 pb-1">
                   <CardTitle className="flex items-start gap-2 text-[10px] font-bold h-8">
                        <User className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-tight">{party.party}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 p-2 pt-0 gap-1">
                  <div className="flex flex-col">
                    <p className="text-muted-foreground text-[11px]">Bills</p>
                    <p className="font-bold text-[11px]">{party.billCount}</p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-muted-foreground text-[11px]">Amount (Rs.)</p>
                    <p className="font-bold text-[11px]">₹{party.totalAmount.toLocaleString('en-IN')}</p>
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
      <AlertDialog open={isAlertOpen} onOpenChange={(open) => { setAlertOpen(open); if (!open) setClearPassword(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all bill data.
              <br />
              To confirm, please enter the login password.
            </AlertDialogDescription>
            <div className="pt-2">
                <Label htmlFor="clear-password" className="sr-only">Password</Label>
                <div className="relative">
                    <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="clear-password"
                        type="password"
                        placeholder="Password"
                        value={clearPassword}
                        onChange={(e) => setClearPassword(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleClearData}
              disabled={!clearPassword}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
