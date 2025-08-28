
"use client";

import * as React from "react";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import type { CalculatedBill } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Smartphone } from 'lucide-react';

const statusColors = {
  overdue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
  'paid-interest-pending': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
  settled: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
  pending: 'bg-gray-100 dark:bg-gray-700/50',
};

type SortKey = keyof CalculatedBill | null;

export function BillsTable({ data }: { data: CalculatedBill[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = React.useState<SortKey>('billDate');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [billToDelete, setBillToDelete] = React.useState<CalculatedBill | null>(null);
  const [selectedBillId, setSelectedBillId] = React.useState<number | null>(null);
  const [whatsappTemplates, setWhatsappTemplates] = React.useState({
    noRecDate: `Outstanding Bill\n\nDear [Party],\nMy Bill No. [Bill No], Dt: [Bill Date],\nRs. [Netamount], Total Days: [Total Days].\nInterest days.[interest days], \nInt. Rs.[Interest amt].\n\nFrom: [Company]\n\nDear Sir, this bill is overdue. Please make payment.`,
    pendingInterest: `!!	Jay Matadi  !!\nPending Interest…\n\nDear [Party],\nBill No. [Bill No], Dt: [Bill Date],\nRec Rs. [Recamount], Rec Dt: [Rec Date]\nTotal Days: [Total Days], Interest Days: [Interest Days],\nInterest Rs. [Interest Amount]\n\nPay this bill’s pending interest and close full payment.\n\nFrom: [Company].`,
    paymentThanks: `!!	Jay Matadi  !!\n\nThanks For Payment \n\nDear [Party],\nBill No. [Bill No], Dt: [Bill Date],\nRec Rs. [Recamount],\nRec Dt: [Rec Date]\nTotal Days: [Total Days], \nInterest Days: [Interest Days],\nInterest Rs. [Interest Amount]\n\nWe Proud Work with You...`
  });
  
  React.useEffect(() => {
    try {
        const storedId = localStorage.getItem('selectedBillId');
        if (storedId) {
            setSelectedBillId(JSON.parse(storedId));
        }
        const storedTemplates = localStorage.getItem('whatsappTemplates');
        if (storedTemplates) {
            setWhatsappTemplates(JSON.parse(storedTemplates));
        }
    } catch (error) {
        console.error("Could not access localStorage", error);
    }
  }, []);

  const handleRowClick = (billId: number) => {
    try {
        localStorage.setItem('selectedBillId', JSON.stringify(billId));
        setSelectedBillId(billId);
    } catch (error) {
        console.error("Could not write to localStorage", error);
    }
  };


  const handleSort = (key: keyof CalculatedBill) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleWhatsAppMessage = (bill: CalculatedBill) => {
    let template;
    if (!bill.recDate) {
      template = whatsappTemplates.noRecDate;
    } else if (bill.interestPaid === 'No') {
      template = whatsappTemplates.pendingInterest;
    } else {
      template = whatsappTemplates.paymentThanks;
    }
    
    const message = template
      .replace(/\[Party\]/g, bill.party)
      .replace(/\[Bill No\]/g, bill.billNo)
      .replace(/\[Bill Date\]/g, bill.billDate)
      .replace(/\[Netamount\]/g, bill.netAmount.toLocaleString('en-IN'))
      .replace(/\[Total Days\]/g, bill.totalDays.toString())
      .replace(/\[interest days\]/g, bill.interestDays.toString())
      .replace(/\[Interest amt\]/g, bill.interestAmount.toLocaleString('en-IN'))
      .replace(/\[Company\]/g, bill.companyName)
      .replace(/\[Recamount\]/g, bill.recAmount.toLocaleString('en-IN'))
      .replace(/\[Rec Date\]/g, bill.recDate || '')
      .replace(/\[Interest Days\]/g, bill.interestDays.toString())
      .replace(/\[Interest Amount\]/g, bill.interestAmount.toLocaleString('en-IN'));
      
    const whatsappUrl = `https://wa.me/${bill.mobile}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortOrder]);

  const TableHeaderItem = ({ sortKey: key, label }: { sortKey: keyof CalculatedBill, label: string }) => (
    <TableHead className="p-1">
        <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto font-bold text-sm">
            {label}
        </Button>
    </TableHead>
  );

  return (
    <>
      <div className="rounded-lg bg-card">
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[40px] p-1 font-bold text-sm">Sr.</TableHead>
                    <TableHeaderItem sortKey="billDate" label="Bill Date" />
                    <TableHeaderItem sortKey="billNo" label="Bill No" />
                    <TableHeaderItem sortKey="party" label="Party" />
                    <TableHeaderItem sortKey="netAmount" label="Net Amt" />
                    <TableHeaderItem sortKey="creditDays" label="Cr. Days" />
                    <TableHeaderItem sortKey="recDate" label="Rec. Date" />
                    <TableHeaderItem sortKey="totalDays" label="Total Days" />
                    <TableHeaderItem sortKey="interestDays" label="Int. Days" />
                    <TableHeaderItem sortKey="interestAmount" label="Int. Amt" />
                    <TableHead className="text-right p-1 font-bold text-sm">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedData.map((bill, index) => (
                    <TableRow 
                        key={bill.id} 
                        onClick={() => handleRowClick(bill.id)}
                        className={cn('font-mono text-xs cursor-pointer', selectedBillId === bill.id ? 'bg-yellow-200 dark:bg-yellow-800' : statusColors[bill.status])}
                    >
                    <TableCell className="font-sans m-px p-0">{index + 1}</TableCell>
                    <TableCell className="font-medium text-primary/80 m-px p-0">{bill.billDate}</TableCell>
                    <TableCell className="font-medium text-primary/80 m-px p-0">{bill.billNo}</TableCell>
                    <TableCell className="font-medium text-primary/80 whitespace-nowrap m-px p-0 max-w-[10ch] truncate">{bill.party}</TableCell>
                    <TableCell className="m-px p-0">₹{bill.netAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="m-px p-0">{bill.creditDays}</TableCell>
                    <TableCell className="m-px p-0">{bill.recDate || '-'}</TableCell>
                    <TableCell className="m-px p-0">{bill.totalDays}</TableCell>
                    <TableCell className="m-px p-0">{bill.interestDays}</TableCell>
                    <TableCell className="m-px p-0">₹{bill.interestAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right m-px p-0">
                        <div className="flex items-center justify-end gap-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); router.push(`/calculator/${bill.id}`)}}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleWhatsAppMessage(bill);}}>
                                <Smartphone className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); setBillToDelete(bill)}}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
      </div>
      <AlertDialog open={!!billToDelete} onOpenChange={(open) => !open && setBillToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bill for <span className="font-bold">{billToDelete?.party}</span> (Bill No: {billToDelete?.billNo}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                console.log("Deleting bill:", billToDelete?.id);
                setBillToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
