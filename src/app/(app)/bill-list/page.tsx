
"use client";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCalculatedBills } from '@/lib/data';
import { BillsTable } from '@/components/bills/bills-table';
import type { CalculatedBill } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function BillListPage() {
  const searchParams = useSearchParams();
  const partyFilter = searchParams.get('party');
  const [bills, setBills] = useState<CalculatedBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchBills = async () => {
      setIsLoading(true);
      let fetchedBills = await getCalculatedBills();
      if (partyFilter) {
        fetchedBills = fetchedBills.filter(bill => bill.party === partyFilter);
      }
      setBills(fetchedBills);
      setIsLoading(false);
    }
    fetchBills();
  }, [partyFilter]);

  if (isLoading) {
    return (
        <div className="p-0">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    )
  }


  return (
    <div className="p-0">
      {partyFilter && <h1 className="text-xl font-bold tracking-tight mb-2">Bills for {partyFilter}</h1>}
      <BillsTable data={bills} />
    </div>
  );
}

    