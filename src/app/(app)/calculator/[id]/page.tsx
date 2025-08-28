import { CalculatorForm } from "@/components/calculator/calculator-form";
import { getCalculatedBills } from "@/lib/data";

export default function EditCalculatorPage({ params }: { params: { id: string } }) {
  const bills = getCalculatedBills();
  const bill = bills.find(b => b.id.toString() === params.id);

  return (
    <div>
      <CalculatorForm bill={bill} />
    </div>
  );
}
