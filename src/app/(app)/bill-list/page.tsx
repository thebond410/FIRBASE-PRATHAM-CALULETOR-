import { getCalculatedBills } from '@/lib/data';
import { BillsTable } from '@/components/bills/bills-table';

export default function BillListPage() {
  const bills = getCalculatedBills();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Bill List</h1>
      <BillsTable data={bills} />
    </div>
  );
}
