
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
import { Camera, Loader2, Save, Upload } from "lucide-react";
import { scanCheque } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { saveBill } from "@/lib/data";
import { useRouter } from "next/navigation";


const formSchema = z.object({
  id: z.number().optional(),
  billDate: z.string().min(1, "Bill date is required"),
  billNo: z.string().min(1, "Bill number is required"),
  party: z.string().min(1, "Party name is required"),
  companyName: z.string(),
  netAmount: z.coerce.number().min(0, "Net amount must be positive"),
  creditDays: z.coerce.number().int().min(0, "Credit days must be a positive integer"),
  recDate: z.string().nullable(),
  recAmount: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0),
  interestPaid: z.enum(['Yes', 'No']),
  chequeNumber: z.string(),
  bankName: z.string(),
  pes: z.string(),
  meter: z.string(),
  rate: z.coerce.number().min(0),
  mobile: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const formats = ['yyyy-MM-dd', 'dd/MM/yyyy'];
    for (const fmt of formats) {
        const parsed = parse(dateStr, fmt, new Date());
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
}

const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    const parsed = parseDate(dateStr);
    return parsed ? format(parsed, 'yyyy-MM-dd') : "";
}

export function CalculatorForm({ bill }: { bill?: Bill }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: bill?.id,
      billDate: formatDateForInput(bill?.billDate) || format(new Date(), 'yyyy-MM-dd'),
      billNo: bill?.billNo || "",
      party: bill?.party || "",
      companyName: bill?.companyName || "",
      netAmount: bill?.netAmount || 0,
      creditDays: bill?.creditDays || 30,
      recDate: formatDateForInput(bill?.recDate),
      recAmount: bill?.recAmount || 0,
      interestRate: bill?.interestRate || 18,
      interestPaid: bill?.interestPaid || 'No',
      chequeNumber: bill?.chequeNumber || "",
      bankName: bill?.bankName || "",
      pes: bill?.pes || "",
      meter: bill?.meter || "",
      rate: bill?.rate || 0,
      mobile: bill?.mobile || "",
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


  async function onSubmit(values: FormValues) {
    setIsSaving(true);
    // @ts-ignore
    const result = await saveBill(values);
    setIsSaving(false);

    if (result.success) {
      toast({
        title: "Bill Saved",
        description: "Bill details have been successfully saved.",
      });
      router.push('/bill-list');
    } else {
       toast({
        title: "Save Failed",
        description: result.error,
        variant: "destructive"
      });
    }
  }
  
  const FormFieldInput = ({ name, label, type = "text" }: { name: keyof FormValues, label: string, type?: string }) => (
    <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                    {/* @ts-ignore */}
                    <Input {...field} type={type} className="h-9" value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
        <div className="flex justify-end gap-2 p-1">
            <Button type="button" onClick={() => fileInputRef.current?.click()} className="bg-gradient-to-r from-accent to-primary hover:opacity-90">
                {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Scan
            </Button>
            <label htmlFor="camera-scan" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground h-10 px-4 py-2 cursor-pointer bg-gradient-to-r from-accent to-primary hover:opacity-90">
                 <Camera className="mr-2 h-4 w-4" />
                Camera Scan
            </label>
            <input id="camera-scan" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange}/>
            <input id="upload-scan" type="file" accept="image/jpeg, image/png" className="hidden" onChange={handleFileChange} ref={fileInputRef}/>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-4 p-1">
            <FormFieldInput name="billDate" label="Bill Date" type="date" />
            <FormFieldInput name="billNo" label="Bill No" />
            <FormFieldInput name="party" label="Party Name" />
            <FormFieldInput name="companyName" label="Company Name" />
            <FormFieldInput name="mobile" label="Mobile No" />
            <FormFieldInput name="netAmount" label="Net Amount" type="number"/>
            <FormFieldInput name="creditDays" label="Credit Days" type="number"/>
            <FormFieldInput name="recDate" label="Receipt Date" type="date"/>
            <FormFieldInput name="recAmount" label="Receipt Amount" type="number"/>
            <FormFieldInput name="chequeNumber" label="Cheque No" />
            <FormFieldInput name="bankName" label="Bank Name" />
            <FormFieldInput name="interestRate" label="Interest Rate (%)" type="number"/>
            <FormField
                control={form.control}
                name="interestPaid"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Interest Paid</FormLabel>
                        <FormControl>
                            <select {...field} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                            </select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormFieldInput name="pes" label="PES" />
            <FormFieldInput name="meter" label="Meter" />
            <FormFieldInput name="rate" label="Rate" type="number"/>
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

        <div className="flex justify-end p-1">
          <Button type="submit" size="lg" className="font-bold" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
            {bill?.id ? 'Update Bill' : 'Save Bill'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
