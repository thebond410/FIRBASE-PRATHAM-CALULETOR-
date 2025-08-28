import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Bill, CalculatedBill } from "./types"
import { differenceInDays, parse } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const today = new Date();

export const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  // Try parsing dd/MM/yyyy first, then fall back to yyyy-MM-dd or ISO
  const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"];
  for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (isValidDate(parsed)) return parsed;
      } catch (e) { /* ignore parsing error, try next format */ }
  }
  
  // Final attempt with direct new Date() for ISO strings
  const directDate = new Date(dateStr);
  if(isValidDate(directDate)) return directDate;

  return null;
};

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

export const calculateBillDetails = (bill: Bill): CalculatedBill => {
  const billDate = parseDate(bill.billDate);
  const recDate = parseDate(bill.recDate);
  const { interestPaid } = bill;

  let totalDays = 0;
  if (billDate) {
    const endDate = recDate || today;
    totalDays = differenceInDays(endDate, billDate);
  }
  
  const interestDays = Math.max(0, totalDays - bill.creditDays);
  
  // Updated interest calculation as per request
  const interestAmount = bill.netAmount * 0.0004765 * interestDays;

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
    interestAmount: interestAmount, // Keep it as a float, format in component
    status,
  };
};
