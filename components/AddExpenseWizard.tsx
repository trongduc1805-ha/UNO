import React, { useState, useMemo } from 'react';
import { Member, Expense, SplitMethod } from '../types';

enum WizardStep {
  SELECT_PAYER,
  SELECT_PARTICIPANTS,
  ENTER_AMOUNT,
  ENTER_ITEM_NAME,
  SELECT_SPLIT_METHOD,
  MANUAL_SPLIT,
  ADD_MEMBER,
}

interface AddExpenseWizardProps {
  members: Member[];
  onAddMember: (name: string) => void;
  onComplete: (expense: Expense) => void;
  onCancel: () => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
};

const AddExpenseWizard: React.FC<AddExpenseWizardProps> = ({ members, onAddMember, onComplete, onCancel }) => {
  const [step, setStep] = useState<WizardStep>(WizardStep.SELECT_PAYER);
  const [payer, setPayer] = useState<Member | null>(null);
  const [participants, setParticipants] = useState<Member[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [itemName, setItemName] = useState('');
  const [manualSplits, setManualSplits] = useState<{ [key: Member]: number }>({});
  const [newMemberName, setNewMemberName] = useState('');
  const [cameFromStep, setCameFromStep] = useState<WizardStep>(WizardStep.SELECT_PAYER);
  
  const totalManualSplit = useMemo(() => {
    return Object.values(manualSplits).reduce((sum, val) => sum + (val || 0), 0);
  }, [manualSplits]);

  const handleAddNewMember = () => {
    const trimmedName = newMemberName.trim();
    if (trimmedName && !members.includes(trimmedName)) {
        onAddMember(trimmedName);
    }
    setNewMemberName('');
  };

  const handleSelectPayer = (member: Member) => {
    setPayer(member);
    setParticipants([member]); 
    setStep(WizardStep.SELECT_PARTICIPANTS);
  };

  const handleToggleParticipant = (member: Member) => {
    setParticipants(prev =>
      prev.includes(member) ? prev.filter(p => p !== member) : [...prev, member]
    );
  };

  const handleCompleteManualSplit = () => {
    if (Math.abs(totalManualSplit - amount) > 0.01) {
        alert("Tổng số tiền chia thủ công phải bằng tổng chi phí.");
        return;
    }
    if (payer && participants.length > 0 && amount > 0 && itemName) {
        onComplete({
            id: `exp-${Date.now()}`,
            payer,
            participants,
            amount,
            itemName,
            splitMethod: SplitMethod.MANUALLY,
            manualSplits,
        });
    }
  }

  const renderStep = () => {
    switch (step) {
      case WizardStep.SELECT_PAYER:
        return (
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-bold text-center text-replit-text my-4">Bạn là ai?</h2>
            <div className="flex-grow overflow-y-auto px-4">
                <div className="space-y-2">
                    {members.map(item => (
                        <button key={item} onClick={() => handleSelectPayer(item)} className="w-full text-left p-4 bg-replit-item rounded-lg hover:bg-replit-hover text-replit-text transition-colors">
                            {item}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-shrink-0 p-4 mt-2 border-t border-replit-border">
              <button
                onClick={() => {
                  setCameFromStep(WizardStep.SELECT_PAYER);
                  setStep(WizardStep.ADD_MEMBER);
                }}
                className="w-full py-3 rounded-lg bg-action-primary hover:bg-action-primary-hover text-white font-semibold transition-colors"
                aria-label="Thêm thành viên tạm thời"
              >
                Thêm thành viên tạm thời
              </button>
            </div>
          </div>
        );
      case WizardStep.SELECT_PARTICIPANTS:
        return (
            <div className="flex flex-col h-full">
                <h2 className="text-xl font-bold text-center text-replit-text my-4">Ai tham gia?</h2>
                <div className="flex-grow overflow-y-auto px-4">
                    <div className="space-y-2">
                        {members.map(item => (
                            <div key={item} onClick={() => handleToggleParticipant(item)} className={`w-full flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${participants.includes(item) ? 'bg-brand-blue/20' : 'bg-replit-item'}`}>
                                <span className="text-replit-text">{item}</span>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${participants.includes(item) ? 'bg-brand-blue border-brand-blue' : 'border-replit-border'}`}>
                                    {participants.includes(item) && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-shrink-0 p-4 mt-2 border-t border-replit-border space-y-3">
                    <button
                        onClick={() => {
                            setCameFromStep(WizardStep.SELECT_PARTICIPANTS);
                            setStep(WizardStep.ADD_MEMBER);
                        }}
                        className="w-full py-3 rounded-lg bg-action-primary hover:bg-action-primary-hover text-white font-semibold transition-colors"
                        aria-label="Thêm thành viên tạm thời"
                    >
                        Thêm thành viên tạm thời
                    </button>
                    <div className="flex justify-between items-center">
                        <button onClick={() => setStep(WizardStep.SELECT_PAYER)} className="p-3 rounded-full hover:bg-replit-item">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-replit-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button 
                            onClick={() => setStep(WizardStep.ENTER_AMOUNT)} 
                            disabled={participants.length === 0}
                            className="p-3 rounded-full bg-action-primary text-white hover:bg-action-primary-hover disabled:bg-replit-item disabled:text-replit-text-secondary disabled:cursor-not-allowed"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        );
      case WizardStep.ADD_MEMBER:
        return (
          <div className="flex flex-col h-full animate-fade-in">
            <h2 className="text-xl font-bold text-center text-replit-text my-4">Thêm thành viên mới</h2>
            <div className="flex-grow px-4 flex flex-col overflow-y-hidden">
              {/* Input form */}
              <div className="flex-shrink-0 flex items-center gap-2 mb-4">
                  <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newMemberName.trim() && !members.includes(newMemberName.trim())) {
                                  handleAddNewMember();
                              }
                          }
                      }}
                      placeholder="Nhập tên thành viên..."
                      className="flex-grow p-3 rounded-lg bg-replit-bg text-replit-text border border-replit-border focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none"
                      autoFocus
                  />
                  <button
                      onClick={handleAddNewMember}
                      className="px-5 py-3 rounded-lg bg-action-primary hover:bg-action-primary-hover text-white font-semibold transition-colors disabled:bg-replit-item disabled:text-replit-text-secondary disabled:cursor-not-allowed"
                      disabled={!newMemberName.trim() || members.includes(newMemberName.trim())}
                      aria-label="Thêm thành viên"
                  >
                      Thêm
                  </button>
              </div>
              
              {/* Member list */}
              <p className="flex-shrink-0 text-replit-text-secondary text-sm mb-2">Danh sách thành viên hiện tại:</p>
              <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
                  {members.map(member => (
                      <div key={member} className="bg-replit-item p-3 rounded-lg text-replit-text animate-fade-in">
                          {member}
                      </div>
                  ))}
              </div>
            </div>

            {/* Done button */}
            <div className="flex-shrink-0 p-4 mt-4">
              <button 
                onClick={() => setStep(cameFromStep)} 
                className="w-full bg-action-primary hover:bg-action-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all"
              >
                  Xong
              </button>
            </div>
          </div>
        );
      case WizardStep.ENTER_AMOUNT:
        return (
          <NumberInputStep
            title="Hết bao nhiêu?"
            value={amount}
            onChange={setAmount}
            onNext={() => amount > 0 && setStep(WizardStep.ENTER_ITEM_NAME)}
            onBack={() => setStep(WizardStep.SELECT_PARTICIPANTS)}
          />
        );
      case WizardStep.ENTER_ITEM_NAME:
        return (
          <TextInputStep
            title="Tên vật phẩm?"
            value={itemName}
            onChange={setItemName}
            onNext={() => itemName.trim() && setStep(WizardStep.SELECT_SPLIT_METHOD)}
            onBack={() => setStep(WizardStep.ENTER_AMOUNT)}
          />
        );
      case WizardStep.SELECT_SPLIT_METHOD:
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4 px-4">
                <h2 className="text-2xl font-bold text-replit-text mb-8">Cách chia?</h2>
                <button className="w-full bg-action-primary hover:bg-action-primary-hover text-white font-bold py-4 px-4 rounded-xl text-lg" onClick={() => onComplete({id: `exp-${Date.now()}`, payer: payer!, participants, amount, itemName, splitMethod: SplitMethod.EVENLY})}>CHIA ĐỀU</button>
                <button className="w-full bg-replit-item hover:bg-replit-hover text-replit-text font-bold py-4 px-4 rounded-xl text-lg" onClick={() => setStep(WizardStep.MANUAL_SPLIT)}>CHIA THỦ CÔNG</button>
                <button className="mt-4 text-replit-text-secondary" onClick={() => setStep(WizardStep.ENTER_ITEM_NAME)}>Quay lại</button>
            </div>
        );
       case WizardStep.MANUAL_SPLIT:
        return (
            <div className="flex flex-col h-full">
                <h2 className="text-xl font-bold text-center text-replit-text my-4">Chia thủ công</h2>
                <p className={`text-center font-semibold mb-4 ${totalManualSplit !== amount ? 'text-status-negative' : 'text-status-positive'}`}>
                    Tổng: {formatCurrency(totalManualSplit)} / {formatCurrency(amount)}
                </p>
                <div className="flex-grow overflow-y-auto space-y-3 px-4">
                    {participants.map(p => (
                        <div key={p} className="flex items-center justify-between bg-replit-item p-3 rounded-lg">
                            <span className="text-replit-text">{p}</span>
                            <input
                                type="number"
                                placeholder="Số tiền"
                                value={manualSplits[p] || ''}
                                onChange={e => setManualSplits({...manualSplits, [p]: parseFloat(e.target.value) || 0 })}
                                className="w-32 p-2 rounded-lg bg-replit-container text-replit-text text-right border border-replit-border focus:border-action-primary focus:ring-1 focus:ring-action-primary focus:outline-none"
                            />
                        </div>
                    ))}
                </div>
                <NavigationButtons onNext={handleCompleteManualSplit} onBack={() => setStep(WizardStep.SELECT_SPLIT_METHOD)} />
            </div>
        );
    }
  };

  return <div className="flex flex-col h-full animate-fade-in">{renderStep()}</div>;
};

const NavigationButtons: React.FC<{onNext: () => void, onBack: () => void}> = ({ onNext, onBack }) => (
    <div className="flex-shrink-0 flex justify-between items-center p-4 mt-4">
        <button onClick={onBack} className="p-3 rounded-full hover:bg-replit-item">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-replit-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={onNext} className="p-3 rounded-full bg-action-primary text-white hover:bg-action-primary-hover">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        </button>
    </div>
);

const NumberInputStep: React.FC<{title: string, value: number, onChange: (val: number) => void, onNext: () => void, onBack: () => void}> = ({ title, value, onChange, onNext, onBack }) => (
    <div className="flex flex-col h-full justify-between">
        <h2 className="text-xl font-bold text-center text-replit-text mt-8">{title}</h2>
        <div className="flex items-center px-4">
            <input
                type="number"
                value={value || ''}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
                className="w-full p-4 text-right text-5xl font-bold bg-transparent focus:outline-none text-replit-text"
                placeholder="0"
                autoFocus
            />
            <span className="text-3xl font-semibold text-replit-text-secondary">VNĐ</span>
        </div>
        <NavigationButtons onNext={onNext} onBack={onBack} />
    </div>
);

const TextInputStep: React.FC<{title: string, value: string, onChange: (val: string) => void, onNext: () => void, onBack: () => void}> = ({ title, value, onChange, onNext, onBack }) => (
    <div className="flex flex-col h-full justify-between">
        <h2 className="text-xl font-bold text-center text-replit-text mt-8">{title}</h2>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full p-4 text-left text-3xl bg-transparent border-b-2 border-replit-border focus:outline-none focus:border-action-primary text-replit-text mx-4"
            placeholder="VD: Bữa tối..."
            autoFocus
        />
        <NavigationButtons onNext={onNext} onBack={onBack} />
    </div>
);

export default AddExpenseWizard;