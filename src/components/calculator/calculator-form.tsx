
"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bill } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, parse, format } from "date-fns";
import { Camera, Loader2, Save, Upload, Check, ChevronsUpDown, X } from "lucide-react";
import { scanCheque } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { saveBill, getParties, getUnpaidBillsByParty } from "@/lib/data";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  id: z.number().optional(),
  party: z.string().min(1, "Party name is required"),
  billNos: z.array(z.string()).min(1, "At least one bill number is required"),
  companyName: z.string().optional(),
  billDate: z.string().optional(),
  netAmount: z.coerce.number().min(0),
  creditDays: z.coerce.number().int().min(0, "Credit days must be a positive integer"),
  recDate: z.string().nullable(),
  recAmount: z.coerce.number().min(0),
  chequeNumber: z.string().optional(),
  bankName: z.string().optional(),
  mobile: z.string().optional(),
  interestPaid: z.enum(['Yes', 'No']),
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
  
  const [parties, setParties] = useState<string[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<Bill[]>([]);
  const [selectedBills, setSelectedBills] = useState<Bill[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      party: bill?.party || "",
      billNos: bill ? [bill.billNo] : [],
      companyName: bill?.companyName || "",
      billDate: formatDateForInput(bill?.billDate),
      netAmount: bill?.netAmount || 0,
      creditDays: bill?.creditDays || 30,
      recDate: formatDateForInput(bill?.recDate),
      recAmount: bill?.recAmount || 0,
      chequeNumber: bill?.chequeNumber || "",
      bankName: bill?.bankName || "",
      mobile: bill?.mobile || "",
      interestPaid: bill?.interestPaid || 'No',
    },
  });

  const watchedValues = useWatch({ control: form.control });

  const [totalDays, setTotalDays] = useState(0);
  const [interestDays, setInterestDays] = useState(0);
  const [interestAmount, setInterestAmount] = useState(0);

  useEffect(() => {
    const fetchParties = async () => {
      const partyList = await getParties();
      setParties(partyList);
    };
    fetchParties();
  }, []);

  useEffect(() => {
    const fetchBills = async () => {
      if (watchedValues.party) {
        const bills = await getUnpaidBillsByParty(watchedValues.party);
        setUnpaidBills(bills);
      } else {
        setUnpaidBills([]);
      }
    };
    fetchBills();
    // On party change, reset bill selections
    form.setValue("billNos", []);
  }, [watchedValues.party]);

  useEffect(() => {
    const newSelectedBills = unpaidBills.filter(b => watchedValues.billNos?.includes(b.billNo));
    setSelectedBills(newSelectedBills);
    
    if (newSelectedBills.length > 0) {
      const totalNetAmount = newSelectedBills.reduce((sum, b) => sum + b.netAmount, 0);
      form.setValue("netAmount", totalNetAmount);
      
      // Use the date and details from the first selected bill
      form.setValue("billDate", formatDateForInput(newSelectedBills[0].billDate));
      form.setValue("creditDays", newSelectedBills[0].creditDays);
      form.setValue("companyName", newSelectedBills[0].companyName);
      form.setValue("mobile", newSelectedBills[0].mobile);
    } else {
      form.setValue("netAmount", 0);
      form.setValue("billDate", "");
      form.setValue("creditDays", 30);
      form.setValue("companyName", "");
      form.setValue("mobile", "");
    }
  }, [watchedValues.billNos, unpaidBills]);


  useEffect(() => {
    const billDate = parseDate(watchedValues.billDate);
    const recDate = parseDate(watchedValues.recDate);
    
    if (billDate) {
      const endOfPeriod = recDate || new Date();
      const total = differenceInDays(endOfPeriod, billDate);
      setTotalDays(total > 0 ? total : 0);

      const interest = Math.max(0, total - (watchedValues.creditDays || 0));
      setInterestDays(interest);
      
      // Interest calculation based on user request
      const amount = (watchedValues.netAmount * 0.1717 / 365) * interest;
      setInterestAmount(Math.round(amount > 0 ? amount : 0));
    } else {
      setTotalDays(0);
      setInterestDays(0);
      setInterestAmount(0);
    }
  }, [watchedValues.billDate, watchedValues.recDate, watchedValues.creditDays, watchedValues.netAmount]);

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
    if (selectedBills.length === 0) {
      toast({ title: "No bills selected", description: "Please select at least one bill to save.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let successCount = 0;

    for (const sBill of selectedBills) {
        const billDataToSave = {
            ...sBill, // Start with existing bill data
            recDate: values.recDate,
            recAmount: values.recAmount, // This might need to be pro-rated if saving multiple
            chequeNumber: values.chequeNumber || "",
            bankName: values.bankName || "",
            interestPaid: values.interestPaid,
            creditDays: values.creditDays, // Use the (potentially edited) credit days
            // id is already in sBill
        };

        // @ts-ignore
        const result = await saveBill(billDataToSave);
        if(result.success) {
            successCount++;
        } else {
             toast({
                title: `Save Failed for Bill ${sBill.billNo}`,
                description: result.error,
                variant: "destructive"
             });
        }
    }
    setIsSaving(false);
    if (successCount > 0) {
       toast({
        title: "Bills Updated",
        description: `${successCount} bill(s) have been successfully updated.`,
      });
      router.push('/bill-list');
    }
  }
  
  const FormFieldInput = ({ name, label, type = "text", readOnly = false }: { name: keyof FormValues, label: string, type?: string, readOnly?: boolean }) => (
    <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                    <Input {...field} type={type} readOnly={readOnly} className={cn("h-9", readOnly && "bg-muted")} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}
    />
  );
  
  const InfoField = ({ label, value }: { label: string; value: string | number }) => (
     <div className="space-y-2">
        <Label>{label}</Label>
        <Input value={value} readOnly className="font-bold bg-muted h-9" />
    </div>
  )

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
            {/* Row 1 */}
            <FormField
                control={form.control}
                name="party"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Party Name</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between h-9", !field.value && "text-muted-foreground")}>
                                        {field.value ? parties.find((p) => p === field.value) : "Select party"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search party..." />
                                    <CommandEmpty>No party found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandList>
                                            {parties.map((p) => (
                                                <CommandItem
                                                    value={p}
                                                    key={p}
                                                    onSelect={() => {
                                                        form.setValue("party", p)
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", p === field.value ? "opacity-100" : "opacity-0")} />
                                                    {p}
                                                </CommandItem>
                                            ))}
                                        </CommandList>
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <Controller
                control={form.control}
                name="billNos"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Bill No(s)</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <div className="relative flex min-h-9 w-full items-center justify-end rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                                        <div className="flex flex-grow flex-wrap gap-1">
                                            {selectedBills.length > 0 ? (
                                                selectedBills.map(b => <Badge key={b.id} variant="secondary">{b.billNo}</Badge>)
                                            ) : (
                                                <span className="text-muted-foreground">Select bills...</span>
                                            )}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </div>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search bills..." />
                                    <CommandEmpty>No unpaid bills found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandList>
                                        {unpaidBills.map((b) => {
                                            const isSelected = field.value.includes(b.billNo);
                                            return (
                                                <CommandItem
                                                    key={b.id}
                                                    onSelect={() => {
                                                        const newValue = isSelected
                                                            ? field.value.filter((bn) => bn !== b.billNo)
                                                            : [...field.value, b.billNo];
                                                        field.onChange(newValue);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                                    <div className="flex justify-between w-full">
                                                        <span>{b.billNo}</span>
                                                        <span className="text-muted-foreground text-xs">₹{b.netAmount.toLocaleString('en-IN')}</span>
                                                    </div>
                                                </CommandItem>
                                            )
                                        })}
                                        </CommandList>
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormFieldInput name="companyName" label="Company Name" readOnly={true} />

            {/* Row 2 */}
            <FormFieldInput name="billDate" label="Bill Date" type="date" readOnly={true}/>
            <FormFieldInput name="netAmount" label="Net Amount" type="number" readOnly={true}/>
            <InfoField label="Total Days" value={totalDays}/>

            {/* Row 3 */}
            <FormFieldInput name="creditDays" label="Credit Days" type="number" />
            <InfoField label="Interest Days" value={interestDays}/>
            <InfoField label="Interest Amount (₹)" value={interestAmount.toLocaleString('en-IN')}/>
            
            {/* Row 4 */}
            <FormFieldInput name="recDate" label="Receipt Date" type="date"/>
            <FormFieldInput name="recAmount" label="Receipt Amount" type="number"/>
            <FormFieldInput name="chequeNumber" label="Cheque No" />

            {/* Row 5 */}
            <FormFieldInput name="bankName" label="Bank Name" />
            <FormFieldInput name="mobile" label="Mobile No" readOnly={true}/>
            <div />

             {/* Row 6 */}
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
        </div>

        <div className="flex justify-end p-1">
          <Button type="submit" size="lg" className="font-bold" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
            Save Bill
          </Button>
        </div>
      </form>
    </Form>
  );
}

    