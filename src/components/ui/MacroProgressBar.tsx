export interface MacroProgressBarProps {
  label: string;
  current: number;
  target: number;
  colorClass: string;
}

export function MacroProgressBar({ label, current, target, colorClass }: MacroProgressBarProps) {
  // Ensure the percentage is between 0 and 100 to not break UI if user overeats
  // Fallback to 0 if target is 0 or undefined to prevent NaN
  const percentage = Math.min((current / (target || 1)) * 100, 100) || 0;
  
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
        <span>{label}</span>
        <span>{Math.round(current)}/{Math.round(target)}g</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
