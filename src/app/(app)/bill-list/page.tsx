
"use client";
import { useSearchParams } from 'next/navigation';
import { getCalculatedBills } from '@/lib/data';
import { BillsTable } from '@/components/bills/bills-table';

export default function BillListPage() {
  const searchParams = useSearchParams();
  const partyFilter = searchParams.get('party');
  
  let bills = getCalculatedBills();

  if (partyFilter) {
    bills = bills.filter(bill => bill.party === partyFilter);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Bill List {partyFilter && `for ${partyFilter}`}</h1>
      <BillsTable data={bills} />
    </div>
  );
}

    