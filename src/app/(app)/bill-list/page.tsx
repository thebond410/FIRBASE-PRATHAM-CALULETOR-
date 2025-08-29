
"use client";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getCalculatedBills } from '@/lib/data';
import { BillsTable } from '@/components/bills/bills-table';
import type { CalculatedBill } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseClient } from '@/lib/supabase';

export default function BillListPage() {
  const searchParams = useSearchParams();
  const partyFilter = searchParams.get('party');
  const [bills, setBills] = useState<CalculatedBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchBills = useCallback(async () => {
    // Avoid setting isLoading to true on re-fetches to prevent UI flashing
    const fetchedBills = await getCalculatedBills();
    if (partyFilter) {
      fetchedBills = fetchedBills.filter(bill => bill.party === partyFilter);
    }
    setBills(fetchedBills);
    setIsLoading(false);
  }, [partyFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchBills();

    const supabase = getSupabaseClient();
    if (!supabase) {
        console.log("Supabase client not available, real-time updates disabled.");
        return;
    };

    const channel = supabase.channel('realtime-bills-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' },
        (payload) => {
          console.log('Change received in bill list!', payload);
          fetchBills();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to real-time bill list updates!');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };

  }, [fetchBills]);

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
