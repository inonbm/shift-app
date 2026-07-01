import { CalendarDays, CheckCheck, Loader2, Plus, Utensils } from 'lucide-react';
import type { DailyTracking, GeneratedMeal, MealCategorySelections } from '../../../types';

interface NutritionLogTabProps {
  logDate: string;
  setLogDate: (value: string) => void;
  isLogLoading: boolean;
  dayLog: DailyTracking | null;
  meals: GeneratedMeal[];
}

const CATEGORY_LABELS: Record<string, string> = {
  carb: 'פחמימה',
  protein: 'חלבון',
  fat: 'שומן',
};

export function NutritionLogTab({
  logDate,
  setLogDate,
  isLogLoading,
  dayLog,
  meals,
}: NutritionLogTabProps) {
  // Build list of meals with partial selections (not fully completed)
  const partialMeals: { mealId: string; meal: GeneratedMeal | undefined; selections: MealCategorySelections }[] = [];
  if (dayLog?.meal_selections) {
    for (const [mealId, sel] of Object.entries(dayLog.meal_selections)) {
      // Only show as partial if NOT in completed_meals
      if (!dayLog.completed_meals.includes(mealId) && (sel.carb || sel.protein || sel.fat)) {
        partialMeals.push({ mealId, meal: meals.find(m => m.id === mealId), selections: sel });
      }
    }
  }

  const hasAnyData = dayLog && (
    dayLog.completed_meals.length > 0 || 
    partialMeals.length > 0 || 
    (dayLog.free_entries && dayLog.free_entries.length > 0)
  );

  return (
<div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
    <div>
      <h2 className="text-lg font-bold text-slate-800">יומן תזונה יומי</h2>
      <p className="text-sm text-slate-500">מעקב אחר ארוחות וחריגות של המתאמן</p>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-sm font-bold text-slate-600">בחר תאריך:</label>
      <input
        type="date"
        value={logDate}
        onChange={(e) => setLogDate(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 font-medium"
      />
    </div>
  </div>

  {isLogLoading ? (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Loader2 size={32} className="animate-spin mb-3" />
      <p>טוען נתונים...</p>
    </div>
  ) : !hasAnyData ? (
    <div className="text-center py-12">
      <CalendarDays size={40} className="mx-auto text-slate-200 mb-3" />
      <p className="text-slate-500">לא הוזנו נתונים ביום זה.</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Checked Meals */}
      <div>
        <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">
          <CheckCheck className="text-emerald-500" size={18} />
          ארוחות שסומנו (תפריט)
        </h3>
        {dayLog!.completed_meals.length > 0 ? (
          <div className="space-y-2">
            {dayLog!.completed_meals.map(mealId => {
              const meal = meals.find(m => m.id === mealId);
              return (
                <div key={mealId} className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-sm flex justify-between items-center">
                  <span className="font-bold text-emerald-800">{meal?.meal_name || 'ארוחה לא ידועה'}</span>
                  <span className="text-emerald-600/70 font-medium">{meal ? `${meal.target_calories} קק״ל` : ''}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">לא סומנו ארוחות מהתפריט.</p>
        )}

        {/* Partial Selections */}
        {partialMeals.length > 0 && (
          <div className="mt-4">
            <h4 className="flex items-center gap-2 font-bold text-slate-600 mb-3 pb-2 border-b border-slate-100 text-sm">
              <Utensils className="text-blue-500" size={16} />
              בחירות חלקיות
            </h4>
            <div className="space-y-2">
              {partialMeals.map(({ mealId, meal, selections }) => (
                <div key={mealId} className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-sm">
                  <div className="font-bold text-blue-800 mb-2">{meal?.meal_name || 'ארוחה לא ידועה'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(['carb', 'protein', 'fat'] as const).map(cat => {
                      const item = selections[cat];
                      if (!item) return null;
                      return (
                        <span key={cat} className="bg-white px-2 py-1 rounded-lg border border-blue-100 text-xs text-blue-700 font-medium">
                          {CATEGORY_LABELS[cat]}: {item.food_name} ({item.calories} קק״ל)
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Free Entries */}
      <div>
        <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">
          <Plus className="text-orange-500" size={18} />
          הזנה חופשית (חריגות)
        </h3>
        {dayLog!.free_entries && dayLog!.free_entries.length > 0 ? (
          <div className="space-y-2">
            {dayLog!.free_entries.map(entry => (
              <div key={entry.id} className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-orange-800">{entry.name}</span>
                  <span className="font-bold text-orange-600">{entry.calories} קק״ל</span>
                </div>
                <div className="flex gap-3 text-xs text-orange-600/70 font-medium">
                  {entry.protein ? <span>{entry.protein}g חלבון</span> : null}
                  {entry.carbs ? <span>{entry.carbs}g פחמימה</span> : null}
                  {entry.fats ? <span>{entry.fats}g שומן</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">לא הוזנו חריגות.</p>
        )}
      </div>
    </div>
  )}
</div>
  );
}
