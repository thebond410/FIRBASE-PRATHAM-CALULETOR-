
'use client'

import { CalculatorForm } from "@/components/calculator/calculator-form";
import { getBillById } from "@/lib/data";
import { Bill } from "@/lib/types";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditCalculatorPage({ params }: { params: { id: string } }) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBill = async () => {
        const fetchedBill = await getBillById(Number(params.id));
        setBill(fetchedBill);
        setIsLoading(false);
    }
    if (params.id) {
        fetchBill();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="p-1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-4 p-1">
            {Array.from({ length: 18 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-1">
      <CalculatorForm bill={bill ?? undefined} />
    </div>
  );
}

    