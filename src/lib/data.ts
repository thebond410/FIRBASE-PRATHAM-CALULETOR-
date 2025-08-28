import { Bill, CalculatedBill } from '@/lib/types';
import { differenceInDays, format, parse } from 'date-fns';

const today = new Date();

export const mockBills: Bill[] = [
  { id: 1, billDate: '01/04/2024', billNo: 'B-001', party: 'Creative Solutions', netAmount: 15000, creditDays: 30, recDate: '15/06/2024', interestPaid: 'No', mobile: '9876543210', companyName: 'Tech Innovators', chequeNumber: '123456', bankName: 'Global Bank', recAmount: 15000, interestRate: 18, pes: '10', meter: '100', rate: 150 },
  { id: 2, billDate: '15/04/2024', billNo: 'B-002', party: 'Global Exports', netAmount: 25000, creditDays: 45, recDate: '30/06/2024', interestPaid: 'Yes', mobile: '9876543211', companyName: 'Dynamic Supplies', chequeNumber: '123457', bankName: 'City Bank', recAmount: 25000, interestRate: 18, pes: '20', meter: '200', rate: 125 },
  { id: 3, billDate: '05/05/2024', billNo: 'B-003', party: 'Creative Solutions', netAmount: 8000, creditDays: 30, recDate: null, interestPaid: 'No', mobile: '9876543210', companyName: 'Pioneer Logistics', chequeNumber: '', bankName: '', recAmount: 0, interestRate: 18, pes: '5', meter: '50', rate: 160 },
  { id: 4, billDate: '20/05/2024', billNo: 'B-004', party: 'Sunrise Industries', netAmount: 42000, creditDays: 60, recDate: null, interestPaid: 'No', mobile: '9876543212', companyName: 'Future Enterprises', chequeNumber: '', bankName: '', recAmount: 0, interestRate: 24, pes: '30', meter: '350', rate: 120 },
  { id: 5, billDate: '10/06/2024', billNo: 'B-005', party: 'Global Exports', netAmount: 12500, creditDays: 30, recDate: null, interestPaid: 'No', mobile: '9876543211', companyName: 'Tech Innovators', chequeNumber: '', bankName: '', recAmount: 0, interestRate: 18, pes: '12', meter: '80', rate: 156.25 },
  { id: 6, billDate: '01/03/2024', billNo: 'B-006', party: 'Sunrise Industries', netAmount: 30000, creditDays: 30, recDate: '15/05/2024', interestPaid: 'No', mobile: '9876543212', companyName: 'Dynamic Supplies', chequeNumber: '123458', bankName: 'Global Bank', recAmount: 30000, interestRate: 24, pes: '25', meter: '250', rate: 120 },
];


const parseDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  try {
    return parse(dateStr, 'dd/MM/yyyy', new Date());
  } catch (e) {
    return null;
  }
};

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

export const getCalculatedBills = (): CalculatedBill[] => {
  return mockBills.map(calculateBillDetails);
};
