// App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Screen, Expense, SettledBill, Transaction, Member } from './types';
import { MEMBERS } from './constants';
import { storage } from './utils/storage';
import HomeScreen from './components/HomeScreen';
import AddExpenseWizard from './components/AddExpenseWizard';
import SettleUpScreen from './components/SettleUpScreen';
import HistoryScreen from './components/HistoryScreen';
import Header from './components/Header';
import { SplitMethod } from './types';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settledBills, setSettledBills] = useState<SettledBill[]>([]);
  const [activeBill, setActiveBill] = useState<SettledBill | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>(MEMBERS);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadData = () => {
      try {
        const storedExpenses = storage.loadExpenses();
        const storedBills = storage.loadSettledBills();
        const storedMembers = storage.loadMembers();

        setExpenses(storedExpenses);
        setSettledBills(storedBills);
        
        // Merge stored members with default members, avoiding duplicates
        const mergedMembers = [...new Set([...MEMBERS, ...storedMembers])];
        setAllMembers(mergedMembers);
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save expenses to localStorage whenever expenses change
  useEffect(() => {
    if (!isLoading) {
      storage.saveExpenses(expenses);
    }
  }, [expenses, isLoading]);

  // Save settled bills to localStorage whenever settledBills change
  useEffect(() => {
    if (!isLoading) {
      storage.saveSettledBills(settledBills);
    }
  }, [settledBills, isLoading]);

  // Save members to localStorage whenever allMembers change
  useEffect(() => {
    if (!isLoading) {
      // Only save custom members (not default ones)
      const customMembers = allMembers.filter(member => !MEMBERS.includes(member));
      storage.saveMembers(customMembers);
    }
  }, [allMembers, isLoading]);

  const handleAddMember = useCallback((newMember: Member) => {
    const trimmedMember = newMember.trim();
    if (trimmedMember && !allMembers.includes(trimmedMember)) {
      setAllMembers(prev => [...prev, trimmedMember]);
    }
  }, [allMembers]);

  const handleAddExpense = useCallback((expense: Expense) => {
    setExpenses(prev => [...prev, expense]);
    setCurrentScreen(Screen.HOME);
  }, []);

  const handleDeleteExpense = useCallback((expenseId: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
  }, []);

  const handleSettleUp = useCallback(() => {
    const balances: { [key: Member]: number } = allMembers.reduce((acc, member) => ({ ...acc, [member]: 0 }), {});

    expenses.forEach(expense => {
      balances[expense.payer] += expense.amount;
      if (expense.splitMethod === SplitMethod.EVENLY) {
        const share = expense.amount / expense.participants.length;
        expense.participants.forEach(p => {
          balances[p] -= share;
        });
      } else {
        expense.participants.forEach(p => {
          balances[p] -= expense.manualSplits?.[p] ?? 0;
        });
      }
    });
    
    const debtors = Object.entries(balances)
      .filter(([, balance]) => balance < -0.01)
      .map(([person, balance]) => ({ person, amount: balance }));

    const creditors = Object.entries(balances)
      .filter(([, balance]) => balance > 0.01)
      .map(([person, balance]) => ({ person, amount: balance }));

    const transactions: Transaction[] = [];
    
    // Find the main creditor (highest balance)
    const mainCreditor = creditors.sort((a, b) => b.amount - a.amount)[0];

    if (mainCreditor && debtors.length > 0) {
      // Phase 1: Debtors pay the main creditor
      for (const debtor of debtors) {
        transactions.push({
          from: debtor.person,
          to: mainCreditor.person,
          amount: Math.abs(debtor.amount),
        });
      }

      // Phase 2: Main creditor pays other creditors
      const otherCreditors = creditors.filter(c => c.person !== mainCreditor.person);
      for (const creditor of otherCreditors) {
        transactions.push({
          from: mainCreditor.person,
          to: creditor.person,
          amount: creditor.amount,
        });
      }
    }

    const newSettledBill: SettledBill = {
      id: `settled-${Date.now()}`,
      date: new Date().toLocaleString('vi-VN'),
      expenses: [...expenses],
      transactions,
      mainCreditor: mainCreditor?.person,
    };

    setSettledBills(prev => [newSettledBill, ...prev]);
    setActiveBill(newSettledBill);
    setExpenses([]);
    setCurrentScreen(Screen.SETTLE_UP);
  }, [expenses, allMembers]);

  const viewHistoryDetail = (bill: SettledBill) => {
    setActiveBill(bill);
    setCurrentScreen(Screen.HISTORY_DETAIL);
  };

  // Clear all data function
  const handleClearAllData = useCallback(() => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu? Hành động này không thể hoàn tác.')) {
      storage.clearAll();
      setExpenses([]);
      setSettledBills([]);
      setAllMembers(MEMBERS);
      setActiveBill(null);
      setCurrentScreen(Screen.HOME);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-full max-w-sm h-[90vh] max-h-[850px] bg-replit-container rounded-3xl shadow-2xl flex flex-col items-center justify-center border-2 border-replit-border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
          <p className="mt-4 text-replit-text-secondary">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.ADD_EXPENSE:
        return (
          <AddExpenseWizard
            members={allMembers}
            onAddMember={handleAddMember}
            onComplete={handleAddExpense}
            onCancel={() => setCurrentScreen(Screen.HOME)}
          />
        );
      case Screen.SETTLE_UP:
        return activeBill ? (
          <SettleUpScreen
            bill={activeBill}
            members={allMembers}
            onGoHome={() => {
              setActiveBill(null);
              setCurrentScreen(Screen.HOME);
            }}
          />
        ) : null;
      case Screen.HISTORY:
        return (
          <HistoryScreen
            bills={settledBills}
            members={allMembers}
            onViewBill={viewHistoryDetail}
            onBack={() => setCurrentScreen(Screen.HOME)}
            onClearAllData={handleClearAllData}
          />
        );
      case Screen.HISTORY_DETAIL:
        return activeBill ? (
            <SettleUpScreen
              bill={activeBill}
              members={allMembers}
              onGoHome={() => {
                setActiveBill(null);
                setCurrentScreen(Screen.HISTORY);
              }}
             isHistoryView={true}
            />
        ) : null;
      case Screen.HOME:
      default:
        return (
          <HomeScreen
            expenses={expenses}
            onAddExpense={() => setCurrentScreen(Screen.ADD_EXPENSE)}
            onSettleUp={handleSettleUp}
            onShowHistory={() => setCurrentScreen(Screen.HISTORY)}
            onDeleteExpense={handleDeleteExpense}
          />
        );
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen font-sans">
      <div className="w-full max-w-sm h-[90vh] max-h-[850px] bg-replit-container rounded-3xl shadow-2xl flex flex-col relative overflow-hidden border-2 border-replit-border">
        <Header onHomeClick={() => setCurrentScreen(Screen.HOME)} />
        <main className="flex-grow flex flex-col overflow-y-auto px-4 pb-20">
          {renderScreen()}
        </main>
      </div>
    </div>
  );
};

export default App;
