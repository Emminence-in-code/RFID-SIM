import React from 'react';
import { X, Loader2 } from 'lucide-react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, className, disabled, ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    primary: "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 border-transparent",
    secondary: "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300",
    danger: "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5",
    outline: "border-2 border-primary-500 text-primary-600 bg-transparent hover:bg-primary-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent shadow-none"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, className, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-sm font-semibold text-slate-700 ml-1">{label}</label>}
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-white border-2 rounded-xl text-sm shadow-sm transition-all duration-200
            placeholder:text-slate-400
            focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
            disabled:bg-slate-50 disabled:text-slate-500
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 hover:border-slate-300'}
            ${icon ? 'pl-10' : 'px-4'} py-2.5
            ${className || ''}
          `}
          {...props}
        />
      </div>
      {error && <p className="ml-1 text-xs font-medium text-red-600 animate-pulse">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; noPadding?: boolean }> = ({ 
  children, className, noPadding = false 
}) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className || ''}`}>
    <div className={noPadding ? '' : 'p-6'}>
      {children}
    </div>
  </div>
);

// --- Modal ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-slate-900/40 backdrop-blur-sm" 
          onClick={onClose}
          aria-hidden="true"
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        <div className="inline-block w-full max-w-lg p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl sm:align-middle animate-in fade-in zoom-in-95 duration-200">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Table Helper ---
export const TableHeader: React.FC<{ headers: string[] }> = ({ headers }) => (
  <thead className="bg-slate-50/50">
    <tr>
      {headers.map((h, i) => (
        <th key={i} className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
          {h}
        </th>
      ))}
    </tr>
  </thead>
);