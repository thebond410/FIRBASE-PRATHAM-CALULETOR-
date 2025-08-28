"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const formSchema = z.object({
  apiKey: z.string().min(1, "API Key is required."),
});

type FormValues = z.infer<typeof formSchema>;
type ApiStatus = "success" | "failed" | "unconfigured";

export function SettingsForm() {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("unconfigured");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("gemini_api_key");
      if (storedKey) {
        form.setValue("apiKey", storedKey);
        setApiStatus("success");
      } else {
        setApiStatus("unconfigured");
      }
    } catch (error) {
        console.error("Could not access localStorage", error)
    }
  }, [form]);

  function onSubmit(values: FormValues) {
    try {
      localStorage.setItem("gemini_api_key", values.apiKey);
      setApiStatus("success");
      toast({
        title: "API Key Saved",
        description: "Your Gemini API key has been successfully saved.",
      });
    } catch (error) {
        console.error("Could not access localStorage", error);
        setApiStatus("failed");
        toast({
            title: "Save Failed",
            description: "Could not save API key to local storage.",
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
            <KeyRound className="h-6 w-6 text-primary"/>
            <div>
                <CardTitle>Gemini API Configuration</CardTitle>
                <CardDescription>Enter your API key to enable the cheque scanning feature.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Gemini API Key</FormLabel>
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
            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-sm font-medium ${CurrentStatus.color}`}>
                    <CurrentStatus.icon className="h-4 w-4" />
                    <span>{CurrentStatus.text}</span>
                </div>
              <Button type="submit">Save Key</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
