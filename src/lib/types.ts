

export interface Bill {
  id: number;
  billDate: string; // Stored as 'yyyy-MM-dd' in DB, but received as 'dd/MM/yyyy' from uploads
  billNo: string;
  party: string;
  netAmount: number;
  creditDays: number;
  recDate: string | null; // Stored as 'yyyy-MM-dd' in DB
  interestPaid: 'Yes' | 'No';
  mobile: string;
  companyName: string;
  chequeNumber: string;
  bankName: string;
  recAmount: number;
  pes: string;
  meter: string;
  rate: number;
  created_at?: string;
  updated_at?: string;
}

export interface CalculatedBill extends Bill {
  totalDays: number;
  interestDays: number;
  interestAmount: number;
  status: 'overdue' | 'paid-interest-pending' | 'settled' | 'pending';
}

export interface BillTableColumn {
    id: keyof Omit<CalculatedBill, 'id' | 'status' | 'created_at' | 'updated_at'>;
    label: string;
    shortLabel: string;
    className: string;
}

export const billTableColumns: BillTableColumn[] = [
    { id: 'billDate', label: 'Bill Date', shortLabel: 'Date', className: 'bg-gradient-to-r from-blue-600 to-blue-500' },
    { id: 'billNo', label: 'Bill Number', shortLabel: 'Bill#', className: 'bg-gradient-to-r from-green-600 to-green-500' },
    { id: 'party', label: 'Party Name', shortLabel: 'Party', className: 'bg-gradient-to-r from-indigo-600 to-indigo-500' },
    { id: 'pes', label: 'PES', shortLabel: 'PES', className: 'bg-gradient-to-r from-violet-600 to-violet-500' },
    { id: 'meter', label: 'Meter', shortLabel: 'Meter', className: 'bg-gradient-to-r from-fuchsia-600 to-fuchsia-500' },
    { id: 'rate', label: 'Rate', shortLabel: 'Rate', className: 'bg-gradient-to-r from-rose-600 to-rose-500' },
    { id: 'netAmount', label: 'Net Amount', shortLabel: 'Net Amt', className: 'bg-gradient-to-r from-purple-600 to-purple-500' },
    { id: 'totalDays', label: 'Total Days', shortLabel: 'Tot. Days', className: 'bg-gradient-to-r from-orange-600 to-orange-500' },
    { id: 'creditDays', label: 'Credit Days', shortLabel: 'Cr. Days', className: 'bg-gradient-to-r from-pink-600 to-pink-500' },
    { id: 'interestDays', label: 'Interest Days', shortLabel: 'Int. Days', className: 'bg-gradient-to-r from-yellow-600 to-yellow-500' },
    { id: 'interestAmount', label: 'Interest Amount', shortLabel: 'Int. Amt', className: 'bg-gradient-to-r from-teal-600 to-teal-500' },
    { id: 'interestPaid', label: 'Interest Paid', shortLabel: 'Int. Paid', className: 'bg-gradient-to-r from-sky-600 to-sky-500'},
    { id: 'recDate', label: 'Receipt Date', shortLabel: 'Rec. Dt', className: 'bg-gradient-to-r from-red-600 to-red-500' },
    { id: 'recAmount', label: 'Receipt Amount', shortLabel: 'Rec. Amt', className: 'bg-gradient-to-r from-lime-600 to-lime-500' },
    { id: 'chequeNumber', label: 'Cheque Number', shortLabel: 'Chq. #', className: 'bg-gradient-to-r from-gray-600 to-gray-500' },
    { id: 'bankName', label: 'Bank Name', shortLabel: 'Bank', className: 'bg-gradient-to-r from-blue-gray-600 to-blue-gray-500' },
    { id: 'companyName', label: 'Company Name', shortLabel: 'Company', className: 'bg-gradient-to-r from-cyan-600 to-cyan-500' },
    { id: 'mobile', label: 'Mobile', shortLabel: 'Mobile', className: 'bg-gradient-to-r from-emerald-600 to-emerald-500' },
];
