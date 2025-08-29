
"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, XCircle, Database, FileText, MessageSquare, Type, Columns, Pin, Copy, RefreshCw, Bot } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { billTableColumns, BillTableColumn } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  apiKey: z.string().min(1, "API Key is required."),
  supabaseUrl: z.string().optional(),
  supabaseKey: z.string().optional(),
  noRecDateTemplate: z.string(),
  pendingInterestTemplate: z.string(),
  paymentThanksTemplate: z.string(),
  billListFontSize: z.coerce.number().min(8).max(24),
  visibleColumns: z.array(z.string()),
  frozenColumns: z.array(z.string()),
  askForWhatsappOnSave: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;
type ApiStatus = "success" | "failed" | "unconfigured";

const defaultTemplates = {
    noRecDate: `Outstanding Bill\n\nDear [Party],\nMy Bill No. [Bill No], Dt: [Bill Date],\nRs. [Netamount], Total Days: [Total Days].\nInterest days.[interest days], \nInt. Rs.[Interest amt].\n\nFrom: [Company]\n\nDear Sir, this bill is overdue. Please make payment.`,
    pendingInterest: `!!	Jay Matadi  !!\nPending Interest…\n\nDear [Party],\nBill No. [Bill No], Dt: [Bill Date],\nRec Rs. [Recamount], Rec Dt: [Rec Date]\nTotal Days: [Total Days], Interest Days: [Interest Days],\nInterest Rs. [Interest Amount]\n\nPay this bill’s pending interest and close full payment.\n\nFrom: [Company].`,
    paymentThanks: `!!	Jay Matadi  !!\n\nThanks For Payment \n\nDear [Party],\nBill No. [Bill No], Dt: [Bill Date],\nRec Rs. [Recamount],\nRec Dt: [Rec Date]\nTotal Days: [Total Days], \nInterest Days: [Interest Days],\nInterest Rs. [Interest Amount]\n\nWe Proud Work with You...`
};

const placeholders = "[Party], [Bill No], [Bill Date], [Netamount], [Total Days], [interest days], [Interest amt], [Company], [Recamount], [Rec Date], [Interest Days], [Interest Amount]";

const sqlScripts = {
    bills: `
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    "billDate" DATE,
    "billNo" TEXT,
    party TEXT,
    "netAmount" NUMERIC,
    "creditDays" INTEGER,
    "recDate" DATE,
    "interestPaid" TEXT,
    mobile TEXT,
    "companyName" TEXT,
    "chequeNumber" TEXT,
    "bankName" TEXT,
    "recAmount" NUMERIC,
    pes TEXT,
    meter TEXT,
    rate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: Column names are quoted to preserve casing.
-- The 'created_at' and 'updated_at' columns are handled automatically by the database.
`.trim(),
    settings: `
CREATE TABLE settings (
  id BIGINT PRIMARY KEY,
  api_key TEXT,
  no_rec_date_template TEXT,
  pending_interest_template TEXT,
  payment_thanks_template TEXT,
  bill_list_font_size INT,
  visible_columns TEXT[],
  frozen_columns TEXT[],
  ask_for_whatsapp_on_save BOOLEAN,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS (Row Level Security) should be enabled for this table.
-- For this simple app, we will use a single row with id=1.
-- Make sure to insert this single row after creating the table.
INSERT INTO settings (id) values (1);
`.trim()
}

