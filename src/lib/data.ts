
'use server'

import { Bill, CalculatedBill } from '@/lib/types';
import { format } from 'date-fns';
import { getSupabaseServerClient } from './supabase';
import { calculateBillDetails, parseDate } from './utils';


export async function getCalculatedBills(): Promise<CalculatedBill[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
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

export async function getCompaniesByParty(party: string): Promise<string[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('bills')
        .select('companyName')
        .eq('party', party)
        .order('companyName');
    
    if (error) {
        console.error(`Error fetching companies for party ${party}:`, error);
        return [];
    }

    const uniqueCompanies = [...new Set(data.map(item => item.companyName))].filter(c => c);
    return uniqueCompanies as string[];
}

export async function getUnpaidBillsByParty(party: string, companyName?: string | null): Promise<Bill[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return [];

    let query = supabase
        .from('bills')
        .select('*')
        .eq('party', party)
        .or('interestPaid.is.null,interestPaid.neq.Yes');

    if (companyName) {
        query = query.eq('companyName', companyName);
    }
    
    query = query.order('billDate', { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error(`Error fetching unpaid bills for party ${party}:`, error);
        return [];
    }

    return data as Bill[];
}

export async function findMatchingBill(party: string, amount: number): Promise<Bill | null> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .eq('party', party)
            .eq('netAmount', amount)
            .or('interestPaid.is.null,interestPaid.neq.Yes'); // Only look in unpaid bills

        if (error) {
            console.error(`Error fetching matching bill for party ${party} and amount ${amount}:`, error);
            return null;
        }

        // Only return a match if there is exactly one result to avoid ambiguity
        if (data && data.length === 1) {
            return data[0] as Bill;
        }

        return null;
    } catch (err: any) {
        console.error("Exception in findMatchingBill:", err);
        return null;
    }
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
  
  const billDate = parseDate(bill.billDate);
  const recDate = parseDate(bill.recDate);

  const billToSave = {
    ...billData,
    billDate: billDate ? format(billDate, 'yyyy-MM-dd') : null,
    recDate: recDate ? format(recDate, 'yyyy-MM-dd') : null,
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
        // Using `delete` with a filter that matches all rows (e.g., id > 0)
        // is safer than a TRUNCATE operation, as it respects RLS policies.
        const { error } = await supabase.from('bills').delete().gt('id', 0);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("Error clearing all bills:", err);
        return { success: false, error: err.message };
    }
}
