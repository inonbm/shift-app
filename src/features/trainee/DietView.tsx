import { useEffect, useState } from 'react';
import { Flame, Dumbbell, Droplet, Activity, ChevronDown, ChevronUp, Coffee, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTraineeStore } from '../../stores/traineeStore';
import { useDietStore } from '../../stores/dietStore';
import type { MealFoodOption } from '../../types';

export function DietView() {
  const { user } = useAuthStore();
  const { fetchMyData, currentTrainee, isLoading: isTraineeLoading } = useTraineeStore();
  const { fetchDiet, meals, isLoading: isDietLoading } = useDietStore();

  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  useEffect(() => {
    if (user?.id) {
      fetchDiet(user.id);
    }
  }, [user?.id, fetchDiet]);

  const toggleMeal = (mealId: string) => {
    setExpandedMeals(prev => ({
      ...prev,
      [mealId]: !prev[mealId]
    }));
  };

  const isLoading = isTraineeLoading || isDietLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-purple-600">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-medium text-lg">טוען נתונים...</p>
      </div>
    );
  }

  const data = currentTrainee?.trainee_data;

  // Empty state if no generated meals
  if (!meals || meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <div className="bg-purple-100 p-6 rounded-full text-purple-500 mb-6 shadow-sm border border-purple-200">
          <Coffee size={48} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">התפריט האישי שלך בהכנה...</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          המאמן שלך עדיין לא הפיק עבורך את התפריט התזונתי. יש להמתין לעדכון ולאחר מכן לרענן את העמוד.
        </p>
      </div>
    );
  }

  const OptionColumn = ({ title, options, bgClass, labelClass }: { title: string, options: MealFoodOption[], bgClass: string, labelClass: string }) => (
    <div className={`p-4 rounded-xl border border-slate-100 ${bgClass}`}>
      <h4 className={`text-sm font-bold mb-3 border-b border-white/40 pb-2 ${labelClass}`}>{title}</h4>
      <div className="space-y-3">
        {options.map((opt, i) => (
          <div key={i} className="bg-white/60 p-3 rounded-lg flex items-start gap-3 relative overflow-hidden group hover:bg-white transition-colors border border-white/50">
            <div className={`w-1 h-full absolute right-0 top-0 ${labelClass.replace('text-', 'bg-')} opacity-50`} />
            <div className="flex-1 pr-2">
              <p className="font-bold text-slate-800 text-sm leading-tight">{opt.food_name}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{opt.grams} גרם</span>
                <span className="text-slate-400">({opt.calories} קק״ל)</span>
              </div>
            </div>
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-xs text-slate-400 italic">לא נבחרו מקורות</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-purple-100 p-2.5 rounded-full text-purple-600 mb-3">
            <Flame size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">יעד קלורי</p>
          <p className="text-2xl font-extrabold text-slate-800">
            {data?.goal_calories ? Math.round(data.goal_calories).toLocaleString() : '---'}
          </p>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-100 p-2.5 rounded-full text-emerald-600 mb-3">
            <Dumbbell size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">חלבון</p>
          <div className="flex items-end gap-1">
            <p className="text-2xl font-extrabold text-slate-800">{data?.protein_grams ? Math.round(data.protein_grams) : '---'}</p>
            <span className="text-slate-400 text-sm mb-1 font-medium">גרם</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-100 p-2.5 rounded-full text-blue-600 mb-3">
            <Droplet size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">פחמימה</p>
          <div className="flex items-end gap-1">
            <p className="text-2xl font-extrabold text-slate-800">{data?.carbs_grams ? Math.round(data.carbs_grams) : '---'}</p>
            <span className="text-slate-400 text-sm mb-1 font-medium">גרם</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-amber-100 p-2.5 rounded-full text-amber-600 mb-3">
            <Activity size={24} />
          </div>
          <p className="text-sm font-bold text-slate-500 mb-1">שומן</p>
          <div className="flex items-end gap-1">
            <p className="text-2xl font-extrabold text-slate-800">{data?.fat_grams ? Math.round(data.fat_grams) : '---'}</p>
            <span className="text-slate-400 text-sm mb-1 font-medium">גרם</span>
          </div>
        </div>
      </div>

      {/* Accordion List */}
      <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4 px-1">תפריט התזונה היומי שלך</h3>
      <div className="space-y-4">
        {meals.sort((a, b) => a.meal_index - b.meal_index).map((meal) => {
          const isExpanded = expandedMeals[meal.id] ?? false; 
          
          return (
            <div key={meal.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
              
              {/* Accordion Header */}
              <button 
                onClick={() => toggleMeal(meal.id)}
                className="w-full flex items-center justify-between p-5 focus:outline-none hover:bg-slate-50 transition-colors text-right relative"
              >
                <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-500 to-emerald-400" />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 pr-2">{meal.meal_name}</h3>
                  <div className="flex gap-4 mt-1 pr-2 text-sm font-medium text-slate-500">
                    <span className="text-purple-600">~{meal.target_calories} קק״ל</span>
                    <span>{meal.target_protein}g חלבון</span>
                    <span>{meal.target_carbs}g פחמימה</span>
                    <span>{meal.target_fat}g שומן</span>
                  </div>
                </div>
                <div className="text-slate-300 bg-slate-50 p-2 border border-slate-100 rounded-full">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-50 bg-slate-50/50">
                  <div className="mb-4 px-1">
                    <p className="text-sm text-slate-600 font-medium tracking-wide">
                      יש לבחור <strong className="text-emerald-600">מקור אחד</strong> מכל עמודה להרכבת הארוחה:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <OptionColumn 
                      title="1. פחמימות" 
                      options={meal.carb_options} 
                      bgClass="bg-blue-50/50" 
                      labelClass="text-blue-700"
                    />
                    <OptionColumn 
                      title="2. חלבונים" 
                      options={meal.protein_options} 
                      bgClass="bg-emerald-50/50" 
                      labelClass="text-emerald-700" 
                    />
                    <OptionColumn 
                      title="3. שומנים" 
                      options={meal.fat_options} 
                      bgClass="bg-amber-50/50" 
                      labelClass="text-amber-700" 
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
