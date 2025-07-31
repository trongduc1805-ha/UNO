
export type Member = string;

export enum SplitMethod {
  EVENLY,
  MANUALLY,
}

export interface Expense {
  id: string;
  payer: Member;
  participants: Member[];
  amount: number;
  itemName: string;
  splitMethod: SplitMethod;
  manualSplits?: { [member: Member]: number };
}

export interface Transaction {
  from: Member;
  to: Member;
  amount: number;
}

export interface SettledBill {
  id: string;
  date: string;
  expenses: Expense[];
  transactions: Transaction[];
  mainCreditor?: Member;
}

export enum Screen {
  HOME,
  ADD_EXPENSE,
  SETTLE_UP,
  HISTORY,
  HISTORY_DETAIL,
}