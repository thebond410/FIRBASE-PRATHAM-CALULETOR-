
'use server'

import { Bill, CalculatedBill } from '@/lib/types';
import { format } from 'date-fns';
import { getSupabaseServerClient } from './supabase';
import { calculateBillDetails, parseDate } from './utils';


export async function getCalculatedBills(): Promise<CalculatedBill[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
      console.log("Supabase not configured for server, returning empty array.");
      return [];
  }
  
  const { data, error } = await supabase.from('bills').select('*').order('billDate', { ascending: false });

  if (error) {
      console.error("Error fetching bills from Supabase:", error);
      return [];
  }

  return data.map(bill => calculateBillDetails(bill as Bill));
};

export async function getParties(): Promise<string[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return [];

    const { data, error } = await supabase.from('bills').select('party').order('party');
    
    if (error) {
        console.error("Error fetching parties:", error);
        return [];
    }

    const uniqueParties = [...new Set(data.map(item => item.party))].filter(p => p);
    return uniqueParties as string[];
}

export async function getUnpaidBillsByParty(party: string): Promise<Bill[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('party', party)
        .or('interestPaid.is.null,interestPaid.neq.Yes')
        .order('billDate', { ascending: true });

    if (error) {
        console.error(`Error fetching unpaid bills for party ${party}:`, error);
        return [];
    }

    return data as Bill[];
}

export async function getBillById(id: number): Promise<Bill | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching bill with id ${id}:`, error);
    return null;
  }
  return data as Bill;
}

export async function saveBill(bill: Omit<Bill, 'id' | 'created_at' | 'updated_at'> & { id?: number }): Promise<{success: boolean, error?: string}> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { success: false, error: "Supabase not configured." };

  const { id, ...billData } = bill;

  const billToSave = {
    ...billData,
    billDate: bill.billDate ? format(parseDate(bill.billDate)!, 'yyyy-MM-dd') : null,
    recDate: bill.recDate ? format(parseDate(bill.recDate)!, 'yyyy-MM-dd') : null,
  };

  try {
    let error;
    if (id) {
        const { error: updateError } = await supabase
            .from('bills')
            .update({ ...billToSave, updated_at: new Date().toISOString() })
            .eq('id', id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from('bills')
            .insert(billToSave);
        error = insertError;
    }

    if (error) throw error;
    return { success: true };

  } catch (err: any) {
    console.error("Error saving bill:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteBill(id: number): Promise<{success: boolean, error?: string}> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { success: false, error: "Supabase not configured." };

    try {
        const { error } = await supabase.from('bills').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("Error deleting bill:", err);
        return { success: false, error: err.message };
    }
}

export async function clearAllBills(): Promise<{success: boolean, error?: string}> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { success: false, error: "Supabase not configured." };

    try {
        const { error } = await supabase.from('bills').delete().gt('id', 0);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("Error clearing all bills:", err);
        return { success: false, error: err.message };
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
