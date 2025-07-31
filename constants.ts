
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
  "Ngọc Bảo": { bankId: "970407", accountNumber: "9999040906" },
  "Quang Chiến": { bankId: "970436", accountNumber: "1028772903" },
  "Khắc Đạt": { bankId: "970422", accountNumber: "896337379999" },
  "Thiện Đức": { bankId: "970436", accountNumber: "104906767701" },
  "Trọng Đức": { bankId: "970422", accountNumber: "0886861805" },
  "Khánh Ngọc": { bankId: "970418", accountNumber: "5180989722" },
  "Kim Khánh": { bankId: "970418", accountNumber: "5180989573" },
  "Mai Trang": { bankId: "970405", accountNumber: "3609205495359" },
  "Sử Uyên": { bankId: "970418", accountNumber: "8823712097" },
  "Đức Thục": { bankId: "970422", accountNumber: "0705482788" },
  "Ngọc Sơn": { bankId: "970418", accountNumber: "51810000989652" }
};
