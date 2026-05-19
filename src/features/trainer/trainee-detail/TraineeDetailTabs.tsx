import { Calculator, CalendarDays, Dumbbell, Utensils } from 'lucide-react';
import type { Tab } from './types';

interface TraineeDetailTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TraineeDetailTabs({ activeTab, onTabChange }: TraineeDetailTabsProps) {
  return (
    <div className="flex overflow-x-auto w-full md:w-fit bg-slate-200/50 p-1 rounded-xl mx-auto md:mx-0 snap-x">
      <button
        onClick={() => onTabChange('overview')}
        className={`whitespace-nowrap flex-shrink-0 snap-start flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
          activeTab === 'overview' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Calculator size={18} />
        נתונים
      </button>
      <button
        onClick={() => onTabChange('diet')}
        className={`whitespace-nowrap flex-shrink-0 snap-start flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
          activeTab === 'diet' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Utensils size={18} />
        תזונה
      </button>
      <button
        onClick={() => onTabChange('workouts')}
        className={`whitespace-nowrap flex-shrink-0 snap-start flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
          activeTab === 'workouts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Dumbbell size={18} />
        אימונים
      </button>
      <button
        onClick={() => onTabChange('nutrition_log')}
        className={`whitespace-nowrap flex-shrink-0 snap-start flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
          activeTab === 'nutrition_log' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <CalendarDays size={18} />
        יומן תזונה
      </button>
    </div>
  );
}
