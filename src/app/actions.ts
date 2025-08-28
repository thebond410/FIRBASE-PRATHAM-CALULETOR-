
'use server';

import { extractChequeData, type ExtractChequeDataInput } from '@/ai/flows/extract-cheque-data';
import { getSupabaseServerClient } from '@/lib/supabase';
import { Bill } from '@/lib/types';
import { parseDate } from '@/lib/utils';
import { format } from 'date-fns';

export async function scanCheque(input: ExtractChequeDataInput) {
    try {
        const result = await extractChequeData(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Cheque scan failed:", error);
        
        let errorMessage = "Scan failed. Please check the console for details.";
        if (error.message) {
            if (error.message.includes('API key not valid')) {
                errorMessage = "Scan failed: The provided API Key is not valid. Please check your settings.";
            } else if (error.message.includes('permission')) {
                 errorMessage = "Scan failed: The provided API Key is not valid or does not have permissions for this model. Please check your settings.";
            }
            else {
                errorMessage = `Scan failed: ${error.message}`;
            }
        }
        
        return { success: false, error: errorMessage };
    }
}

export async function importBillsFromCSV(csvText: string): Promise<{success: boolean, count?: number, error?: string}> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { success: false, error: "Supabase not configured. Please check your server environment variables." };

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        return { success: false, error: "CSV file must have a header row and at least one data row."};
    }

    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);

    const billsToInsert: Omit<Bill, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const row of rows) {
        const values = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
        if(values.length === 0) continue;
        
        const billData: any = {};
        header.forEach((key, index) => {
            billData[key] = values[index] || '';
        });

        const parsedDate = parseDate(billData.billDate);
        if (!parsedDate) {
            console.warn(`Skipping row due to invalid billDate format: ${row}. Expected dd/MM/yyyy.`);
            continue;
        }
        
        const parsedRecDate = billData.recDate ? parseDate(billData.recDate) : null;
        if (billData.recDate && !parsedRecDate) {
             console.warn(`Skipping row due to invalid recDate format: ${row}. Expected dd/MM/yyyy.`);
             continue;
        }

        billsToInsert.push({
            billDate: format(parsedDate, 'yyyy-MM-dd'),
            recDate: parsedRecDate ? format(parsedRecDate, 'yyyy-MM-dd') : null,
            billNo: billData.billNo || '',
            party: billData.party || '',
            companyName: billData.companyName || '',
            mobile: billData.mobile || '',
            chequeNumber: billData.chequeNumber || '',
            bankName: billData.bankName || '',
            interestPaid: billData.interestPaid === 'Yes' ? 'Yes' : 'No',
            netAmount: parseFloat(billData.netAmount) || 0,
            creditDays: parseInt(billData.creditDays) || 0,
            recAmount: parseFloat(billData.recAmount) || 0,
            interestRate: 0,
            pes: billData.pes || '',
            meter: billData.meter || '',
            rate: parseFloat(billData.rate) || 0
        });
    }

    if(billsToInsert.length === 0) {
        return { success: false, error: "No valid bill data found to import." };
    }

    try {
        const { error } = await supabase.from('bills').insert(billsToInsert);
        if (error) throw error;
        return { success: true, count: billsToInsert.length };
    } catch (err: any) {
        console.error("Error importing bills:", err);
        return { success: false, error: err.message };
    }
}

    