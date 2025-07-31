import React, { useState, useMemo } from 'react';
import { Expense, SplitMethod } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeScreenProps {
  expenses: Expense[];
  onAddExpense: () => void;
  onSettleUp: () => void;
  onShowHistory: () => void;
  onDeleteExpense: (expenseId: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const ExpenseDetailModal = ({ expense, onClose }: { expense: Expense; onClose: () => void }) => {
  const shares = useMemo(() => {
    if (expense.splitMethod === SplitMethod.EVENLY) {
      const shareAmount = expense.amount / expense.participants.length;
      return expense.participants.map(p => ({ name: p, amount: shareAmount }));
    } else {
      return expense.participants.map(p => ({ name: p, amount: expense.manualSplits?.[p] ?? 0 }));
    }
  }, [expense]);

  return (
    <div className="absolute inset-0 z-30 bg-black/60 flex justify-center items-center p-4" onClick={onClose}>
      <motion.div
        className="bg-replit-container p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-replit-border"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-replit-text truncate">{expense.itemName}</h3>
        <p className="text-replit-text-secondary my-1">
          Tổng cộng <span className="font-semibold text-brand-blue">{formatCurrency(expense.amount)}</span> do <span className="font-semibold text-replit-text">{expense.payer}</span> chi trả.
        </p>
        <div className="mt-4 max-h-60 overflow-y-auto pr-2">
            <h4 className="font-semibold text-replit-text mb-2">Chi tiết từng người:</h4>
            <div className="space-y-2">
                {shares.map(share => (
                    <div key={share.name} className="flex justify-between items-center bg-replit-item p-3 rounded-md">
                        <span className="text-replit-text">{share.name}</span>
                        <span className="font-semibold text-replit-text-secondary">{formatCurrency(share.amount)}</span>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex justify-end mt-5">
            <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-action-secondary hover:bg-action-secondary-hover text-white font-semibold transition-colors"
            >
                Đóng
            </button>
        </div>
      </motion.div>
    </div>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ expenses, onAddExpense, onSettleUp, onShowHistory, onDeleteExpense }) => {
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);

  const handleDeleteConfirm = () => {
    if (expenseToDelete) {
      onDeleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };
  
  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-grow pt-4">
        {expenses.length === 0 ? (
          <div className="text-center text-replit-text-secondary pt-16">
            <h2 className="text-xl font-semibold text-replit-text">Tình bạn chân chính</h2>
            <p className="mt-2"> không phải là sự hoàn hảo, mà là</p>
            <p>sự chấp nhận những khiếm khuyết</p>
            <p>của nhau và cùng nhau phát triển.</p>
          </div>
        ) : (
          <div className="space-y-3">
             {expenses.map(expense => (
              <div key={expense.id} className="relative w-full rounded-lg overflow-hidden bg-action-destructive-hover">
                <div className="absolute top-0 right-0 h-full w-20 flex items-center justify-center">
                    <button
                        onClick={() => setExpenseToDelete(expense)}
                        className="text-white p-4 h-full"
                        aria-label="Xóa khoản chi"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.2, right: 0 }}
                    onDragEnd={(e, { offset }) => {
                        if (offset.x < -100) {
                            setExpenseToDelete(expense);
                        }
                    }}
                    onClick={() => setViewingExpense(expense)}
                    className="relative w-full bg-replit-item p-4 rounded-lg shadow-sm cursor-grab active:cursor-grabbing"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg text-replit-text max-w-[70%] truncate">{expense.itemName}</p>
                    <p className="font-semibold text-status-positive">{formatCurrency(expense.amount)}</p>
                  </div>
                  <p className="text-sm text-replit-text-secondary mt-1">
                    Paid by <span className="font-medium text-replit-text">{expense.payer}</span>
                  </p>
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-24 right-6 left-6">
        {expenses.length > 0 ? (
            <div className="flex items-center gap-3">
                <button
                    onClick={onShowHistory}
                    className="flex-1 bg-replit-item hover:bg-replit-hover text-replit-text font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-105"
                >
                    LỊCH SỬ
                </button>
                <button
                    onClick={onSettleUp}
                    className="flex-1 bg-action-primary hover:bg-action-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-105"
                >
                    QUYẾT TOÁN
                </button>
            </div>
        ) : (
            <button
                onClick={onShowHistory}
                className="w-full bg-replit-item hover:bg-replit-hover text-replit-text font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-105"
            >
                LỊCH SỬ
            </button>
        )}
      </div>

      <button
        onClick={onAddExpense}
        className="absolute bottom-6 right-6 w-16 h-16 bg-action-primary hover:bg-action-primary-hover text-white rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110"
        aria-label="Thêm khoản chi"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {expenseToDelete && (
          <div className="absolute inset-0 z-20 bg-black/60 flex justify-center items-center p-4">
              <motion.div 
                className="bg-replit-container p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-replit-border"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                  <h3 className="text-xl font-bold text-replit-text">Xác nhận xóa</h3>
                  <p className="text-replit-text-secondary my-3">
                      Bạn có chắc chắn muốn xóa khoản chi "{expenseToDelete.itemName}" không? Hành động này không thể hoàn tác.
                  </p>
                  <div className="flex justify-end gap-3 mt-5">
                      <button
                          onClick={() => setExpenseToDelete(null)}
                          className="px-5 py-2 rounded-lg bg-replit-item hover:bg-replit-hover text-replit-text font-semibold transition-colors"
                      >
                          Hủy
                      </button>
                      <button
                          onClick={handleDeleteConfirm}
                          className="px-5 py-2 rounded-lg bg-action-destructive hover:bg-action-destructive-hover text-white font-semibold transition-colors"
                      >
                          Xóa
                      </button>
                  </div>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {viewingExpense && (
          <ExpenseDetailModal expense={viewingExpense} onClose={() => setViewingExpense(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeScreen;