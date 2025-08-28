export interface Bill {
  id: number;
  billDate: string;
  billNo: string;
  party: string;
  netAmount: number;
  creditDays: number;
  recDate: string | null;
  interestPaid: 'Yes' | 'No';
  mobile: string;
  companyName: string;
  chequeNumber: string;
  bankName: string;
  recAmount: number;
  interestRate: number;
}

export interface CalculatedBill extends Bill {
  totalDays: number;
  interestDays: number;
  interestAmount: number;
  status: 'overdue' | 'paid-interest-pending' | 'settled' | 'pending';
}