export function SettingsForm() {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("unconfigured");
  const [showSql, setShowSql] = useState<'bills' | 'settings' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const defaultVisibleColumns = useMemo(() => billTableColumns.map(c => c.id), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
      supabaseUrl: "",
      supabaseKey: "",
      noRecDateTemplate: defaultTemplates.noRecDate,
      pendingInterestTemplate: defaultTemplates.pendingInterest,
      paymentThanksTemplate: defaultTemplates.paymentThanks,
      billListFontSize: 11,
      visibleColumns: defaultVisibleColumns,
      frozenColumns: [],
      askForWhatsappOnSave: true,
    },
  });

  const watchedVisibleColumns = form.watch("visibleColumns");

  const loadSettingsFromLocalStorage = () => {
    try {
      const storedKey = localStorage.getItem("gemini_api_key");
      if (storedKey) {
        form.setValue("apiKey", storedKey);
        setApiStatus("success");
      } else {
        setApiStatus("unconfigured");
      }
      
      const storedSupabaseUrl = localStorage.getItem("supabase_url");
      if (storedSupabaseUrl) form.setValue("supabaseUrl", storedSupabaseUrl);
      
      const storedSupabaseKey = localStorage.getItem("supabase_key");
      if (storedSupabaseKey) form.setValue("supabaseKey", storedSupabaseKey);

      const storedTemplates = localStorage.getItem("whatsappTemplates");
      if (storedTemplates) {
          const parsed = JSON.parse(storedTemplates);
          form.setValue("noRecDateTemplate", parsed.noRecDate || defaultTemplates.noRecDate);
          form.setValue("pendingInterestTemplate", parsed.pendingInterest || defaultTemplates.pendingInterest);
          form.setValue("paymentThanksTemplate", parsed.paymentThanks || defaultTemplates.paymentThanks);
      }
      
      const storedFontSize = localStorage.getItem("billListFontSize");
      if (storedFontSize) {
        form.setValue("billListFontSize", parseInt(storedFontSize, 10));
      }

      const storedColumnConfig = localStorage.getItem("billListColumnConfig");
      if (storedColumnConfig) {
        const { visibleColumns, frozenColumns } = JSON.parse(storedColumnConfig);
        form.setValue("visibleColumns", visibleColumns || defaultVisibleColumns);
        form.setValue("frozenColumns", frozenColumns || []);
      }
      
      const storedAskForWhatsapp = localStorage.getItem("askForWhatsappOnSave");
      if (storedAskForWhatsapp) {
        form.setValue("askForWhatsappOnSave", JSON.parse(storedAskForWhatsapp));
      }


    } catch (error) {
        console.error("Could not access localStorage", error)
    }
  }

  useEffect(() => {
    loadSettingsFromLocalStorage();
  }, [defaultVisibleColumns, form]);


  const loadSettingsFromSupabase = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        toast({ title: "Supabase not configured", description: "Please configure Supabase URL and Key first.", variant: "destructive" });
        return;
      }
      setIsSyncing(true);
      try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;

        if (data) {
            form.setValue("apiKey", data.api_key || "");
            form.setValue("noRecDateTemplate", data.no_rec_date_template || defaultTemplates.noRecDate);
            form.setValue("pendingInterestTemplate", data.pending_interest_template || defaultTemplates.pendingInterest);
            form.setValue("paymentThanksTemplate", data.payment_thanks_template || defaultTemplates.paymentThanks);
            form.setValue("billListFontSize", data.bill_list_font_size || 11);
            form.setValue("visibleColumns", data.visible_columns || defaultVisibleColumns);
            form.setValue("frozenColumns", data.frozen_columns || []);
            form.setValue("askForWhatsappOnSave", data.ask_for_whatsapp_on_save ?? true);
            onSubmit(form.getValues(), false); // Save to local storage after fetching
            toast({ title: "Settings Loaded", description: "Successfully loaded settings from Supabase." });
        }
      } catch (error: any) {
        console.error("Error loading settings from Supabase:", error);
        toast({ title: "Load Failed", description: error.message, variant: "destructive" });
      } finally {
        setIsSyncing(false);
      }
  };


  async function onSubmit(values: FormValues, saveToSupabase = true) {
    try {
      // Always save to localStorage first
      localStorage.setItem("gemini_api_key", values.apiKey);
      if(values.supabaseUrl) localStorage.setItem("supabase_url", values.supabaseUrl);
      if(values.supabaseKey) localStorage.setItem("supabase_key", values.supabaseKey);
      
      const templates = {
          noRecDate: values.noRecDateTemplate,
          pendingInterest: values.pendingInterestTemplate,
          paymentThanks: values.paymentThanksTemplate,
      };
      localStorage.setItem("whatsappTemplates", JSON.stringify(templates));
      localStorage.setItem("billListFontSize", values.billListFontSize.toString());

      const columnConfig = {
        visibleColumns: values.visibleColumns,
        frozenColumns: values.frozenColumns,
      };
      localStorage.setItem("billListColumnConfig", JSON.stringify(columnConfig));
      localStorage.setItem("askForWhatsappOnSave", JSON.stringify(values.askForWhatsappOnSave));
      
      setApiStatus("success");

      if (saveToSupabase) {
        const supabase = getSupabaseClient();
         if (supabase) {
            setIsSyncing(true);
            try {
                const { error } = await supabase
                    .from('settings')
                    .update({ 
                        api_key: values.apiKey,
                        no_rec_date_template: values.noRecDateTemplate,
                        pending_interest_template: values.pendingInterestTemplate,
                        payment_thanks_template: values.paymentThanksTemplate,
                        bill_list_font_size: values.billListFontSize,
                        visible_columns: values.visibleColumns,
                        frozen_columns: values.frozenColumns,
                        ask_for_whatsapp_on_save: values.askForWhatsappOnSave,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', 1);

                if (error) throw error;
                toast({ title: "Settings Saved", description: "Your settings have been saved locally and to Supabase." });

            } catch (error: any) {
                console.error("Error saving settings to Supabase:", error);
                toast({ title: "Supabase Save Failed", description: error.message, variant: "destructive" });
            } finally {
                setIsSyncing(false);
            }
        } else {
             toast({ title: "Settings Saved Locally", description: "Your settings have been saved locally. Configure Supabase to save them to the cloud." });
        }
      } else {
        toast({ title: "Settings Saved Locally", description: "Settings have been updated locally." });
      }

    } catch (error) {
        console.error("Could not access localStorage", error);
        setApiStatus("failed");
        toast({
            title: "Save Failed",
            description: "Could not save settings to local storage.",
            variant: "destructive"
        })
    }
  }

  const handleCopySql = (script: 'bills' | 'settings') => {
    navigator.clipboard.writeText(sqlScripts[script]);
    toast({ title: "Copied!", description: `SQL script for ${script} table copied to clipboard.` });
  };

  const statusInfo = {
    success: { icon: CheckCircle2, text: "API Key is configured.", color: "text-green-500" },
    failed: { icon: XCircle, text: "Failed to save API Key.", color: "text-red-500" },
    unconfigured: { icon: AlertTriangle, text: "API Key is not configured.", color: "text-orange-500" },
  };

  const CurrentStatus = statusInfo[apiStatus];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="shadow-none border-0 p-0">
          <div className="p-0 pb-4">
            <div className="flex items-center gap-3">
                <KeyRound className="h-6 w-6 text-primary"/>
                <div>
                    <h2 className="text-lg font-bold">Gemini API Configuration</h2>
                    <p className="text-sm text-muted-foreground">Enter your API key to enable the cheque scanning feature.</p>
                </div>
            </div>
          </div>
          <div className="space-y-4 p-0">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-sm">Your Gemini API Key</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter your Gemini API Key"
                        {...field}
                        className="pr-10"
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className={`flex items-center gap-2 text-sm font-medium ${CurrentStatus.color}`}>
                <CurrentStatus.icon className="h-4 w-4" />
                <span>{CurrentStatus.text}</span>
            </div>
          </div>
        </div>
        
        <div className="shadow-none border-0 p-0">
          <div className="p-0 pb-4">
            <div className="flex items-center gap-3">
                <Bot className="h-6 w-6 text-primary"/>
                <div>
                    <h2 className="text-lg font-bold">Automation</h2>
                    <p className="text-sm text-muted-foreground">Configure automated actions within the app.</p>
                </div>
            </div>
          </div>
          <div className="space-y-4 p-0">
            <FormField
              control={form.control}
              name="askForWhatsappOnSave"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>WhatsApp Prompt on Save</FormLabel>
                        <FormDescription>
                            If enabled, you will be prompted to send a WhatsApp message after saving a bill.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="shadow-none border-0 p-0">
          <div className="p-0 pb-4">
            <div className="flex items-center gap-3">
                <Type className="h-6 w-6 text-primary"/>
                <div>
                    <h2 className="text-lg font-bold">Appearance</h2>
                    <p className="text-sm text-muted-foreground">Customize the look and feel of the application.</p>
                </div>
            </div>
          </div>
          <div className="space-y-4 p-0">
            <FormField
              control={form.control}
              name="billListFontSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-sm">Bill List Font Size (in pixels)</FormLabel>
                   <FormControl>
                        <Input type="number" min="8" max="24" {...field} />
                   </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="shadow-none border-0 p-0">
            <div className="p-0 pb-4">
                <div className="flex items-center gap-3">
                    <Columns className="h-6 w-6 text-primary"/>
                    <div>
                        <h2 className="text-lg font-bold">Column Visibility</h2>
                        <p className="text-sm text-muted-foreground">Select which columns to display in the bill list.</p>
                    </div>
                </div>
            </div>
            <div className="p-0">
                 <FormField
                    control={form.control}
                    name="visibleColumns"
                    render={() => (
                        <FormItem>
                            <div className="grid grid-cols-3 gap-2">
                                {billTableColumns.map((item) => (
                                    <FormField
                                        key={item.id}
                                        control={form.control}
                                        name="visibleColumns"
                                        render={({ field }) => {
                                            return (
                                                <FormItem
                                                    key={item.id}
                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                >
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...field.value, item.id])
                                                                    : field.onChange(
                                                                        field.value?.filter(
                                                                            (value) => value !== item.id
                                                                        )
                                                                    )
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        {item.label}
                                                    </FormLabel>
                                                </FormItem>
                                            )
                                        }}
                                    />
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <div className="shadow-none border-0 p-0">
            <div className="p-0 pb-4">
                <div className="flex items-center gap-3">
                    <Pin className="h-6 w-6 text-primary"/>
                    <div>
                        <h2 className="text-lg font-bold">Column Freezing</h2>
                        <p className="text-sm text-muted-foreground">Select up to 3 columns to freeze on the left side of the table.</p>
                    </div>
                </div>
            </div>
            <div className="p-0">
                <FormField
                    control={form.control}
                    name="frozenColumns"
                    render={() => (
                        <FormItem>
                            <div className="grid grid-cols-3 gap-2">
                            {billTableColumns
                                .filter(c => watchedVisibleColumns.includes(c.id))
                                .map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="frozenColumns"
                                    render={({ field }) => {
                                        return (
                                            <FormItem
                                                key={item.id}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                            >
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(item.id)}
                                                        disabled={!field.value?.includes(item.id) && field.value?.length >= 3}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...field.value, item.id])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                        (value) => value !== item.id
                                                                    )
                                                                )
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    {item.label}
                                                </FormLabel>
                                            </FormItem>
                                        )
                                    }}
                                />
                            ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <div className="shadow-none border-0 p-0">
            <div className="p-0 pb-4">
                <div className="flex items-center gap-3">
                    <Database className="h-6 w-6 text-primary"/>
                    <div>
                        <h2 className="text-lg font-bold">Supabase Configuration</h2>
                        <p className="text-sm text-muted-foreground">Enter your Supabase URL and Key to save data. Settings can be synced with the cloud.</p>
                    </div>
                </div>
            </div>
            <div className="space-y-4 p-0">
                <FormField
                    control={form.control}
                    name="supabaseUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-sm">Supabase URL</FormLabel>
                            <FormControl><Input placeholder="https://<project-ref>.supabase.co" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="supabaseKey"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-sm">Supabase Anon Key</FormLabel>
                            <div className="relative">
                            <FormControl>
                                <Input
                                    type={showSupabaseKey ? "text" : "password"}
                                    placeholder="Enter your Supabase anon key"
                                    {...field}
                                    value={field.value ?? ''}
                                    className="pr-10"
                                />
                            </FormControl>
                             <button
                                type="button"
                                onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                                >
                                {showSupabaseKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <Button type="button" onClick={loadSettingsFromSupabase} disabled={isSyncing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Loading...' : 'Load from Supabase'}
                </Button>
            </div>
             <div className="flex-col items-start gap-2 p-0 pt-4">
                <Label>SQL Table Scripts</Label>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowSql(showSql === 'bills' ? null : 'bills')}>
                        <FileText className="mr-2"/>
                        {showSql === 'bills' ? 'Hide' : 'Show'} Bills SQL
                    </Button>
                     <Button type="button" variant="outline" onClick={() => setShowSql(showSql === 'settings' ? null : 'settings')}>
                        <FileText className="mr-2"/>
                        {showSql === 'settings' ? 'Hide' : 'Show'} Settings SQL
                    </Button>
                </div>
                {showSql && (
                    <div className="relative w-full">
                        <Textarea readOnly value={sqlScripts[showSql]} rows={10} className="font-mono text-xs bg-muted pr-10"/>
                        <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => handleCopySql(showSql)}>
                            <Copy className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
             </div>
        </div>

        <div className="shadow-none border-0 p-0">
            <div className="p-0 pb-4">
                <div className="flex items-center gap-3">
                    <MessageSquare className="h-6 w-6 text-primary"/>
                    <div>
                        <h2 className="text-lg font-bold">WhatsApp Templates</h2>
                        <p className="text-sm text-muted-foreground">Edit the templates for WhatsApp messages. Available placeholders: <br/><code className="text-xs font-mono p-1 bg-muted rounded-sm">{placeholders}</code></p>
                    </div>
                </div>
            </div>
            <div className="space-y-4 p-0">
                 <FormField
                    control={form.control}
                    name="noRecDateTemplate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-sm">Template: Overdue Bill</FormLabel>
                            <FormControl><Textarea rows={6} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="pendingInterestTemplate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-sm">Template: Pending Interest</FormLabel>
                            <FormControl><Textarea rows={6} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="paymentThanksTemplate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-sm">Template: Payment Thanks</FormLabel>
                            <FormControl><Textarea rows={6} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={isSyncing}>
                {isSyncing ? 'Syncing...' : 'Save All Settings'}
            </Button>
        </div>
      </form>
    </Form>
  );
}

    