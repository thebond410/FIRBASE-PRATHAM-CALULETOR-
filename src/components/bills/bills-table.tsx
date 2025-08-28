
"use client";

import * as React from "react";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import type { CalculatedBill, BillTableColumn } from '@/lib/types';
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
import { billTableColumns } from "@/lib/types";

type SortKey = keyof CalculatedBill | null;

type ColumnConfig = {
  visibleColumns: string[];
  frozenColumns: string[];
};

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
  const [columnConfig, setColumnConfig] = React.useState<ColumnConfig>({
      visibleColumns: billTableColumns.map(c => c.id),
      frozenColumns: [],
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
        const storedFontSize = localStorage.getItem("billListFontSize");
        if (storedFontSize) {
          const newSize = parseInt(storedFontSize, 10);
          setFontSize(newSize);
        }
        const storedColumnConfig = localStorage.getItem("billListColumnConfig");
        if (storedColumnConfig) {
            setColumnConfig(JSON.parse(storedColumnConfig));
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

  const getColumnStyle = (isFrozen: boolean, index: number): React.CSSProperties => {
    if (!isFrozen) return {};
    
    const leftOffset = index * 100; // Adjust this value based on your column widths

    return {
        left: `${leftOffset}px`,
        zIndex: 20
    };
  };

  const visibleColumns = billTableColumns.filter(col => columnConfig.visibleColumns.includes(col.id));

  const frozenColumnStyles = React.useMemo(() => {
    let left = 45; // Corresponds to the width of Sr. No column
    const styles: { [key: string]: React.CSSProperties } = {};
    const frozen = visibleColumns.filter(c => columnConfig.frozenColumns.includes(c.id));

    frozen.forEach(col => {
      styles[col.id] = { left: `${left}px` };
      // rough estimate of column widths
      if (col.id === 'party') left += 120;
      else if (col.id === 'billNo') left += 80;
      else left += 100;
    });
    return styles;
  }, [columnConfig, visibleColumns]);

  return (
    <>
      <div className="rounded-lg bg-card" style={{ fontSize: `${fontSize}px`}}>
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow className="bg-primary hover:bg-primary/90">
                    <TableHead className="w-[45px] p-1 text-white font-bold sticky left-0 z-20 bg-primary">Sr.</TableHead>
                    {visibleColumns.map((col) => {
                        const isFrozen = columnConfig.frozenColumns.includes(col.id);
                        return (
                            <TableHead 
                                key={col.id} 
                                style={isFrozen ? frozenColumnStyles[col.id] : {}}
                                className={cn(
                                    "p-1 text-white",
                                    col.className,
                                    isFrozen && "sticky z-10 bg-gradient-to-r from-indigo-600 to-purple-600"
                                )}
                            >
                                <Button variant="ghost" onClick={() => handleSort(col.id as keyof CalculatedBill)} className="px-2 py-0 h-auto text-xs text-white hover:text-white/90 font-bold">
                                    {col.shortLabel}
                                </Button>
                            </TableHead>
                        );
                    })}
                    <TableHead className="text-right p-1 text-white font-bold sticky right-0 z-20 bg-primary">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedData.map((bill, index) => (
                    <TableRow 
                        key={bill.id} 
                        onClick={() => handleRowClick(bill.id)}
                        className={cn('font-bold cursor-pointer my-2', selectedBillId === bill.id ? 'bg-yellow-200 dark:bg-yellow-800' : 'bg-card')}
                        style={{ margin: '2px 0' }}
                    >
                    <TableCell className="font-sans m-px p-1 sticky left-0 z-10 bg-inherit w-[45px]">
                        {index + 1}
                    </TableCell>
                    {visibleColumns.map(col => {
                         const isFrozen = columnConfig.frozenColumns.includes(col.id);
                         return (
                            <TableCell
                                key={col.id}
                                style={isFrozen ? frozenColumnStyles[col.id] : {}}
                                className={cn(
                                    'font-bold text-primary/80 m-px p-1 whitespace-nowrap',
                                    isFrozen && 'sticky z-10 bg-inherit text-purple-800 dark:text-purple-300'
                                )}
                            >
                               {col.id === 'netAmount' || col.id === 'interestAmount' ? '₹' : ''}
                               {bill[col.id as keyof CalculatedBill]?.toLocaleString('en-IN')}
                            </TableCell>
                         );
                    })}
                    <TableCell className="text-right m-px p-1 sticky right-0 z-10 bg-inherit">
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

    