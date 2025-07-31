import { Member } from './types';

export const MEMBERS: Member[] = [
  "Ngoc Bao",
  "Quang Chien", 
  "Khac Dat",
  "Thien Duc",
  "Trong Duc",
  "Khanh Ngoc",
  "Kim Khanh",
  "Mai Trang",
  "Su Uyen",
  "Duc Thuc",
  "Ngoc Son"
];

// Placeholder bank info for QR code generation.
// Replace with actual bank IDs and account numbers.
export const BANK_INFO: { [key: Member]: { bankId: string, accountNumber: string } } = {
  "Ngoc Bao": { bankId: "970407", accountNumber: "9999040906" },
  "Quang Chien": { bankId: "970436", accountNumber: "1028772903" },
  "Khac Dat": { bankId: "970422", accountNumber: "896337379999" },
  "Thien Duc": { bankId: "970436", accountNumber: "104906767701" },
  "Trong Duc": { bankId: "970422", accountNumber: "0886861805" },
  "Khanh Ngoc": { bankId: "970418", accountNumber: "5180989722" },
  "Kim Khanh": { bankId: "970418", accountNumber: "5180989573" },
  "Mai Trang": { bankId: "970405", accountNumber: "3609205495359" },
  "Su Uyen": { bankId: "970418", accountNumber: "8823712097" },
  "Duc Thuc": { bankId: "970422", accountNumber: "0705482788" },
  "Ngoc Son": { bankId: "970418", accountNumber: "51810000989652" }
};
