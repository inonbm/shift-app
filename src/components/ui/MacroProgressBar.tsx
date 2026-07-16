export interface MacroProgressBarProps {
  label: string;
  current: number;
  target: number;
  colorClass: string;
}

export function MacroProgressBar({ label, current, target, colorClass }: MacroProgressBarProps) {
  const safeCurrent = Math.round(current);
  const safeTarget = Math.round(target);
  // Calculate the real percentage (can exceed 100%)
  const realPercentage = target > 0 ? Math.round((current / target) * 100) : 0;
  // Clamp the bar width to 100%
  const barWidth = Math.min(realPercentage, 100);
  const isOver = current > target && target > 0;
  
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
        <span>{label}</span>
        <div className="flex items-center gap-1.5">
          <span>{safeCurrent}/{safeTarget}g</span>
          {isOver && (
            <span className="text-red-500 font-extrabold animate-pulse">
              {realPercentage}% 🔥
            </span>
          )}
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${isOver ? 'bg-red-500' : colorClass}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {isOver && (
        <p className="text-[10px] text-red-500 font-bold mt-0.5 text-left">
          חריגה של {safeCurrent - safeTarget}g מעל היעד
        </p>
      )}
    </div>
  );
}
