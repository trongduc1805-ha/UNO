
import React, { useState, useMemo } from 'react';
import { SettledBill, Member, SplitMethod, Expense } from '../types';
import { BANK_INFO } from '../constants';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const QrCodeDisplay: React.FC<{amount: number, debtorName: string, creditorName: Member}> = ({ amount, debtorName, creditorName }) => {
    const creditorBankInfo = BANK_INFO[creditorName];
    if (!creditorBankInfo) {
        return <p className="text-sm text-status-negative">Không tìm thấy thông tin ngân hàng cho {creditorName}.</p>;
    }

    const { bankId, accountNumber } = creditorBankInfo;
    const addInfo = encodeURIComponent(`TT bill UNO ${debtorName}`);
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${Math.round(amount)}&addInfo=${addInfo}`;

    const handleDownloadQr = async () => {
        try {
            const response = await fetch(qrUrl);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `QR_TT_${debtorName}_cho_${creditorName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to download QR code:", error);
            // Fallback for browsers that might have issues
            window.open(qrUrl, '_blank');
        }
    };

    return (
        <div className="text-center">
            <div className="bg-white p-2 inline-block rounded-lg shadow-md">
                <img src={qrUrl} alt={`VietQR for ${creditorName}`} width="180" height="180" />
            </div>
            <button
                onClick={handleDownloadQr}
                className="mt-3 inline-flex items-center gap-2 bg-replit-item hover:bg-replit-hover text-replit-text text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Tải QR
            </button>
        </div>
    );
};

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);


interface SettleUpScreenProps {
  bill: SettledBill;
  members: Member[];
  onGoHome: () => void;
  isHistoryView?: boolean;
}

