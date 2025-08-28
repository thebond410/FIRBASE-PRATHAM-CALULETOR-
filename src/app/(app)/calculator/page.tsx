import { CalculatorForm } from "@/components/calculator/calculator-form";

export default function NewCalculatorPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Calculator</h1>
        </div>
      <CalculatorForm />
    </div>
  );
}
