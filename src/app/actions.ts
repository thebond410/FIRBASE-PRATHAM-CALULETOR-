
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
    return xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: null });
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

    for (const row of jsonData) {
        // Create a mapping of lowercase, space-removed header names to their original keys
        const keyMap: { [key: string]: string } = {};
        for (const key in row) {
            keyMap[key.replace(/\s+/g, '').toLowerCase()] = key;
        }

        // Helper function to safely get values using the mapped keys, trying multiple variations
        const getValue = (...keys: string[]) => {
            for (const key of keys) {
                const mappedKey = keyMap[key.toLowerCase().replace(/\s+/g, '')];
                if (mappedKey && row[mappedKey] !== null && row[mappedKey] !== undefined) {
                    const value = row[mappedKey];
                     return value === '' ? null : value;
                }
            }
            return null;
        };

        const parsedDate = parseDate(getValue('billDate', 'billdate'));
        if (!parsedDate) {
            console.warn(`Skipping row due to invalid billDate format: ${JSON.stringify(row)}. Expected dd/MM/yyyy.`);
            continue;
        }
        
        const recDateValue = getValue('recDate', 'recdate');
        // Parse recDate. If it's empty, null, or invalid, it will result in null.
        const parsedRecDate = parseDate(String(recDateValue));


        billsFromFile.push({
            billDate: format(parsedDate, 'yyyy-MM-dd'),
            recDate: parsedRecDate ? format(parsedRecDate, 'yyyy-MM-dd') : null,
            billNo: String(getValue('billNo', 'billnumber', 'bill#') || ''),
            party: String(getValue('party', 'partyName') || ''),
            companyName: String(getValue('companyName', 'company') || ''),
            mobile: String(getValue('mobile', 'mobileno') || ''),
            chequeNumber: String(getValue('chequeNumber', 'chqno', 'chequeno') || ''),
            bankName: String(getValue('bankName', 'bank') || ''),
            interestPaid: getValue('interestPaid', 'intpaid') === 'Yes' ? 'Yes' : 'No',
            netAmount: parseFloat(String(getValue('netAmount', 'netamt'))) || 0,
            creditDays: parseInt(String(getValue('creditDays', 'crDays'))) || 0,
            recAmount: parseFloat(String(getValue('recAmount', 'recamt'))) || 0,
            pes: String(getValue('pes') || ''),
            meter: String(getValue('meter') || ''),
            rate: parseFloat(String(getValue('rate'))) || 0
        });
    }

    if(billsFromFile.length === 0) {
        return { success: false, error: "No valid bill data found to import." };
    }

    try {
        // Using a single insert operation for batch processing is much faster.
        const { error } = await supabase.from('bills').insert(billsFromFile);
        if (error) throw error;
        return { success: true, count: billsFromFile.length, skipped: 0 };
    } catch (err: any) {
        console.error("Error importing bills:", err);
        return { success: false, error: `Database insert failed: ${err.message}` };
    }
}
