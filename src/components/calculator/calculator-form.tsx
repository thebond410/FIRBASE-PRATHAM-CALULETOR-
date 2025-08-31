
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bill, CalculatedBill } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Camera, Loader2, Save, Upload, Check, ChevronsUpDown, X } from "lucide-react";
import { scanCheque } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { saveBill, getParties, getUnpaidBillsByParty, getCompaniesByParty, findMatchingBill } from "@/lib/data";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, calculateBillDetails, parseDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    const parsed = typeof date === 'string' ? parseDate(date) : date;
    return parsed ? format(parsed, 'yyyy-MM-dd') : "";
}

export function CalculatorForm({ bill }: { bill?: Bill }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parties, setParties] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<Bill[]>([]);
  const [selectedBills, setSelectedBills] = useState<Bill[]>([]);
  
  const [isPartyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [isCompanyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [isBillNoPopoverOpen, setBillNoPopoverOpen] = useState(false);

  const [isWhatsAppAlertOpen, setWhatsAppAlertOpen] = useState(false);
  const [billForWhatsApp, setBillForWhatsApp] = useState<CalculatedBill | null>(null);
  const [askForWhatsapp, setAskForWhatsapp] = useState(true);
  const [whatsappTemplates, setWhatsappTemplates] = useState({
    noRecDate: ``,
    pendingInterest: ``,
    paymentThanks: ``
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: bill ? {
      id: bill.id,
      party: bill.party,
      billNos: [bill.billNo],
      companyName: bill.companyName,
      billDate: formatDateForInput(bill.billDate),
      netAmount: bill.netAmount,
      creditDays: bill.creditDays,
      recDate: formatDateForInput(bill.recDate),
      recAmount: bill.recAmount,
      chequeNumber: bill.chequeNumber,
      bankName: bill.bankName,
      mobile: bill.mobile,
      interestPaid: bill.interestPaid || 'No',
    } : {
      party: "",
      billNos: [],
      companyName: "",
      billDate: "",
      netAmount: 0,
      creditDays: 30,
      recDate: null,
      recAmount: 0,
      chequeNumber: "",
      bankName: "",
      mobile: "",
      interestPaid: 'No',
    },
  });

  const { control, setValue, getValues, trigger, formState } = form;

  const watchedParty = useWatch({ control, name: 'party' });
  const watchedCompanyName = useWatch({ control, name: 'companyName' });
  const watchedBillNos = useWatch({ control, name: 'billNos' });
  const watchedBillDate = useWatch({ control, name: 'billDate' });
  const watchedRecDate = useWatch({ control, name: 'recDate' });
  const watchedCreditDays = useWatch({ control, name: 'creditDays' });
  const watchedNetAmount = useWatch({ control, name: 'netAmount' });
  const watchedInterestPaid = useWatch({ control, name: 'interestPaid' });
  const watchedRecAmount = useWatch({ control, name: 'recAmount' });

  const [totalDays, setTotalDays] = useState(0);
  const [interestDays, setInterestDays] = useState(0);
  const [interestAmount, setInterestAmount] = useState(0);

  useEffect(() => {
    try {
      const storedAsk = localStorage.getItem("askForWhatsappOnSave");
      if (storedAsk) {
        setAskForWhatsapp(JSON.parse(storedAsk));
      }
       const storedTemplates = localStorage.getItem("whatsappTemplates");
        if (storedTemplates) {
            setWhatsappTemplates(JSON.parse(storedTemplates));
        }
    } catch (error) {
        console.error("Could not read from localStorage", error);
    }

    const fetchParties = async () => {
      const partyList = await getParties();
      setParties(partyList);
    };
    fetchParties();
  }, []);


  useEffect(() => {
    const fetchCompanies = async () => {
      if (watchedParty) {
        const companyList = await getCompaniesByParty(watchedParty);
        setCompanies(companyList);

        // If editing a bill, ensure its company is in the list
        if (bill && bill.party === watchedParty && bill.companyName && !companyList.includes(bill.companyName)) {
            setCompanies(prev => [...prev, bill.companyName!]);
        }
      } else {
        setCompanies([]);
      }
    };
    
    fetchCompanies();

    if (formState.dirtyFields.party) {
        setValue("companyName", "", { shouldDirty: true });
        setValue("billNos", [], { shouldDirty: true });
    }
  }, [watchedParty, bill, setValue, formState.dirtyFields.party]);


  useEffect(() => {
    const fetchBills = async () => {
      if (watchedParty) {
        const bills = await getUnpaidBillsByParty(watchedParty, watchedCompanyName);
        
        let finalBills = bills;
        // If we are editing a bill, make sure it is in the list of options, even if paid
        if (bill && bill.party === watchedParty) {
            if (!watchedCompanyName || bill.companyName === watchedCompanyName) {
                const isEditingBillInList = bills.some(b => b.id === bill.id);
                if (!isEditingBillInList) {
                    finalBills = [...bills, bill];
                }
            }
        }
        setUnpaidBills(finalBills);
      } else {
        setUnpaidBills([]);
      }
    };

    fetchBills();

    if (formState.dirtyFields.companyName) {
       setValue("billNos", []);
    }
  }, [watchedParty, watchedCompanyName, bill, formState.dirtyFields.companyName, setValue]);


  useEffect(() => {
    const newSelectedBills = unpaidBills.filter(b => watchedBillNos?.includes(b.billNo));
    setSelectedBills(newSelectedBills);
    
    if (newSelectedBills.length > 0) {
      const totalNetAmount = newSelectedBills.reduce((sum, b) => sum + b.netAmount, 0);
      setValue("netAmount", totalNetAmount, { shouldDirty: true });
      
      const timestamps = newSelectedBills
        .map(b => parseDate(b.billDate)?.getTime())
        .filter((t): t is number => t !== undefined && !isNaN(t));

      if (timestamps.length > 0) {
        const avgTimestamp = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
        const avgDate = new Date(avgTimestamp);
        setValue("billDate", formatDateForInput(avgDate), { shouldDirty: true });
      }
      
      setValue("creditDays", newSelectedBills[0].creditDays, { shouldDirty: true });
      setValue("mobile", newSelectedBills[0].mobile || "", { shouldDirty: true });
    } else if (!bill) {
      // Only reset if it's a new form, not an edit form that has its bill deselected
      setValue("netAmount", 0, { shouldDirty: true });
      setValue("billDate", "", { shouldDirty: true });
      setValue("creditDays", 30, { shouldDirty: true });
      setValue("mobile", "", { shouldDirty: true });
    }
  }, [watchedBillNos, unpaidBills, setValue, bill]);


  useEffect(() => {
    const billDate = parseDate(watchedBillDate);
    
    if (billDate) {
        const calculatedDetails = calculateBillDetails({
            id: bill?.id ?? 0, // Mock id
            billNo: watchedBillNos?.join(',') ?? '',
            billDate: watchedBillDate || '',
            netAmount: watchedNetAmount,
            creditDays: watchedCreditDays,
            recDate: watchedRecDate,
            interestPaid: watchedInterestPaid,
            recAmount: watchedRecAmount,
            party: watchedParty,
            companyName: watchedCompanyName || '',
            mobile: bill?.mobile ?? '',
            chequeNumber: bill?.chequeNumber ?? '',
            bankName: bill?.bankName ?? '',
            pes: bill?.pes ?? '', 
            meter: bill?.meter ?? '', 
            rate: bill?.rate ?? 0 
        });
        
        setTotalDays(calculatedDetails.totalDays);
        setInterestDays(calculatedDetails.interestDays);
        setInterestAmount(Math.round(calculatedDetails.interestAmount));
    } else {
      setTotalDays(0);
      setInterestDays(0);
      setInterestAmount(0);
    }
  }, [watchedBillDate, watchedRecDate, watchedCreditDays, watchedNetAmount, watchedBillNos, bill, watchedInterestPaid, watchedRecAmount, watchedParty, watchedCompanyName]);

  const triggerScan = useCallback(() => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        toast({
            title: "API Key Not Configured",
            description: "Please configure your Gemini API key in Settings.",
            variant: "destructive",
        });
        return false;
    }
    return true;
  }, [toast]);

  const handleCameraScanClick = () => {
    if (triggerScan()) {
        cameraInputRef.current?.click();
    }
  }

  const handleFileUploadClick = () => {
    if (triggerScan()) {
        fileInputRef.current?.click();
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const dataUri = reader.result as string;
      const result = await scanCheque({ photoDataUri: dataUri });
      if (result.success && result.data) {
        const { payeeName, partyName, date, amount, chequeNumber, bankName } = result.data;
        
        setValue("party", partyName, { shouldValidate: true, shouldDirty: true });
        setValue("companyName", payeeName, { shouldValidate: true, shouldDirty: true });
        
        const recAmount = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
        if (date) {
            const parsed = parseDate(date);
            if(parsed) setValue("recDate", format(parsed, 'yyyy-MM-dd'));
        }
        setValue("recAmount", recAmount);
        setValue("chequeNumber", chequeNumber);
        setValue("bankName", bankName);
        toast({ title: "Scan Successful", description: "Fields populated. Checking for matching bill..." });

        const matchingBill = await findMatchingBill(partyName, recAmount);
        if (matchingBill) {
            setTimeout(() => {
                setValue("billNos", [matchingBill.billNo], { shouldDirty: true, shouldValidate: true });
                 if (matchingBill.companyName && matchingBill.companyName !== payeeName) {
                    setValue("companyName", matchingBill.companyName, { shouldDirty: true, shouldValidate: true });
                }
            }, 100);
            toast({ title: "Bill Matched!", description: `Automatically selected bill #${matchingBill.billNo} for company ${matchingBill.companyName}.` });
        } else {
            toast({ title: "No Unique Bill Match", description: "Please select the company and bill manually.", variant: "default" });
        }

      } else {
        toast({ title: "Scan Failed", description: result.error, variant: "destructive" });
      }
      setIsScanning(false);
       if(event.target) {
        event.target.value = "";
      }
    };
    reader.onerror = () => {
        toast({ title: "File Error", description: "Could not read the selected file.", variant: "destructive" });
        setIsScanning(false);
    }
  };
  
  const getFormattedPhoneNumber = (mobile: string) => {
    if (!mobile) return "";
    const cleaned = mobile.replace(/\D/g, ''); // Remove non-digit characters
    if (cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    return `+91${cleaned}`;
  };

  const handleSendWhatsApp = () => {
    if (!billForWhatsApp) return;

    let templateKey: keyof typeof whatsappTemplates;
    
    if (!billForWhatsApp.recDate) {
      templateKey = 'noRecDate';
    } else if (billForWhatsApp.interestPaid === 'No') {
      templateKey = 'pendingInterest';
    } else {
      templateKey = 'paymentThanks';
    }

    const template = whatsappTemplates[templateKey];

    const message = template
      .replace(/\[Party\]/g, billForWhatsApp.party)
      .replace(/\[Bill No\]/g, billForWhatsApp.billNo)
      .replace(/\[Bill Date\]/g, billForWhatsApp.billDate ? format(new Date(billForWhatsApp.billDate), 'dd/MM/yy') : '')
      .replace(/\[Netamount\]/g, billForWhatsApp.netAmount.toLocaleString('en-IN'))
      .replace(/\[Total Days\]/g, billForWhatsApp.totalDays.toString())
      .replace(/\[interest days\]/g, billForWhatsApp.interestDays.toString())
      .replace(/\[Interest amt\]/g, billForWhatsApp.interestAmount.toFixed(2))
      .replace(/\[Company\]/g, billForWhatsApp.companyName)
      .replace(/\[Recamount\]/g, billForWhatsApp.recAmount.toLocaleString('en-IN'))
      .replace(/\[Rec Date\]/g, billForWhatsApp.recDate ? format(new Date(billForWhatsApp.recDate), 'dd/MM/yy') : '')
      .replace(/\[Interest Days\]/g, billForWhatsApp.interestDays.toString())
      .replace(/\[Interest Amount\]/g, billForWhatsApp.interestAmount.toFixed(2));

    const phoneNumber = getFormattedPhoneNumber(billForWhatsApp.mobile);
    if (!phoneNumber) {
        toast({ title: "No Mobile Number", description: `There is no mobile number associated with ${billForWhatsApp.party}.`, variant: 'destructive'});
        setWhatsAppAlertOpen(false);
        router.push('/bill-list');
        return;
    }

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setWhatsAppAlertOpen(false);
    router.push('/bill-list');
  };
  
  const handleNoWhatsApp = () => {
      setWhatsAppAlertOpen(false);
      router.push('/bill-list');
  };


  async function onSubmit(values: FormValues) {
    if (watchedBillNos.length === 0) {
      toast({ title: "No bills selected", description: "Please select at least one bill to save.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    
    const billsToSave = watchedBillNos.map(billNo => {
      const originalBill = unpaidBills.find(b => b.billNo === billNo) || (bill && bill.billNo === billNo ? bill : null);
      if (!originalBill) {
          toast({ title: `Error`, description: `Could not find original data for bill number ${billNo}.`, variant: "destructive" });
          return null;
      }
      return { ...originalBill, ...values };
    }).filter(b => b !== null) as (Bill & FormValues)[];
    
    if (billsToSave.length === 0) {
        setIsSaving(false);
        return;
    }

    const totalSelectedAmount = billsToSave.reduce((sum, b) => sum + b.netAmount, 0);

    let successCount = 0;
    let firstUpdatedBillForWhatsapp: Bill | null = null;
    
    for (const sBill of billsToSave) {
        const proportion = totalSelectedAmount > 0 ? sBill.netAmount / totalSelectedAmount : (1 / billsToSave.length);
        const distributedRecAmount = values.recAmount * proportion;
        
        const billDataToSave = {
            ...sBill,
            recDate: values.recDate,
            recAmount: bill ? values.recAmount : distributedRecAmount, // if editing, use full amount
            chequeNumber: values.chequeNumber || "",
            bankName: values.bankName || "",
            interestPaid: values.interestPaid,
            creditDays: values.creditDays,
            party: values.party,
            companyName: values.companyName || "",
            mobile: values.mobile || "",
            billNo: sBill.billNo,
            netAmount: sBill.netAmount,
            id: sBill.id
        };
        
        const result = await saveBill(billDataToSave);
        if(result.success) {
            successCount++;
            if (!firstUpdatedBillForWhatsapp) {
                firstUpdatedBillForWhatsapp = billDataToSave;
            }
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
      
      if (askForWhatsapp && firstUpdatedBillForWhatsapp) {
         const calculated = calculateBillDetails(firstUpdatedBillForWhatsapp);
         // If multiple bills are updated, create a summary for WhatsApp
         if (billsToSave.length > 1) {
             const combinedBillNo = billsToSave.map(b => b.billNo).join(', ');
             const summaryBill: CalculatedBill = {
                 ...calculated,
                 billNo: combinedBillNo,
                 netAmount: totalSelectedAmount,
                 recAmount: values.recAmount,
             };
             setBillForWhatsApp(summaryBill);
         } else {
            setBillForWhatsApp(calculated);
         }

         setWhatsAppAlertOpen(true);

      } else {
        router.push('/bill-list');
      }
    }
  }
  
  const FormFieldInput = ({ name, label, type = "text", readOnly = false }: { name: keyof FormValues, label: string, type?: string, readOnly?: boolean }) => (
    <FormField
        control={control}
        name={name}
        render={({ field }) => (
            <FormItem>
                <FormLabel className="text-[11px] font-bold">{label}</FormLabel>
                <FormControl>
                    <Input {...field} type={type} readOnly={readOnly} className={cn("h-9 text-[11px] font-bold", readOnly && "bg-muted")} value={field.value ?? ""} onChange={(e) => field.onChange( e.target.value)} />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}
    />
  );
  
  const InfoField = ({ label, value }: { label: string; value: string | number }) => (
     <div className="space-y-2">
        <Label className="text-[11px] font-bold">{label}</Label>
        <Input value={value} readOnly className="font-bold bg-muted h-9 text-[11px]" />
    </div>
  )

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
        <div className="flex justify-end gap-2 p-1">
            <Button type="button" onClick={handleCameraScanClick} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90">
                {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                Camera Scan
            </Button>
            <Button type="button" onClick={handleFileUploadClick} className="bg-gradient-to-r from-accent to-primary hover:opacity-90">
                {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload File
            </Button>
            <input 
              id="camera-scan" 
              type="file" 
              capture="environment" 
              className="hidden" 
              onChange={handleFileChange}
              ref={cameraInputRef}
            />
             <input 
              id="file-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
              ref={fileInputRef}
            />
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-4 p-1">
            {/* Row 1 */}
            <FormField
                control={control}
                name="party"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="text-[11px] font-bold">Party Name</FormLabel>
                        <Popover open={isPartyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between h-9 text-[11px] font-bold", !field.value && "text-muted-foreground")}>
                                        <span className="truncate">{field.value || "Select party"}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                               <ScrollArea className="h-72">
                                  <div className="p-1">
                                    {parties.length > 0 ? parties.map((p) => (
                                        <Button
                                            variant="ghost"
                                            key={p}
                                            onClick={() => {
                                                field.onChange(p);
                                                setPartyPopoverOpen(false);
                                            }}
                                            className="w-full justify-start text-left h-auto py-2 text-[11px] font-bold"
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", p === field.value ? "opacity-100" : "opacity-0")} />
                                            {p}
                                        </Button>
                                    )) : <p className="p-2 text-sm text-muted-foreground">No parties found.</p>}
                                  </div>
                               </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name="companyName"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="text-[11px] font-bold">Company Name</FormLabel>
                        <Popover open={isCompanyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
                            <PopoverTrigger asChild disabled={!watchedParty}>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between h-9 text-[11px] font-bold", !field.value && "text-muted-foreground")}>
                                        <span className="truncate">{field.value || "Select company"}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                               <ScrollArea className="h-72">
                                  <div className="p-1">
                                    {companies.length > 0 ? companies.map((c) => (
                                        <Button
                                            variant="ghost"
                                            key={c}
                                            onClick={() => {
                                                field.onChange(c);
                                                setCompanyPopoverOpen(false);
                                            }}
                                            className="w-full justify-start text-left h-auto py-2 text-[11px] font-bold"
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", c === field.value ? "opacity-100" : "opacity-0")} />
                                            {c}
                                        </Button>
                                    )) : <p className="p-2 text-sm text-muted-foreground">No companies found for this party.</p>}
                                  </div>
                               </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Controller
                control={control}
                name="billNos"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[11px] font-bold">Bill No(s)</FormLabel>
                        <Popover open={isBillNoPopoverOpen} onOpenChange={setBillNoPopoverOpen}>
                            <PopoverTrigger asChild disabled={!watchedParty}>
                                <FormControl>
                                    <Button variant="outline" className="w-full justify-between h-9 font-normal text-[11px]">
                                        <div className="flex flex-grow flex-wrap gap-1 items-center" style={{minHeight: '1rem'}}>
                                            {selectedBills.length > 0 ? (
                                                selectedBills.map(b => <Badge key={b.id} variant="secondary" className="text-[11px]">{b.billNo}</Badge>)
                                            ) : (
                                                <span className="text-muted-foreground">Select bills...</span>
                                            )}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <ScrollArea className="h-72">
                                    <div className="p-1">
                                    {unpaidBills.length > 0 ? unpaidBills.map((b) => {
                                        const isSelected = field.value.includes(b.billNo);
                                        return (
                                            <Button
                                                variant="ghost"
                                                key={b.id}
                                                onClick={() => {
                                                    const newValue = isSelected
                                                        ? field.value.filter((bn) => bn !== b.billNo)
                                                        : [...field.value, b.billNo];
                                                    field.onChange(newValue);
                                                }}
                                                className="w-full justify-start text-[11px] h-auto py-2"
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                                <div className="flex justify-between w-full">
                                                    <span>{b.billNo}</span>
                                                    <span className="text-muted-foreground text-xs">₹{b.netAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                            </Button>
                                        )
                                    }) : <p className="p-2 text-sm text-muted-foreground">No unpaid bills found.</p>}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Row 2 */}
            <FormFieldInput name="billDate" label="Bill Date" type="date" readOnly={true}/>
            <FormFieldInput name="netAmount" label="Net Amount" type="number" readOnly={true}/>
            <InfoField label="Total Days" value={totalDays}/>

            {/* Row 3 */}
            <FormField
                control={control}
                name="creditDays"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[11px] font-bold">Credit Days</FormLabel>
                        <FormControl>
                            <Input {...field} type="number" className="h-9 text-[11px] font-bold" onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <InfoField label="Interest Days" value={interestDays}/>
            <InfoField label="Interest Amount (₹)" value={interestAmount.toLocaleString('en-IN')}/>
            
            {/* Row 4 */}
            <FormFieldInput name="recDate" label="Receipt Date" type="date"/>
             <FormField
                control={control}
                name="recAmount"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[11px] font-bold">Receipt Amount</FormLabel>
                        <FormControl>
                            <Input {...field} type="number" className="h-9 text-[11px] font-bold" onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormFieldInput name="chequeNumber" label="Cheque No" />

            {/* Row 5 */}
            <FormFieldInput name="bankName" label="Bank Name" />
            <FormFieldInput name="mobile" label="Mobile No" readOnly={true}/>
            <FormField
                control={control}
                name="interestPaid"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[11px] font-bold">Interest Paid</FormLabel>
                        <FormControl>
                            <select {...field} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-[11px] font-bold ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
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
          <Button type="submit" size="lg" className="font-bold text-base" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
            Save Bill
          </Button>
        </div>
      </form>
    </Form>
    <AlertDialog open={isWhatsAppAlertOpen} onOpenChange={setWhatsAppAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send WhatsApp Message?</AlertDialogTitle>
            <AlertDialogDescription>
              The bill has been saved. Would you like to send a confirmation message to {billForWhatsApp?.party}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleNoWhatsApp}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendWhatsApp}>
              Yes, Send Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    
