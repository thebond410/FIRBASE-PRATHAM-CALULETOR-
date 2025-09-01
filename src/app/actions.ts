
'use server';

import { extractChequeData, type ExtractChequeDataInput } from '@/ai/flows/extract-cheque-data';
import { getSupabaseServerClient } from '@/lib/supabase';
import { Bill } from '@/lib/types';
import { parseDate } from '@/lib/utils';
import { format } from 'date-fns';
import * as xlsx from 'xlsx';

export async function scanCheque(input: ExtractChequeDataInput) {
    // API Key is now handled by the environment variable on the server, so no need to pass it from client
    if (!process.env.GEMINI_API_KEY) {
        return { 
            success: false, 
            error: "Scan failed: API Key is not configured on the server. Please set it in the environment variables." 
        };
    }
    
    try {
        const result = await extractChequeData(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Cheque scan failed:", error);
        
        let errorMessage = "Scan failed. Please check the console for details.";
        if (error.message) {
            if (error.message.includes('API key not valid')) {
                errorMessage = "Scan failed: The API Key configured on the server is not valid.";
            } else if (error.message.includes('API key expired')) {
                errorMessage = "Scan failed: The server API Key has expired.";
            } else if (error.message.includes('permission') || error.message.includes('access')) {
                 errorMessage = "Scan failed: The server API Key is not valid or does not have permissions for this model.";
            } else if (error.message.includes('FAILED_PRECONDITION')) {
                 errorMessage = "Scan failed: API Key was not provided or is incorrect on the server.";
            } else if (error.message.includes('billing account')) {
                 errorMessage = "Scan failed: The project has a billing issue. Please check your Google Cloud project.";
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
    const uniqueIdentifiers = new Set<string>();

    for (const row of jsonData) {
        const keyMap: { [key: string]: string } = {};
        for (const key in row) {
            keyMap[key.replace(/\s+/g, '').toLowerCase()] = key;
        }

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

        const companyName = String(getValue('companyName', 'company') || '');
        const billNo = String(getValue('billNo', 'billnumber', 'bill#') || '');
        const billDateValue = getValue('billDate', 'billdate');
        const parsedDate = parseDate(billDateValue);
        
        if (!companyName || !billNo || !parsedDate) {
            console.warn(`Skipping row due to missing required fields (company, billNo, or billDate): ${JSON.stringify(row)}`);
            continue;
        }
        
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');
        const uniqueId = `${companyName}-${billNo}-${formattedDate}`;
        
        if (uniqueIdentifiers.has(uniqueId)) {
            continue; // Skip duplicate within the file
        }
        uniqueIdentifiers.add(uniqueId);
        
        const recDateValue = getValue('recDate', 'recdate');
        const parsedRecDate = parseDate(String(recDateValue));

        billsFromFile.push({
            billDate: formattedDate,
            recDate: parsedRecDate ? format(parsedRecDate, 'yyyy-MM-dd') : null,
            billNo: billNo,
            party: String(getValue('party', 'partyName') || ''),
            companyName: companyName,
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
        return { success: true, count: 0, skipped: jsonData.length };
    }
    
    // Check for existing bills in the database
    const orFilter = billsFromFile.map(bill => 
      `and(companyName.eq.${bill.companyName},billNo.eq.${bill.billNo},billDate.eq.${bill.billDate})`
    ).join(',');

    const { data: existingBills, error: fetchError } = await supabase
      .from('bills')
      .select('companyName,billNo,billDate')
      .or(orFilter);

    if (fetchError) {
      console.error("Error checking for existing bills:", fetchError);
      return { success: false, error: `Database check failed: ${fetchError.message}` };
    }

    const existingBillIds = new Set(existingBills.map(b => `${b.companyName}-${b.billNo}-${b.billDate}`));

    const billsToInsert = billsFromFile.filter(bill => {
        const uniqueId = `${bill.companyName}-${bill.billNo}-${bill.billDate}`;
        return !existingBillIds.has(uniqueId);
    });

    const skippedCount = billsFromFile.length - billsToInsert.length;

    if (billsToInsert.length === 0) {
        return { success: true, count: 0, skipped: skippedCount };
    }

    try {
        const { error: insertError } = await supabase.from('bills').insert(billsToInsert);
        if (insertError) throw insertError;
        return { success: true, count: billsToInsert.length, skipped: skippedCount };
    } catch (err: any) {
        console.error("Error importing bills:", err);
        return { success: false, error: `Database insert failed: ${err.message}` };
    }
}
