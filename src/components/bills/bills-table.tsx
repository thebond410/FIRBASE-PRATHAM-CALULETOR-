
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
  const [fontSize, setFontSize] = React.useState(12);
  
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
        const storedFontSize = localStorage.getItem("billListFontSize");
        if (storedFontSize) {
          const newSize = parseInt(storedFontSize, 10);
          setFontSize(newSize);
          document.documentElement.style.setProperty('--bill-list-font-size', `${newSize}px`);
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

  const TableHeaderItem = ({ sortKey: key, label, className }: { sortKey: keyof CalculatedBill, label: string, className?: string }) => (
    <TableHead className={cn("p-1 text-white", className)}>
        <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto text-sm text-white hover:text-white/90">
            {label}
        </Button>
    </TableHead>
  );

  return (
    <>
      <div className="rounded-lg bg-card" style={{ fontSize: `${fontSize}px`}}>
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow className="bg-primary hover:bg-primary/90">
                    <TableHead className="w-[40px] p-1 text-white font-bold">Sr.</TableHead>
                    <TableHeaderItem sortKey="billDate" label="Date" className="bg-gradient-to-r from-blue-600 to-blue-500" />
                    <TableHeaderItem sortKey="billNo" label="Bill#" className="bg-gradient-to-r from-green-600 to-green-500"/>
                    <TableHeaderItem sortKey="party" label="Party" className="bg-gradient-to-r from-indigo-600 to-indigo-500"/>
                    <TableHeaderItem sortKey="netAmount" label="Net Amt" className="bg-gradient-to-r from-purple-600 to-purple-500"/>
                    <TableHeaderItem sortKey="creditDays" label="Cr. Days" className="bg-gradient-to-r from-pink-600 to-pink-500"/>
                    <TableHeaderItem sortKey="recDate" label="Rec. Date" className="bg-gradient-to-r from-red-600 to-red-500"/>
                    <TableHeaderItem sortKey="totalDays" label="Total Days" className="bg-gradient-to-r from-orange-600 to-orange-500"/>
                    <TableHeaderItem sortKey="interestDays" label="Int. Days" className="bg-gradient-to-r from-yellow-600 to-yellow-500"/>
                    <TableHeaderItem sortKey="interestAmount" label="Int. Amt" className="bg-gradient-to-r from-teal-600 to-teal-500"/>
                    <TableHead className="text-right p-1 text-white font-bold">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedData.map((bill, index) => (
                    <TableRow 
                        key={bill.id} 
                        onClick={() => handleRowClick(bill.id)}
                        className={cn('font-bold cursor-pointer my-2', selectedBillId === bill.id ? 'bg-yellow-200 dark:bg-yellow-800' : 'bg-card')}
                    >
                    <TableCell className="font-sans m-px p-1">{index + 1}</TableCell>
                    <TableCell className="font-bold text-primary/80 m-px p-1">{bill.billDate}</TableCell>
                    <TableCell className="font-bold text-primary/80 m-px p-1">{bill.billNo}</TableCell>
                    <TableCell className="font-bold text-primary/80 whitespace-nowrap m-px p-1 max-w-[10ch] truncate">{bill.party}</TableCell>
                    <TableCell className="m-px p-1">₹{bill.netAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="m-px p-1">{bill.creditDays}</TableCell>
                    <TableCell className="m-px p-1">{bill.recDate || '-'}</TableCell>
                    <TableCell className="m-px p-1">{bill.totalDays}</TableCell>
                    <TableCell className="m-px p-1">{bill.interestDays}</TableCell>
                    <TableCell className="m-px p-1">₹{bill.interestAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right m-px p-1">
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
