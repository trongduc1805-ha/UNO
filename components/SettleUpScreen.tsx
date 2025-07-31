// SettleUpScreen.tsx
import React, { useState, useMemo } from 'react';
import { SettledBill, Member, SplitMethod } from '../types';
import { BANK_INFO } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

/* ---------- 1. Hàm tạo PDF dùng chung ---------- */
const buildPdfBlob = (bill: SettledBill, members: Member[]) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  const formatNumber = (amount: number) => Math.round(amount).toLocaleString('en-US');
  const expenseNames = [...new Set(bill.expenses.map(e => e.itemName))].sort();
  const participatingMembers = members.filter(m =>
    bill.expenses.some(e => e.payer === m || e.participants.includes(m))
  );

  const memberData: any = {};
  participatingMembers.forEach(m => (memberData[m] = { totalPaid: 0, totalShare: 0, shares: {} }));

  bill.expenses.forEach(ex => {
    memberData[ex.payer].totalPaid += ex.amount;
    const share = ex.splitMethod === SplitMethod.EVENLY ? ex.amount / ex.participants.length : 0;
    ex.participants.forEach(p => {
      const s = ex.splitMethod === SplitMethod.EVENLY ? share : (ex.manualSplits?.[p] ?? 0);
      if (!memberData[p]) memberData[p] = { totalPaid: 0, totalShare: 0, shares: {} };
      memberData[p].totalShare += s;
      memberData[p].shares[ex.itemName] = (memberData[p].shares[ex.itemName] || 0) + s;
    });
  });

  const head = [['Member', ...expenseNames, 'Amount Paid', 'Net Balance']];
  const body: any[][] = participatingMembers.map(m => {
    const { totalPaid, totalShare, shares } = memberData[m];
    const net = totalPaid - totalShare;
    return [
      m,
      ...expenseNames.map(n => formatNumber(shares[n] || 0)),
      formatNumber(totalPaid),
      { content: formatNumber(net), styles: { textColor: net >= 0 ? [0, 100, 0] : [220, 38, 38] } }
    ];
  });

  // sum row
  const sumRow = [{ content: 'SUM', styles: { fontStyle: 'bold' } }];
  expenseNames.forEach(n => sumRow.push({ content: formatNumber(bill.expenses.filter(e => e.itemName === n).reduce((s, e) => s + e.amount, 0)), styles: { fontStyle: 'bold' } }));
  const totalPaidSum = Object.values(memberData).reduce((s: any, d: any) => s + d.totalPaid, 0);
  const totalNetSum = Object.values(memberData).reduce((s: any, d: any) => s + (d.totalPaid - d.totalShare), 0);
  sumRow.push({ content: formatNumber(totalPaidSum), styles: { fontStyle: 'bold' } });
  sumRow.push({ content: formatNumber(totalNetSum), styles: { fontStyle: 'bold' } });
  body.push(sumRow);

  autoTable(doc, {
    startY: 40,
    head,
    body,
    theme: 'grid',
    headStyles: { fillColor: '#fdba74', textColor: '#000000', fontStyle: 'bold' },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1) data.cell.styles.fillColor = '#fcd34d';
      if (data.column.index > 0) data.cell.styles.halign = 'right';
    }
  });

  return doc.output('blob');
};

