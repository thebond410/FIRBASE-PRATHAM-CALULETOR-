import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Bill, CalculatedBill } from "./types"
import { differenceInDays, parse, isValid } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const today = new Date();

export const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr || String(dateStr).trim() === '') return null;
  
  // List of formats to try parsing
  const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"];
  
  for (const fmt of formats) {
    const parsedDate = parse(dateStr, fmt, new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  }

  // Final attempt with direct new Date() for ISO-like strings
  const directDate = new Date(dateStr);
  if (isValid(directDate)) {
    // Check for edge cases where invalid strings can produce a valid date
    // e.g. new Date('random string') might not be invalid but not what we want
    // A simple check is to see if the original string is purely numeric, which is unlikely for a date string we handle.
    if (!/^\d+$/.test(dateStr)) {
      return directDate;
    }
  }

  return null;
};


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
  const interestAmount = bill.netAmount * interestDays * 0.0004765;

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