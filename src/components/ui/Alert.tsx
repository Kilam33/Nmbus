import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  children: React.ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  className?: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ 
  children, 
  type = 'info', 
  title, 
  className = '',
  onClose 
}) => {
  const alertStyles = {
    success: {
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-800',
      text: 'text-emerald-400',
      icon: CheckCircle
    },
    error: {
      bg: 'bg-rose-900/20',
      border: 'border-rose-800',
      text: 'text-rose-400',
      icon: XCircle
    },
    warning: {
      bg: 'bg-amber-900/20',
      border: 'border-amber-800',
      text: 'text-amber-400',
      icon: AlertTriangle
    },
    info: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-800',
      text: 'text-blue-400',
      icon: Info
    }
  };

  const style = alertStyles[type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <Icon className={`h-5 w-5 ${style.text} mr-3 mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          {title && (
            <h3 className={`font-medium ${style.text} mb-1`}>
              {title}
            </h3>
          )}
          <div className="text-slate-300">
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-3 ${style.text} hover:opacity-75 transition-opacity`}
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert; 