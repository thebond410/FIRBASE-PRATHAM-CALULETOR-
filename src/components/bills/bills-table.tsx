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

  const handleSort = (key: keyof CalculatedBill) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
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
        <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto font-semibold">
            {label}
        </Button>
    </TableHead>
  );

  return (
    <>
      <div className="rounded-lg border shadow-sm bg-card">
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[40px] p-1 font-semibold">Sr.</TableHead>
                    <TableHeaderItem sortKey="billDate" label="Bill Date" />
                    <TableHeaderItem sortKey="billNo" label="Bill No" />
                    <TableHeaderItem sortKey="party" label="Party" />
                    <TableHeaderItem sortKey="netAmount" label="Net Amt" />
                    <TableHeaderItem sortKey="creditDays" label="Cr. Days" />
                    <TableHeaderItem sortKey="recDate" label="Rec. Date" />
                    <TableHeaderItem sortKey="totalDays" label="Total Days" />
                    <TableHeaderItem sortKey="interestDays" label="Int. Days" />
                    <TableHeaderItem sortKey="interestAmount" label="Int. Amt" />
                    <TableHead className="text-right p-1 font-semibold">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedData.map((bill, index) => (
                    <TableRow key={bill.id} className={cn('font-mono text-xs', statusColors[bill.status])}>
                    <TableCell className="font-sans p-1">{index + 1}</TableCell>
                    <TableCell className="font-medium text-primary/80 p-1">{bill.billDate}</TableCell>
                    <TableCell className="font-medium text-primary/80 p-1">{bill.billNo}</TableCell>
                    <TableCell className="font-medium text-primary/80 whitespace-nowrap p-1 max-w-[150px] truncate">{bill.party}</TableCell>
                    <TableCell className="p-1">₹{bill.netAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="p-1">{bill.creditDays}</TableCell>
                    <TableCell className="p-1">{bill.recDate || '-'}</TableCell>
                    <TableCell className="p-1">{bill.totalDays}</TableCell>
                    <TableCell className="p-1">{bill.interestDays}</TableCell>
                    <TableCell className="p-1">₹{bill.interestAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right p-1">
                        <div className="flex items-center justify-end gap-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/calculator/${bill.id}`)}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <a href={`https://wa.me/${bill.mobile}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Smartphone className="h-4 w-4 text-green-500" />
                                </Button>
                            </a>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBillToDelete(bill)}>
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
