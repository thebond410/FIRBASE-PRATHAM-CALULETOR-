
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
import { billTableColumns } from "@/lib/types";
import { deleteBill } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type SortKey = keyof CalculatedBill | null;
type SortConfig = {
    key: SortKey;
    order: 'asc' | 'desc';
}

type ColumnConfig = {
  visibleColumns: string[];
  frozenColumns: string[];
};

export function BillsTable({ data }: { data: CalculatedBill[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'billDate', order: 'desc' });
  const [billToDelete, setBillToDelete] = React.useState<CalculatedBill | null>(null);
  const [selectedBillId, setSelectedBillId] = React.useState<number | null>(null);
  const [whatsappTemplates, setWhatsappTemplates] = React.useState({
    noRecDate: ``,
    pendingInterest: ``,
    paymentThanks: ``
  });
  const [fontSize, setFontSize] = React.useState(11);
  const [columnConfig, setColumnConfig] = React.useState<ColumnConfig>({
      visibleColumns: billTableColumns.map(c => c.id),
      frozenColumns: [],
  });
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // This effect runs only once on mount to load settings from localStorage.
    try {
        const storedId = localStorage.getItem('selectedBillId');
        if (storedId) setSelectedBillId(JSON.parse(storedId));

        const storedTemplates = localStorage.getItem('whatsappTemplates');
        if (storedTemplates) {
            const parsedTemplates = JSON.parse(storedTemplates);
            setWhatsappTemplates({
                noRecDate: parsedTemplates.noRecDate || ``,
                pendingInterest: parsedTemplates.pendingInterest || ``,
                paymentThanks: parsedTemplates.paymentThanks || ``
            });
        }
        
        const storedFontSize = localStorage.getItem("billListFontSize");
        if (storedFontSize) setFontSize(parseInt(storedFontSize, 10));

        const storedColumnConfig = localStorage.getItem("billListColumnConfig");
        if (storedColumnConfig) setColumnConfig(JSON.parse(storedColumnConfig));
        
        const storedSortConfig = localStorage.getItem("billListSortConfig");
        if (storedSortConfig) setSortConfig(JSON.parse(storedSortConfig));

    } catch (error) {
        console.error("Could not access localStorage on mount", error);
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
    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.order === 'asc') {
        newOrder = 'desc';
    }
    const newSortConfig = { key, order: newOrder };
    setSortConfig(newSortConfig);
     try {
        localStorage.setItem("billListSortConfig", JSON.stringify(newSortConfig));
    } catch (error) {
        console.error("Could not write sort config to localStorage", error);
    }
  };

  const handleWhatsAppMessage = (bill: CalculatedBill) => {
    let templateKey: keyof typeof whatsappTemplates;
    
    if (!bill.recDate) {
      templateKey = 'noRecDate';
    } else if (bill.interestPaid === 'No') {
      templateKey = 'pendingInterest';
    } else {
      templateKey = 'paymentThanks';
    }

    const template = whatsappTemplates[templateKey];
    if (!template) {
        toast({ title: "Template not found", description: `WhatsApp template for '${templateKey}' is not configured in settings.`, variant: 'destructive'});
        return;
    }


    const message = template
      .replace(/\[Party\]/g, bill.party)
      .replace(/\[Bill No\]/g, bill.billNo)
      .replace(/\[Bill Date\]/g, bill.billDate ? format(new Date(bill.billDate), 'dd/MM/yy') : '')
      .replace(/\[Netamount\]/g, bill.netAmount.toLocaleString('en-IN'))
      .replace(/\[Total Days\]/g, bill.totalDays.toString())
      .replace(/\[interest days\]/g, bill.interestDays.toString())
      .replace(/\[Interest amt\]/g, bill.interestAmount.toFixed(2))
      .replace(/\[Company\]/g, bill.companyName)
      .replace(/\[Recamount\]/g, bill.recAmount.toLocaleString('en-IN'))
      .replace(/\[Rec Date\]/g, bill.recDate ? format(new Date(bill.recDate), 'dd/MM/yy') : '')
      .replace(/\[Interest Days\]/g, bill.interestDays.toString())
      .replace(/\[Interest Amount\]/g, bill.interestAmount.toFixed(2));

    const whatsappUrl = `https://wa.me/${bill.mobile}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDelete = async () => {
    if (!billToDelete) return;
    const result = await deleteBill(billToDelete.id);
    if (result.success) {
        toast({ title: "Bill Deleted", description: "The bill has been successfully deleted." });
        // The real-time subscription will trigger a re-fetch, so no need to manually update state.
    } else {
        toast({ title: "Delete Failed", description: result.error, variant: "destructive" });
    }
    setBillToDelete(null);
  };


  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      // Handle date sorting correctly
      if (sortConfig.key === 'billDate' || sortConfig.key === 'recDate') {
        const dateA = new Date(aValue as string).getTime();
        const dateB = new Date(bValue as string).getTime();
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        if (dateA < dateB) return sortConfig.order === 'asc' ? -1 : 1;
        if (dateA > dateB) return sortConfig.order === 'asc' ? 1 : -1;
        return 0;
      }
      
      if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

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
  }, [columnConfig.frozenColumns, visibleColumns]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check for invalid date which can result from parsing `null` or incorrect format
      if (isNaN(date.getTime())) return '';
      return format(date, 'dd/MM/yy');
    } catch (e) {
      return dateString; // fallback to original string if parsing fails
    }
  }

  const getRowClass = (bill: CalculatedBill) => {
    switch (bill.status) {
      case 'settled': return 'bg-green-100 dark:bg-green-900/30'; // Green
      case 'paid-interest-pending': return 'bg-blue-100 dark:bg-blue-900/30'; // Blue
      case 'overdue': return 'bg-red-100 dark:bg-red-900/30'; // Red
      default: return 'bg-card';
    }
  };

  const formatTotalDays = (days: number) => {
    return String(days).padStart(3, '0');
  }

  const truncateText = (text: string | null | undefined, maxLength: number): string => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }


  return (
    <>
      <div className="rounded-lg bg-card">
        <div ref={tableContainerRef} className="w-full overflow-x-auto">
            <Table style={{ fontSize: `${fontSize}px`}}>
                <TableHeader className="sticky top-0 z-30">
                <TableRow className="bg-primary hover:bg-primary/90">
                    <TableHead className="w-[45px] px-1 text-white font-bold sticky left-0 z-20 bg-primary h-auto py-0" style={{ fontSize: `${fontSize}px` }}>Sr.</TableHead>
                    {visibleColumns.map((col) => {
                        const isFrozen = columnConfig.frozenColumns.includes(col.id);
                        return (
                            <TableHead 
                                key={col.id} 
                                style={{
                                  ... (isFrozen ? frozenColumnStyles[col.id] : {}),
                                  fontSize: `${fontSize}px`
                                }}
                                className={cn(
                                    "px-1 text-white h-auto py-1",
                                    col.className,
                                    isFrozen && "sticky z-10 bg-gradient-to-r from-indigo-600 to-purple-600"
                                )}
                            >
                                <Button variant="ghost" onClick={() => handleSort(col.id as keyof CalculatedBill)} className="px-2 py-0 h-auto text-white hover:text-white/90 font-bold" style={{ fontSize: `${fontSize}px` }}>
                                    {col.shortLabel}
                                </Button>
                            </TableHead>
                        );
                    })}
                    <TableHead className="text-right px-1 text-white font-bold h-auto py-1 min-w-[100px]" style={{ fontSize: `${fontSize}px` }}>Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedData.map((bill, index) => {
                    const rowClass = getRowClass(bill);
                    return (
                    <TableRow 
                        key={bill.id} 
                        onClick={() => handleRowClick(bill.id)}
                        className={cn('h-4 font-bold cursor-pointer my-2', selectedBillId === bill.id ? 'bg-yellow-200 dark:bg-yellow-800' : rowClass)}
                        style={{ height: '4px', padding: '4px' }}
                    >
                    <TableCell className={cn("font-sans px-1 sticky left-0 z-10 w-[45px] py-1", selectedBillId === bill.id ? 'bg-yellow-200 dark:bg-yellow-800' : rowClass)} style={{ fontSize: `${fontSize}px` }}>
                        {index + 1}
                    </TableCell>
                    {visibleColumns.map(col => {
                         const isFrozen = columnConfig.frozenColumns.includes(col.id);
                         let cellValue: any = bill[col.id as keyof CalculatedBill];

                         if (col.id === 'billDate' || col.id === 'recDate') {
                            cellValue = formatDate(cellValue as string | null);
                         } else if (col.id === 'rate') {
                            cellValue = (cellValue as number).toFixed(2);
                         } else if (col.id === 'interestAmount') {
                            cellValue = Math.round(cellValue as number);
                         } else if (['party', 'bankName', 'companyName'].includes(col.id)) {
                            cellValue = truncateText(cellValue as string, 10);
                         }

                         return (
                            <TableCell
                                key={col.id}
                                style={{
                                  ... (isFrozen ? frozenColumnStyles[col.id] : {}),
                                  fontSize: `${fontSize}px`
                                }}
                                className={cn(
                                    'font-bold px-1 whitespace-nowrap py-1 text-black',
                                    'text-black',
                                    isFrozen && 'sticky z-10 text-purple-800 dark:text-purple-300',
                                    isFrozen && (selectedBillId === bill.id ? 'bg-yellow-200 dark:bg-yellow-800' : rowClass)
                                )}
                            >
                               {col.id === 'netAmount' || col.id === 'recAmount' || col.id === 'interestAmount' ? '₹' : ''}
                               {typeof cellValue === 'number' && !['rate', 'creditDays'].includes(col.id) ? cellValue.toLocaleString('en-IN') : cellValue}
                               
                            </TableCell>
                         );
                    })}
                    <TableCell className={cn("text-right px-1 min-w-[100px]", selectedBillId === bill.id ? 'bg-yellow-200 dark:bg-yellow-800' : rowClass)}>
                        <div className="flex items-center justify-end gap-[2px]">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); router.push(`/calculator/${bill.id}`)}}>
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); handleWhatsAppMessage(bill);}}>
                                <Smartphone className="h-3 w-3 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); setBillToDelete(bill)}}>
                                <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                        </div>
                    </TableCell>
                    </TableRow>
                )})}
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
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
