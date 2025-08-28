
'use server';

import { extractChequeData, type ExtractChequeDataInput } from '@/ai/flows/extract-cheque-data';
import { getSupabaseServerClient } from '@/lib/supabase';
import { Bill } from '@/lib/types';
import { parseDate } from '@/lib/utils';
import { format } from 'date-fns';
import * as xlsx from 'xlsx';

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

function parseCSV(text: string): Record<string, any>[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);

    return rows.map(row => {
        // This regex handles comma-separated values, including those enclosed in double quotes.
        const values = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
        if (values.length === 0) return null;
        
        const rowData: any = {};
        header.forEach((key, index) => {
            rowData[key] = values[index] || '';
        });
        return rowData;
    }).filter(Boolean) as Record<string, any>[];
}

function parseExcel(buffer: ArrayBuffer): Record<string, any>[] {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // This will produce an array of JSON objects, where keys are the header names.
    return xlsx.utils.sheet_to_json(worksheet);
}


export async function importBills(fileBuffer: ArrayBuffer, fileType: string): Promise<{success: boolean, count?: number, error?: string, skipped?: number}> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { success: false, error: "Supabase not configured. Please check your server environment variables." };

    let jsonData: Record<string, any>[] = [];

    try {
        if (fileType === 'text/csv') {
            const csvText = new TextDecoder().decode(fileBuffer);
            jsonData = parseCSV(csvText);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'application/vnd.ms-excel') {
            jsonData = parseExcel(fileBuffer);
        } else {
            return { success: false, error: `Unsupported file type: ${fileType}` };
        }
    } catch (parseError: any) {
        console.error("Error parsing file:", parseError);
        return { success: false, error: `Failed to parse the file: ${parseError.message}` };
    }


    if (jsonData.length === 0) {
        return { success: false, error: "No data found in the file."};
    }
    
    const billsFromFile: Omit<Bill, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const billData of jsonData) {
        // Create a mapping of lowercase, space-removed header names to their original keys
        const keyMap: { [key: string]: string } = {};
        for (const key in billData) {
            keyMap[key.replace(/\s+/g, '').toLowerCase()] = key;
        }

        // Helper function to safely get values using the mapped keys
        const getValue = (key: string) => {
            const mappedKey = keyMap[key.toLowerCase().replace(/\s+/g, '')];
            return mappedKey ? billData[mappedKey] : undefined;
        };

        const parsedDate = parseDate(getValue('billDate'));
        if (!parsedDate) {
            console.warn(`Skipping row due to invalid billDate format: ${JSON.stringify(billData)}. Expected dd/MM/yyyy.`);
            continue;
        }
        
        const recDateValue = getValue('recDate');
        const parsedRecDate = (recDateValue !== null && recDateValue !== undefined && String(recDateValue).trim() !== '') ? parseDate(String(recDateValue)) : null;

        if (recDateValue && String(recDateValue).trim() !== '' && !parsedRecDate) {
             console.warn(`Skipping row due to invalid recDate format: ${JSON.stringify(billData)}. Expected dd/MM/yyyy.`);
             continue;
        }

        billsFromFile.push({
            billDate: format(parsedDate, 'yyyy-MM-dd'),
            recDate: parsedRecDate ? format(parsedRecDate, 'yyyy-MM-dd') : null,
            billNo: String(getValue('billNo') || ''),
            party: String(getValue('party') || ''),
            companyName: String(getValue('companyName') || ''),
            mobile: String(getValue('mobile') || ''),
            chequeNumber: String(getValue('chequeNumber') || ''),
            bankName: String(getValue('bankName') || ''),
            interestPaid: getValue('interestPaid') === 'Yes' ? 'Yes' : 'No',
            netAmount: parseFloat(getValue('netAmount')) || 0,
            creditDays: parseInt(getValue('creditDays')) || 0,
            recAmount: parseFloat(getValue('recAmount')) || 0,
            pes: String(getValue('pes') || ''),
            meter: String(getValue('meter') || ''),
            rate: parseFloat(getValue('rate')) || 0
        });
    }

    if(billsFromFile.length === 0) {
        return { success: false, error: "No valid bill data found to import." };
    }
    
    // --- Duplicate Check Logic ---
    const { data: existingBills, error: fetchError } = await supabase
        .from('bills')
        .select('companyName, billNo');

    if (fetchError) {
        console.error("Error fetching existing bills for duplicate check:", fetchError);
        return { success: false, error: `Could not check for duplicates: ${fetchError.message}` };
    }

    const existingBillSet = new Set(
        existingBills.map(b => `${b.companyName?.trim()}|${b.billNo?.trim()}`)
    );

    const billsToInsert: typeof billsFromFile = [];
    let skippedCount = 0;
    
    for (const bill of billsFromFile) {
        const uniqueKey = `${bill.companyName.trim()}|${bill.billNo.trim()}`;
        if (existingBillSet.has(uniqueKey)) {
            skippedCount++;
        } else {
            billsToInsert.push(bill);
        }
    }
    // --- End Duplicate Check ---
    

    if(billsToInsert.length === 0) {
        return { success: true, count: 0, skipped: skippedCount, error: skippedCount > 0 ? `${skippedCount} duplicate bill(s) were skipped.` : "No new bills to import." };
    }

    try {
        // Using a single insert operation for batch processing is much faster.
        const { error } = await supabase.from('bills').insert(billsToInsert);
        if (error) throw error;
        return { success: true, count: billsToInsert.length, skipped: skippedCount };
    } catch (err: any) {
        console.error("Error importing bills:", err);
        return { success: false, error: `Database insert failed: ${err.message}` };
    }
}
