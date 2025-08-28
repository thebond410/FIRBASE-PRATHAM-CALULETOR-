
'use server'

import { Bill, CalculatedBill } from '@/lib/types';
import { differenceInDays, format, parse } from 'date-fns';
import { getSupabaseClient } from './supabase';

const today = new Date();

const parseDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  // Try parsing dd/MM/yyyy first, then fall back to yyyy-MM-dd
  try {
    const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
    if (isValidDate(parsed)) return parsed;
  } catch (e) { /* ignore parsing error, try next format */ }

  try {
    const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (isValidDate(parsed)) return parsed;
  } catch (e) { /* ignore parsing error */ }

  return null;
};

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());


export const calculateBillDetails = (bill: Bill): CalculatedBill => {
  const billDate = parseDate(bill.billDate);
  const recDate = parseDate(bill.recDate);
  const { interestPaid } = bill;

  let totalDays = 0;
  if (billDate) {
    totalDays = differenceInDays(recDate || today, billDate);
  }
  
  const interestDays = Math.max(0, totalDays - bill.creditDays);
  
  const interestAmount = (bill.netAmount * (bill.interestRate / 100) / 365) * interestDays;

  let status: CalculatedBill['status'] = 'pending';
  if (recDate) {
    if (interestPaid === 'Yes') {
      status = 'settled';
    } else {
      status = 'paid-interest-pending';
    }
  } else if (totalDays > bill.creditDays) {
    status = 'overdue';
  }

  return {
    ...bill,
    totalDays,
    interestDays,
    interestAmount: Math.round(interestAmount),
    status,
  };
};

export async function getCalculatedBills(): Promise<CalculatedBill[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
      console.log("Supabase not configured, returning empty array.");
      return [];
  }
  
  const { data, error } = await supabase.from('bills').select('*').order('billDate', { ascending: false });

  if (error) {
      console.error("Error fetching bills from Supabase:", error);
      // You might want to throw the error or handle it differently
      return [];
  }

  return data.map(bill => calculateBillDetails(bill as Bill));
};

export async function getBillById(id: number): Promise<Bill | null> {
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: "Supabase not configured." };

  const billToSave = {
    ...bill,
    billDate: format(parseDate(bill.billDate)!, 'yyyy-MM-dd'),
    recDate: bill.recDate ? format(parseDate(bill.recDate)!, 'yyyy-MM-dd') : null,
  }

  try {
    let error;
    if (bill.id) {
        // Update existing bill
        const { error: updateError } = await supabase
            .from('bills')
            .update({ ...billToSave, updated_at: new Date().toISOString() })
            .eq('id', bill.id);
        error = updateError;
    } else {
        // Create new bill
        const { id, ...billWithoutId } = billToSave;
        const { error: insertError } = await supabase
            .from('bills')
            .insert(billWithoutId);
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
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: "Supabase not configured." };

    try {
        // This deletes all rows. Use with caution.
        const { error } = await supabase.from('bills').delete().gt('id', 0);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("Error clearing all bills:", err);
        return { success: false, error: err.message };
    }
}

export async function importBillsFromCSV(csvText: string): Promise<{success: boolean, count?: number, error?: string}> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: "Supabase not configured." };

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        return { success: false, error: "CSV file must have a header row and at least one data row."};
    }

    const header = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    const billsToInsert: Omit<Bill, 'id'>[] = [];

    for (const row of rows) {
        const values = row.split(',');
        const billData: any = {};
        header.forEach((key, index) => {
            billData[key] = values[index].trim();
        });

        const parsedDate = parseDate(billData.billDate);
        if (!parsedDate) {
            return { success: false, error: `Invalid billDate format for row: ${row}. Expected dd/MM/yyyy.`}
        }
        
        const parsedRecDate = billData.recDate ? parseDate(billData.recDate) : null;
        if (billData.recDate && !parsedRecDate) {
             return { success: false, error: `Invalid recDate format for row: ${row}. Expected dd/MM/yyyy.`}
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
            interestRate: parseFloat(billData.interestRate) || 0,
            pes: billData.pes || '',
            meter: billData.meter || '',
            rate: parseFloat(billData.rate) || 0
        });
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

    