/* ---------- 2. Component QR + Share ---------- */
const QrCodeDisplay: React.FC<{
  amount: number;
  debtorName: string;
  creditorName: Member;
  expensesPaid: { name: string; amount: number }[];
  expensesParticipated: { name: string; amount: number }[];
  bill: SettledBill;
  members: Member[];
}> = ({ amount, debtorName, creditorName, expensesPaid, expensesParticipated, bill, members }) => {
  const creditorBankInfo = BANK_INFO[creditorName];
  if (!creditorBankInfo)
    return <p className="text-sm text-status-negative">Không tìm thấy thông tin ngân hàng cho {creditorName}.</p>;

  const { bankId, accountNumber } = creditorBankInfo;
  const addInfo = encodeURIComponent(`TT bill UNO ${debtorName}`);
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${Math.round(
    amount
  )}&addInfo=${addInfo}`;

  const shareMessage = useMemo(() => {
    let msg = `💸 ${debtorName} cần chuyển ${formatCurrency(amount)} cho ${creditorName}\n\n`;
    if (expensesPaid.length) {
      msg += '💰 Đã chi:\n';
      expensesPaid.forEach((e) => (msg += `• ${e.name}: ${formatCurrency(e.amount)}\n`));
    }
    if (expensesParticipated.length) {
      msg += '\n🤝 Tham gia:\n';
      expensesParticipated.forEach((e) => (msg += `• ${e.name}: ${formatCurrency(e.amount)}\n`));
    }
    return msg.trim();
  }, [amount, creditorName, debtorName, expensesPaid, expensesParticipated]);

  /* Tải QR */
  const handleDownloadQr = async () => {
    try {
      const r = await fetch(qrUrl);
      const blob = await r.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `QR_TT_${debtorName}_cho_${creditorName}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(qrUrl, '_blank');
    }
  };

  /* Chia sẻ QR + PDF bảng tổng hợp */
  const handleShare = async () => {
    try {
      const pdfBlob = buildPdfBlob(bill, members);
      const pdfFile = new File(
        [pdfBlob],
        `UNO_Report_${bill.date.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        { type: 'application/pdf' }
      );

      const qrBlob = await (await fetch(qrUrl)).blob();
      const qrFile = new File(
        [qrBlob],
        `QR_TT_${debtorName}_cho_${creditorName}.png`,
        { type: 'image/png' }
      );

      if (navigator.share && navigator.canShare({ files: [pdfFile, qrFile] })) {
        await navigator.share({
          title: 'Thanh toán UNO',
          text: shareMessage,
          files: [pdfFile, qrFile],
        });
      } else {
        navigator.clipboard.writeText(`${shareMessage}\nQR: ${qrUrl}\nPDF: (vui lòng tải thủ công)`);
        alert('Đã sao chép vào clipboard!');
      }
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  return (
    <div className="text-center">
      <div className="bg-white p-2 inline-block rounded-lg shadow-md">
        <img src={qrUrl} alt={`VietQR for ${creditorName}`} width="180" height="180" />
      </div>

      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={handleDownloadQr}
          className="inline-flex items-center gap-2 bg-replit-item hover:bg-replit-hover text-replit-text text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
        >
          <svg xmlns="http://www          .org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Tải QR
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 bg-action-primary hover:bg-action-primary-hover text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v10" />
          </svg>
          Chia sẻ
        </button>
      </div>
    </div>
  );
};

/* ---------- 3. Icon helpers ---------- */
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

/* ---------- 4. ExpenseDetails ---------- */
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

/* ---------- 5. Main SettleUpScreen ---------- */
interface SettleUpScreenProps {
  bill: SettledBill;
  members: Member[];
  onGoHome: () => void;
  isHistoryView?: boolean;
}

export default function SettleUpScreen({ bill, members, onGoHome, isHistoryView = false }: SettleUpScreenProps) {
  const [personIndex, setPersonIndex] = useState(0);

  const balances = useMemo(() => {
    const b: { [key: Member]: { paid: number; owes: number } } = {};
    members.forEach((m) => (b[m] = { paid: 0, owes: 0 }));

    if (!bill.expenses) return b;

    bill.expenses.forEach((ex) => {
      b[ex.payer].paid += ex.amount;
      const share = ex.splitMethod === SplitMethod.EVENLY ? ex.amount / ex.participants.length : 0;
      ex.participants.forEach((p) => {
        if (ex.splitMethod === SplitMethod.EVENLY) b[p].owes += share;
        else b[p].owes += ex.manualSplits?.[p] ?? 0;
      });
    });
    return b;
  }, [bill, members]);

  const sortedMembers = useMemo(
    () => members.filter((m) => balances[m] && (balances[m].paid > 0.01 || balances[m].owes > 0.01)),
    [members, balances]
  );

  const handleNext = () => setPersonIndex((prev) => (prev + 1) % sortedMembers.length);
  const handleBack = () => setPersonIndex((prev) => (prev - 1 + sortedMembers.length) % sortedMembers.length);

  if (sortedMembers.length === 0) {
    return (
      <div className="flex flex-col h-full text-replit-text p-4 animate-fade-in">
        <h2 className="text-2xl font-bold text-center mb-2">{isHistoryView ? 'CHI TIẾT LỊCH SỬ' : 'KẾT QUẢ'}</h2>
        <p className="text-center text-sm text-replit-text-secondary mb-6">{bill.date}</p>
        <div className="flex-grow flex flex-col justify-center items-center p-6 bg-replit-item rounded-2xl shadow-inner">
          <p className="text-replit-text-secondary">Không có chi tiêu trong lần quyết toán này.</p>
        </div>
        <button onClick={onGoHome} className="mt-6 w-full bg-action-secondary hover:bg-action-secondary-hover text-white font-bold py-3 px-4 rounded-xl shadow-lg">
          {isHistoryView ? 'QUAY LẠI LỊCH SỬ' : 'TRANG CHỦ'}
        </button>
      </div>
    );
  }

  const currentPerson = sortedMembers[personIndex];
  const personData = balances[currentPerson];
  const netBalance = personData ? personData.paid - personData.owes : 0;

  const expensesPaid = bill.expenses.filter((e) => e.payer === currentPerson).map((e) => ({ name: e.itemName, amount: e.amount }));
  const expensesParticipated = bill.expenses
    .filter((e) => e.participants.includes(currentPerson))
    .map((e) => {
      const share = e.splitMethod === SplitMethod.EVENLY ? e.amount / e.participants.length : e.manualSplits?.[currentPerson] ?? 0;
      return { name: e.itemName, amount: share };
    });

  const isMainCreditor = bill.mainCreditor === currentPerson;
  const paymentsToMake = isMainCreditor ? bill.transactions?.filter((t) => t.from === currentPerson) ?? [] : [];
  const paymentsToReceive = !isMainCreditor ? bill.transactions?.filter((t) => t.to === currentPerson) ?? [] : [];

  return (
    <div className="flex flex-col h-full text-replit-text p-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-2">{isHistoryView ? 'CHI TIẾT LỊCH SỬ' : 'KẾT QUẢ'}</h2>
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
          <p className={`text-4xl font-bold ${netBalance >= 0 ? 'text-status-positive' : 'text-status-negative'}`}>{formatCurrency(Math.abs(netBalance))}</p>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
          {netBalance < -0.01 && bill.mainCreditor && (
            <div className="mb-6 text-center">
              <p className="text-replit-text-secondary mb-2">
                Quét để trả {formatCurrency(Math.abs(netBalance))} cho <span className="font-bold text-replit-text">{bill.mainCreditor}</span>
              </p>
              <QrCodeDisplay
                amount={Math.abs(netBalance)}
                debtorName={currentPerson}
                creditorName={bill.mainCreditor}
                expensesPaid={expensesPaid}
                expensesParticipated={expensesParticipated}
                bill={bill}
                members={members}
              />
            </div>
          )}

          {netBalance > 0.01 && isMainCreditor && paymentsToMake.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-replit-text-secondary mb-2">Các khoản cần chuyển</h4>
              <div className="space-y-4">
                {paymentsToMake.map((t, i) => (
                  <div key={i} className="text-center">
                    <p className="text-replit-text-secondary mb-2">
                      Chuyển {formatCurrency(t.amount)} cho <span className="font-bold text-replit-text">{t.to}</span>
                    </p>
                    <QrCodeDisplay
                      amount={t.amount}
                      debtorName={currentPerson}
                      creditorName={t.to}
                      expensesPaid={expensesPaid}
                      expensesParticipated={expensesParticipated}
                      bill={bill}
                      members={members}
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
