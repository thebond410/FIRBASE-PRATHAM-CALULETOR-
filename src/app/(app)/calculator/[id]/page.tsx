import { CalculatorForm } from "@/components/calculator/calculator-form";
import { getCalculatedBills } from "@/lib/data";

export default function EditCalculatorPage({ params }: { params: { id: string } }) {
  const bills = getCalculatedBills();
  const bill = bills.find(b => b.id.toString() === params.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Edit Bill</h1>
        </div>
      <CalculatorForm bill={bill} />
    </div>
  );
}
