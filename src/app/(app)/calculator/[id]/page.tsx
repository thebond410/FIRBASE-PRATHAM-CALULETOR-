
'use client'

import { CalculatorForm } from "@/components/calculator/calculator-form";
import { getBillById } from "@/lib/data";
import { Bill } from "@/lib/types";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from 'next/navigation';

export default function EditCalculatorPage() {
  const params = useParams();
  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const id = params.id as string;

  useEffect(() => {
    const fetchBill = async () => {
        setIsLoading(true);
        const fetchedBill = await getBillById(Number(id));
        setBill(fetchedBill);
        setIsLoading(false);
    }
    if (id) {
        fetchBill();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-4 p-1">
            {Array.from({ length: 18 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }
  
  if (!bill) {
    return (
        <div className="p-4 text-center">
            <p>Bill not found.</p>
        </div>
    )
  }

  return (
    <div className="p-1">
      <CalculatorForm bill={bill} />
    </div>
  );
}

    