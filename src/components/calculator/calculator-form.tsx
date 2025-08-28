
"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bill } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, parse, format } from "date-fns";
import { Camera, Loader2, Save } from "lucide-react";
import { scanCheque } from "@/app/actions";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  billDate: z.string().min(1, "Bill date is required"),
  billNo: z.string().min(1, "Bill number is required"),
  party: z.string().min(1, "Party name is required"),
  companyName: z.string(),
  netAmount: z.coerce.number().min(0, "Net amount must be positive"),
  creditDays: z.coerce.number().int().min(0, "Credit days must be a positive integer"),
  recDate: z.string(),
  recAmount: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0),
  chequeNumber: z.string(),
  bankName: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const formats = ['yyyy-MM-dd', 'dd/MM/yyyy'];
    for (const fmt of formats) {
        const parsed = parse(dateStr, fmt, new Date());
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
}

export function CalculatorForm({ bill }: { bill?: Bill }) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      billDate: bill?.billDate ? format(parse(bill.billDate, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      billNo: bill?.billNo || "",
      party: bill?.party || "",
      companyName: bill?.companyName || "",
      netAmount: bill?.netAmount || 0,
      creditDays: bill?.creditDays || 30,
      recDate: bill?.recDate ? format(parse(bill.recDate, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd') : "",
      recAmount: bill?.recAmount || 0,
      interestRate: bill?.interestRate || 18,
      chequeNumber: bill?.chequeNumber || "",
      bankName: bill?.bankName || "",
    },
  });

  const watchedValues = useWatch({ control: form.control });

  const [totalDays, setTotalDays] = useState(0);
  const [interestDays, setInterestDays] = useState(0);
  const [interestAmount, setInterestAmount] = useState(0);

  useEffect(() => {
    const billDate = parseDate(watchedValues.billDate);
    const recDate = parseDate(watchedValues.recDate);
    
    if (billDate) {
      const endOfPeriod = recDate || new Date();
      const total = differenceInDays(endOfPeriod, billDate);
      setTotalDays(total > 0 ? total : 0);

      const interest = Math.max(0, total - (watchedValues.creditDays || 0));
      setInterestDays(interest);

      const amount = (watchedValues.netAmount * (watchedValues.interestRate / 100) / 365) * interest;
      setInterestAmount(Math.round(amount > 0 ? amount : 0));
    }
  }, [watchedValues]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        toast({
            title: "API Key Not Configured",
            description: "Please configure your Gemini API key in Settings.",
            variant: "destructive",
        });
        return;
    }

    setIsScanning(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const dataUri = reader.result as string;
      const result = await scanCheque({ photoDataUri: dataUri });
      if (result.success && result.data) {
        const { partyName, companyName, date, amount, chequeNumber, bankName } = result.data;
        form.setValue("party", partyName);
        form.setValue("companyName", companyName);
        if (date) {
            const parsed = parseDate(date);
            if(parsed) form.setValue("recDate", format(parsed, 'yyyy-MM-dd'));
        }
        form.setValue("recAmount", parseFloat(amount.replace(/[^0-9.]/g, '')) || 0);
        form.setValue("chequeNumber", chequeNumber);
        form.setValue("bankName", bankName);
        toast({ title: "Scan Successful", description: "Fields have been populated from the cheque." });
      } else {
        toast({ title: "Scan Failed", description: result.error, variant: "destructive" });
      }
      setIsScanning(false);
       if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
        toast({ title: "File Error", description: "Could not read the selected file.", variant: "destructive" });
        setIsScanning(false);
    }
  };


  function onSubmit(values: FormValues) {
    console.log(values);
    toast({
      title: "Bill Saved",
      description: "Bill details have been successfully saved.",
    });
  }
  
  const FormFieldInput = ({ name, label }: { name: keyof FormValues, label: string }) => (
    <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                    <Input {...field} type={name.includes('Date') ? 'date' : 'text'} className="h-9"/>
                </FormControl>
                <FormMessage />
            </FormItem>
        )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex justify-end">
            <label htmlFor="cheque-upload" className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground h-10 px-4 py-2 cursor-pointer bg-gradient-to-r from-accent to-primary hover:opacity-90`}>
                {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                Scan Cheque
            </label>
            <input id="cheque-upload" type="file" accept="image/jpeg, image/png" className="hidden" onChange={handleFileChange} ref={fileInputRef}/>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormFieldInput name="billDate" label="Bill Date" />
            <FormFieldInput name="billNo" label="Bill No" />
            <FormFieldInput name="party" label="Party Name" />
            <FormFieldInput name="companyName" label="Company Name" />
            <FormFieldInput name="netAmount" label="Net Amount" />
            <FormFieldInput name="creditDays" label="Credit Days" />
            <FormFieldInput name="recDate" label="Receipt Date" />
            <FormFieldInput name="recAmount" label="Receipt Amount" />
            <FormFieldInput name="chequeNumber" label="Cheque No" />
            <FormFieldInput name="bankName" label="Bank Name" />
            <FormFieldInput name="interestRate" label="Interest Rate (%)" />
            <div className="space-y-2">
                <Label>Total Days</Label>
                <Input value={totalDays} readOnly className="font-bold bg-muted h-9" />
            </div>
            <div className="space-y-2">
                <Label>Interest Days</Label>
                <Input value={interestDays} readOnly className="font-bold bg-muted h-9" />
            </div>
            <div className="space-y-2">
                <Label>Interest Amount (₹)</Label>
                <Input value={interestAmount.toLocaleString('en-IN')} readOnly className="font-bold bg-muted h-9" />
            </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="font-bold">
            <Save className="mr-2 h-4 w-4"/>
            Save Bill
          </Button>
        </div>
      </form>
    </Form>
  );
}
