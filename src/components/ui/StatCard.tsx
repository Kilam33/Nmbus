import React from 'react';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string | null;
  trendDirection?: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection = 'neutral',
  onClick,
  color = 'indigo',
  className = ''
}) => {
  const trendColorMap = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-slate-400'
  };

  const bgColorMap = {
    indigo: 'bg-indigo-900/20',
    emerald: 'bg-emerald-900/20',
    amber: 'bg-amber-900/20',
    rose: 'bg-rose-900/20',
    violet: 'bg-violet-900/20',
    blue: 'bg-blue-900/20',
    green: 'bg-green-900/20',
    yellow: 'bg-yellow-900/20',
    purple: 'bg-purple-900/20',
    cyan: 'bg-cyan-900/20'
  };

  const borderColorMap = {
    indigo: 'border-indigo-800',
    emerald: 'border-emerald-800',
    amber: 'border-amber-800',
    rose: 'border-rose-800',
    violet: 'border-violet-800',
    blue: 'border-blue-800',
    green: 'border-green-800',
    yellow: 'border-yellow-800',
    purple: 'border-purple-800',
    cyan: 'border-cyan-800'
  };

  const textColorMap = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400'
  };

  return (
    <div 
      className={`${bgColorMap[color]} border ${borderColorMap[color]} rounded-lg p-4 transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-105' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`${textColorMap[color]} text-sm font-medium`}>{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && (
            <div className="flex items-center mt-1">
              {trendDirection === 'positive' ? (
                <ArrowUp className={`h-3 w-3 mr-1 ${trendColorMap[trendDirection]}`} />
              ) : trendDirection === 'negative' ? (
                <ArrowDown className={`h-3 w-3 mr-1 ${trendColorMap[trendDirection]}`} />
              ) : (
                <TrendingUp className={`h-3 w-3 mr-1 ${trendColorMap[trendDirection]}`} />
              )}
              <span className={`text-xs ${trendColorMap[trendDirection]}`}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <Icon className={`h-8 w-8 ${textColorMap[color]}`} />
      </div>
    </div>
  );
};

export default StatCard; 