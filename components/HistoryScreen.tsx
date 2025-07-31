// components/HistoryScreen.tsx
import React from 'react';
import { SettledBill, Member, SplitMethod } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const toUnaccented = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const handleDownloadPdf = (bill: SettledBill, allMembers: Member[]) => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // Use standard Helvetica font, no need to embed a custom one for English.
    doc.setFont('helvetica', 'normal');

    // Report Header
    doc.setFontSize(18);
    doc.text('UNO Bill Settlement Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Settled on: ${bill.date}`, 14, 29);

    // --- Data Preparation ---
    const formatNumber = (amount: number) => new Intl.NumberFormat('en-US').format(Math.round(amount));

    const expenseNames = [...new Set(bill.expenses.map(e => e.itemName))].sort();
    
    const participatingMembers = allMembers.filter(m => 
        bill.expenses.some(e => e.payer === m || e.participants.includes(m))
    );

    const memberData: { [key: Member]: {
        totalPaid: number;
        totalShare: number;
        shares: { [expenseName: string]: number };
    } } = {};

    participatingMembers.forEach(m => {
        memberData[m] = { totalPaid: 0, totalShare: 0, shares: {} };
    });

    bill.expenses.forEach(expense => {
        if (!memberData[expense.payer]) {
             memberData[expense.payer] = { totalPaid: 0, totalShare: 0, shares: {} };
        }
        memberData[expense.payer].totalPaid += expense.amount;
        
        let share = 0;
        if (expense.splitMethod === SplitMethod.EVENLY && expense.participants.length > 0) {
            share = expense.amount / expense.participants.length;
        }

        expense.participants.forEach(p => {
            const individualShare = expense.splitMethod === SplitMethod.EVENLY ? share : (expense.manualSplits?.[p] ?? 0);
            if (!memberData[p]) {
                 memberData[p] = { totalPaid: 0, totalShare: 0, shares: {} };
            }
            memberData[p].totalShare += individualShare;
            memberData[p].shares[expense.itemName] = (memberData[p].shares[expense.itemName] || 0) + individualShare;
        });
    });

    // --- Table Creation ---
    const head = [['Member', ...expenseNames, 'Amount Paid', 'Net Balance']];
    
    const body: (string|object)[][] = participatingMembers.map(member => {
        const data = memberData[member];
        const netBalance = data.totalPaid - data.totalShare;
        const expenseShares = expenseNames.map(name =>
            formatNumber(data.shares[name] || 0)
        );
        return [
            toUnaccented(member),
            ...expenseShares,
            formatNumber(data.totalPaid),
            {
                content: formatNumber(netBalance),
                styles: { textColor: netBalance >= 0 ? [0, 100, 0] : [220, 38, 38] } // Dark Green / Red
            }
        ];
    });

    // --- SUM Row ---
    const sumRow: (string|object)[] = [{content: 'SUM', styles: {fontStyle: 'bold'}}];
    
    const expenseTotals = expenseNames.map(name => {
        return bill.expenses
            .filter(e => e.itemName === name)
            .reduce((sum, e) => sum + e.amount, 0)
    });
    sumRow.push(...expenseTotals.map(t => ({ content: formatNumber(t), styles: {fontStyle: 'bold'} })));

    const totalPaidSum = Object.values(memberData).reduce((sum, data) => sum + data.totalPaid, 0);
    sumRow.push({ content: formatNumber(totalPaidSum), styles: {fontStyle: 'bold'} });

    const totalNetSum = Object.values(memberData).reduce((sum, data) => sum + (data.totalPaid - data.totalShare), 0);
    sumRow.push({ content: formatNumber(totalNetSum), styles: {fontStyle: 'bold'} });

    body.push(sumRow);

    autoTable(doc, {
        startY: 40,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: '#fdba74', textColor: '#000000', fontStyle: 'bold' }, // orange-300
        didParseCell: (data) => {
            if (data.row.index === body.length - 1) {
                data.cell.styles.fillColor = '#fcd34d'; // amber-300
            }
            if (data.column.index > 0) {
                 data.cell.styles.halign = 'right';
            }
        }
    });

    doc.save(`UNO_Report_${bill.date.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

interface HistoryScreenProps {
  bills: SettledBill[];
  members: Member[];
  onViewBill: (bill: SettledBill) => void;
  onBack: () => void;
  onClearAllData?: () => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ 
  bills, 
  members, 
  onViewBill, 
  onBack, 
  onClearAllData 
}) => {
  const handleClearData = () => {
    if (onClearAllData) {
      onClearAllData();
    }
  };

  const getTotalExpenses = () => {
    return bills.reduce((total, bill) => total + bill.expenses.length, 0);
  };

  const getTotalAmount = () => {
    return bills.reduce((total, bill) => {
      const billTotal = bill.expenses.reduce((sum, expense) => sum + expense.amount, 0);
      return total + billTotal;
    }, 0);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-4">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-replit-item mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-replit-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
          </button>
          <h2 className="text-xl font-bold text-replit-text">Lịch sử quyết toán</h2>
        </div>
        
        {/* Clear data button */}
        {onClearAllData && bills.length > 0 && (
          <button 
            onClick={handleClearData}
            className="p-2 rounded-full text-replit-text-secondary hover:text-action-destructive hover:bg-action-destructive/20 transition-colors"
            aria-label="Xóa tất cả dữ liệu"
            title="Xóa tất cả dữ liệu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Statistics */}
      {bills.length > 0 && (
        <div className="mb-4 p-4 bg-replit-item rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-brand-blue">{bills.length}</p>
              <p className="text-sm text-replit-text-secondary">Lần quyết toán</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-blue">{getTotalExpenses()}</p>
              <p className="text-sm text-replit-text-secondary">Khoản chi</p>
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-lg font-semibold text-replit-text">
              Tổng: {formatCurrency(getTotalAmount())}
            </p>
          </div>
        </div>
      )}

      {/* Bills List */}
      <div className="flex-grow overflow-y-auto">
        {bills.length === 0 ? (
          <div className="text-center text-replit-text-secondary mt-16 space-y-3">
            <div className="w-16 h-16 mx-auto mb-4 opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium">Chưa có lịch sử quyết toán</p>
            <p className="text-sm">Dữ liệu sẽ được lưu tự động trên thiết bị này</p>
            <p className="text-xs">Thêm chi tiêu và quyết toán để bắt đầu!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map((bill, index) => {
              const totalAmount = bill.expenses.reduce((sum, expense) => sum + expense.amount, 0);
              const isRecent = index < 3; // Highlight 3 recent bills
              
              return (
                <div
                  key={bill.id}
                  className={`p-4 rounded-lg transition-all shadow-sm flex items-center justify-between ${
                    isRecent 
                      ? 'bg-brand-blue/10 border border-brand-blue/20 hover:bg-brand-blue/20' 
                      : 'bg-replit-item hover:bg-replit-hover'
                  }`}
                >
                  <div onClick={() => onViewBill(bill)} className="flex-grow cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-replit-text">
                        Quyết toán #{bills.length - index}
                      </p>
                      {isRecent && (
                        <span className="px-2 py-1 text-xs bg-brand-blue/20 text-brand-blue rounded-full">
                          Mới
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-replit-text-secondary mb-1">
                      {bill.date}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-replit-text-secondary">
                        {bill.expenses.length} khoản chi
                      </span>
                      <span className="font-medium text-status-positive">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* View details button */}
                    <button 
                      onClick={() => onViewBill(bill)}
                      className="p-2 rounded-full text-replit-text-secondary hover:text-brand-blue hover:bg-brand-blue/20 transition-colors"
                      aria-label="Xem chi tiết"
                      title="Xem chi tiết"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {/* Download PDF button */}
                    <button 
                      onClick={() => handleDownloadPdf(bill, members)} 
                      className="p-2 rounded-full text-replit-text-secondary hover:text-action-primary hover:bg-action-primary/20 transition-colors"
                      aria-label="Tải báo cáo PDF"
                      title="Tải báo cáo PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      {bills.length > 0 && (
        <div className="mt-4 p-3 bg-replit-bg rounded-lg">
          <div className="flex items-center justify-center gap-2 text-xs text-replit-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Dữ liệu được lưu cục bộ trên thiết bị này</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryScreen;
