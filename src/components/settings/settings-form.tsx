
"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, XCircle, Database, FileText, MessageSquare, Type, Columns, Pin } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { billTableColumns, BillTableColumn } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
});

type FormValues = z.infer<typeof formSchema>;
type ApiStatus = "success" | "failed" | "unconfigured";

const defaultTemplates = {
    noRecDate: `Outstanding Bill\n\nDear [Party],\nMy Bill No. [Bill No], Dt: [Bill Date],\nRs. [Netamount], Total Days: [Total Days].\nInterest days.[interest days], \nInt. Rs.[Interest amt].\n\nFrom: [Company]\n\nDear Sir, this bill is overdue. Please make payment.`,
    pendingInterest: `!!	Jay Matadi  !!\nPending Interest…\n\nDear [Party],\nBill No. [Bill No], Dt: [Bill Date],\nRec Rs. [Recamount], Rec Dt: [Rec Date]\nTotal Days: [Total Days], Interest Days: [Interest Days],\nInterest Rs. [Interest Amount]\n\nPay this bill’s pending interest and close full payment.\n\nFrom: [Company].`,
    paymentThanks: `!!	Jay Matadi  !!\n\nThanks For Payment \n\nDear [Party],\nBill No. [Bill No], Dt: [Bill Date],\nRec Rs. [Recamount],\nRec Dt: [Rec Date]\nTotal Days: [Total Days], \nInterest Days: [Interest Days],\nInterest Rs. [Interest Amount]\n\nWe Proud Work with You...`
};

const placeholders = "[Party], [Bill No], [Bill Date], [Netamount], [Total Days], [interest days], [Interest amt], [Company], [Recamount], [Rec Date], [Interest Days], [Interest Amount]";

export function SettingsForm() {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("unconfigured");
  
  const defaultVisibleColumns = billTableColumns.map(c => c.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
      supabaseUrl: "",
      supabaseKey: "",
      noRecDateTemplate: defaultTemplates.noRecDate,
      pendingInterestTemplate: defaultTemplates.pendingInterest,
      paymentThanksTemplate: defaultTemplates.paymentThanks,
      billListFontSize: 12,
      visibleColumns: defaultVisibleColumns,
      frozenColumns: [],
    },
  });

  const watchedVisibleColumns = form.watch("visibleColumns");

  useEffect(() => {
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

    } catch (error) {
        console.error("Could not access localStorage", error)
    }
  }, [form, defaultVisibleColumns]);

  function onSubmit(values: FormValues) {
    try {
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
      document.documentElement.style.setProperty('--bill-list-font-size', `${values.billListFontSize}px`);

      const columnConfig = {
        visibleColumns: values.visibleColumns,
        frozenColumns: values.frozenColumns,
      };
      localStorage.setItem("billListColumnConfig", JSON.stringify(columnConfig));


      setApiStatus("success");
      toast({
        title: "Settings Saved",
        description: "Your settings have been successfully saved. Refresh the Bill List to see changes.",
      });
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

  const statusInfo = {
    success: { icon: CheckCircle2, text: "API Key is configured.", color: "text-green-500" },
    failed: { icon: XCircle, text: "Failed to save API Key.", color: "text-red-500" },
    unconfigured: { icon: AlertTriangle, text: "API Key is not configured.", color: "text-orange-500" },
  };

  const CurrentStatus = statusInfo[apiStatus];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
                <KeyRound className="h-6 w-6 text-primary"/>
                <div>
                    <CardTitle className="text-sm font-bold">Gemini API Configuration</CardTitle>
                    <CardDescription>Enter your API key to enable the cheque scanning feature.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
                <Type className="h-6 w-6 text-primary"/>
                <div>
                    <CardTitle className="text-sm font-bold">Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of the application.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Columns className="h-6 w-6 text-primary"/>
                    <div>
                        <CardTitle className="text-sm font-bold">Column Visibility</CardTitle>
                        <CardDescription>Select which columns to display in the bill list.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <FormField
                  control={form.control}
                  name="visibleColumns"
                  render={({ field }) => (
                      <FormItem>
                          <div className="grid grid-cols-3 gap-2">
                          {billTableColumns.map((col) => (
                              <FormItem key={col.id} className="flex items-center gap-2 space-y-0">
                                  <FormControl>
                                      <Checkbox
                                          checked={field.value?.includes(col.id)}
                                          onCheckedChange={(checked) => {
                                              const newValue = checked
                                                  ? [...field.value, col.id]
                                                  : field.value?.filter((value) => value !== col.id);
                                              field.onChange(newValue);
                                          }}
                                      />
                                  </FormControl>
                                  <FormLabel className="font-normal">{col.label}</FormLabel>
                              </FormItem>
                          ))}
                          </div>
                          <FormMessage />
                      </FormItem>
                  )}
                />
            </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Pin className="h-6 w-6 text-primary"/>
                    <div>
                        <CardTitle className="text-sm font-bold">Column Freezing</CardTitle>
                        <CardDescription>Select up to 3 columns to freeze on the left side of the table.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <FormField
                    control={form.control}
                    name="frozenColumns"
                    render={({ field }) => (
                        <FormItem>
                             <div className="grid grid-cols-3 gap-2">
                                {billTableColumns.filter(c => watchedVisibleColumns.includes(c.id)).map((col) => (
                                     <FormItem key={col.id} className="flex items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(col.id)}
                                                disabled={!field.value?.includes(col.id) && field.value?.length >= 3}
                                                onCheckedChange={(checked) => {
                                                    const newValue = checked
                                                        ? [...field.value, col.id]
                                                        : field.value?.filter((value) => value !== col.id);
                                                    field.onChange(newValue);
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">{col.label}</FormLabel>
                                    </FormItem>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Database className="h-6 w-6 text-primary"/>
                    <div>
                        <CardTitle className="text-sm font-bold">Supabase Configuration</CardTitle>
                        <CardDescription>Enter your Supabase URL and Key to save data.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="supabaseUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold text-sm">Supabase URL</FormLabel>
                            <FormControl><Input placeholder="https://<project-ref>.supabase.co" {...field} /></FormControl>
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
            </CardContent>
             <CardFooter>
                <Button variant="outline"><FileText className="mr-2"/>Export SQL Script</Button>
             </CardFooter>
        </Card>

        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <MessageSquare className="h-6 w-6 text-primary"/>
                    <div>
                        <CardTitle className="text-sm font-bold">WhatsApp Templates</CardTitle>
                        <CardDescription>Edit the templates for WhatsApp messages. Available placeholders: <br/><code className="text-xs font-mono p-1 bg-muted rounded-sm">{placeholders}</code></CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
            <Button type="submit" size="lg">Save All Settings</Button>
        </div>
      </form>
    </Form>
  );
}

    

    
