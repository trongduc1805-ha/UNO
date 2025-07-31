import React from 'react';

interface HeaderProps {
    onHomeClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHomeClick }) => {
  return (
    <header className="flex-shrink-0 flex items-center p-4 h-20 border-b border-replit-border cursor-pointer" onClick={onHomeClick}>
        <div className="flex justify-start items-center">
            <div>
                <h1 className="text-4xl font-extrabold tracking-wider">
                    <span className="text-brand-blue">U</span>
                    <span className="text-replit-text">N</span>
                    <span className="text-replit-text">O</span>
                </h1>
                <div className="h-1 w-full bg-replit-text rounded-full mt-0.5"></div>
            </div>
        </div>
    </header>
  );
};

export default Header;