const ExpenseDetails: React.FC<{ title: string; expenses: { name: string; amount: number }[] }> = ({ title, expenses }) => {
  if (expenses.length === 0) return null;
  return (
    <div>
      <h4 className="font-semibold text-replit-text-secondary mt-4 mb-2">{title}</h4>
      <div className="space-y-2">
        {expenses.map((ex, i) => (
          <div key={i} className="flex justify-between items-center bg-replit-bg p-3 rounded-lg">
            <span className="text-replit-text truncate pr-4">{ex.name}</span>
            <span className="font-semibold text-replit-text-secondary whitespace-nowrap">{formatCurrency(ex.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettleUpScreen: React.FC<SettleUpScreenProps> = ({ bill, members, onGoHome, isHistoryView = false }) => {
  const [personIndex, setPersonIndex] = useState(0);

  const balances = useMemo(() => {
    const b: { [key: Member]: { paid: number, owes: number } } = {};
    members.forEach(m => {
      b[m] = { paid: 0, owes: 0 };
    });

    if (!bill.expenses) return b;

    bill.expenses.forEach(ex => {
        b[ex.payer].paid += ex.amount;
        const share = ex.splitMethod === SplitMethod.EVENLY ? ex.amount / ex.participants.length : 0;
        ex.participants.forEach(p => {
            if (ex.splitMethod === SplitMethod.EVENLY) {
                b[p].owes += share;
            } else {
                b[p].owes += ex.manualSplits?.[p] ?? 0;
            }
        });
    });

    return b;
  }, [bill, members]);

  const sortedMembers = useMemo(() => members.filter(m => balances[m] && (balances[m].paid > 0.01 || balances[m].owes > 0.01)), [members, balances]);
  
  const handleNext = () => setPersonIndex((prev) => (prev + 1) % sortedMembers.length);
  const handleBack = () => setPersonIndex((prev) => (prev - 1 + sortedMembers.length) % sortedMembers.length);

  if (sortedMembers.length === 0) {
      return (
          <div className="flex flex-col h-full text-replit-text p-4 animate-fade-in">
               <h2 className="text-2xl font-bold text-center mb-2">{isHistoryView ? "CHI TIẾT LỊCH SỬ" : "KẾT QUẢ"}</h2>
               <p className="text-center text-sm text-replit-text-secondary mb-6">{bill.date}</p>
               <div className="flex-grow flex flex-col justify-center items-center p-6 bg-replit-item rounded-2xl shadow-inner">
                    <p className="text-replit-text-secondary">Không có chi tiêu trong lần quyết toán này.</p>
               </div>
                <button onClick={onGoHome} className="mt-6 w-full bg-action-secondary hover:bg-action-secondary-hover text-white font-bold py-3 px-4 rounded-xl shadow-lg">
                    {isHistoryView ? 'QUAY LẠI LỊCH SỬ' : 'TRANG CHỦ'}
                </button>
          </div>
      )
  }

  const currentPerson = sortedMembers[personIndex];
  const personData = balances[currentPerson];
  const netBalance = personData ? personData.paid - personData.owes : 0;

  const expensesPaid = bill.expenses.filter(e => e.payer === currentPerson).map(e => ({ name: e.itemName, amount: e.amount }));
  const expensesParticipated = bill.expenses.filter(e => e.participants.includes(currentPerson)).map(e => {
      const share = e.splitMethod === SplitMethod.EVENLY ? e.amount / e.participants.length : (e.manualSplits?.[currentPerson] ?? 0);
      return { name: e.itemName, amount: share };
  });

  const isMainCreditor = bill.mainCreditor === currentPerson;
  const paymentsToMake = isMainCreditor ? (bill.transactions?.filter(t => t.from === currentPerson) ?? []) : [];
  const paymentsToReceive = !isMainCreditor ? (bill.transactions?.filter(t => t.to === currentPerson) ?? []) : [];

  return (
    <div className="flex flex-col h-full text-replit-text p-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-2">{isHistoryView ? "CHI TIẾT LỊCH SỬ" : "KẾT QUẢ"}</h2>
      <p className="text-center text-sm text-replit-text-secondary mb-6">{bill.date}</p>

      <div className="flex-grow flex flex-col p-6 bg-replit-item rounded-2xl shadow-inner overflow-hidden">
        
          <div className="flex items-center justify-between flex-shrink-0">
              <button onClick={handleBack} className="p-2 rounded-full hover:bg-replit-hover disabled:opacity-30" disabled={sortedMembers.length <= 1}>
                <ChevronLeftIcon />
              </button>
              <h3 className="text-2xl font-bold text-center text-brand-blue">{currentPerson}</h3>
              <button onClick={handleNext} className="p-2 rounded-full hover:bg-replit-hover disabled:opacity-30" disabled={sortedMembers.length <= 1}>
                <ChevronRightIcon />
              </button>
          </div>

          <div className="text-center my-4 flex-shrink-0">
              <p className="text-lg text-replit-text-secondary">{netBalance >= 0 ? 'Tổng thu' : 'Tổng trả'}</p>
              <p className={`text-4xl font-bold ${netBalance >= 0 ? 'text-status-positive' : 'text-status-negative'}`}>
                  {formatCurrency(Math.abs(netBalance))}
              </p>
          </div>
        
          <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            {netBalance < -0.01 && bill.mainCreditor && (
              <div className="mb-6 text-center">
                  <p className="text-replit-text-secondary mb-2">Quét để trả {formatCurrency(Math.abs(netBalance))} cho <span className="font-bold text-replit-text">{bill.mainCreditor}</span></p>
                  <QrCodeDisplay 
                      amount={Math.abs(netBalance)} 
                      debtorName={currentPerson} 
                      creditorName={bill.mainCreditor} 
                  />
              </div>
            )}
            
            {netBalance > 0.01 && isMainCreditor && paymentsToMake.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-semibold text-replit-text-secondary mb-2">Các khoản cần chuyển</h4>
                    <div className="space-y-4">
                        {paymentsToMake.map((t, i) => (
                            <div key={i} className="text-center">
                               <p className="text-replit-text-secondary mb-2">Chuyển {formatCurrency(t.amount)} cho <span className="font-bold text-replit-text">{t.to}</span></p>
                               <QrCodeDisplay 
                                   amount={t.amount} 
                                   debtorName={currentPerson} 
                                   creditorName={t.to} 
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
             
            {netBalance > 0.01 && !isMainCreditor && paymentsToReceive.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-semibold text-replit-text-secondary mb-2">Các khoản cần thu</h4>
                    <div className="space-y-2">
                        {paymentsToReceive.map((t, i) => (
                            <div key={i} className="flex justify-between items-center bg-replit-bg p-3 rounded-lg">
                                <span className="text-replit-text">Nhận từ {t.from}</span>
                                <span className="font-semibold text-status-positive">{formatCurrency(t.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <ExpenseDetails title="Các khoản đã chi" expenses={expensesPaid} />
            <ExpenseDetails title="Các khoản tham gia" expenses={expensesParticipated} />
          </div>
      </div>

      <button onClick={onGoHome} className="mt-6 w-full bg-action-secondary hover:bg-action-secondary-hover text-white font-bold py-3 px-4 rounded-xl shadow-lg flex-shrink-0">
        {isHistoryView ? 'QUAY LẠI LỊCH SỬ' : 'TRANG CHỦ'}
      </button>
    </div>
  );
};

export default SettleUpScreen;