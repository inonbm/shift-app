import { CheckCheck, Edit2, Loader2, Plus, Search, Sparkles, Star, Utensils, X } from 'lucide-react';
import { MEASUREMENT_UNIT_LABELS } from '../../../types';
import type { Food, GeneratedMeal, MealFoodOption } from '../../../types';
import type { AddForms, FoodSearch, MealCategory, MealEdit, SetState } from './types';

interface DietTabProps {
  meals: GeneratedMeal[];
  foods: Food[];
  isDietLoading: boolean;
  isEditingMenu: boolean;
  isSavingMenu: boolean;
  menuEdits: Record<string, MealEdit>;
  addForms: AddForms;
  foodSearch: FoodSearch;
  setIsEditingMenu: (value: boolean) => void;
  setMenuEdits: SetState<Record<string, MealEdit>>;
  setAddForms: SetState<AddForms>;
  setFoodSearch: SetState<FoodSearch>;
  handleEditMenuClick: () => void;
  handleSaveMenu: () => void;
  handleGenerateDiet: () => void;
  handleUpdateItemAmount: (mealId: string, category: MealCategory, foodId: string, newGrams: number) => void;
  handleRemoveItem: (mealId: string, category: MealCategory, foodId: string) => void;
  handleAddItem: (mealId: string, category: MealCategory) => void;
  handleSetPrimary: (mealId: string, category: MealCategory, foodId: string) => void;
  getFoodsByCategory: (category: MealCategory, mealId: string) => Food[];
}

export function DietTab({
  meals,
  foods,
  isDietLoading,
  isEditingMenu,
  isSavingMenu,
  menuEdits,
  addForms,
  foodSearch,
  setIsEditingMenu,
  setMenuEdits,
  setAddForms,
  setFoodSearch,
  handleEditMenuClick,
  handleSaveMenu,
  handleGenerateDiet,
  handleUpdateItemAmount,
  handleRemoveItem,
  handleAddItem,
  handleSetPrimary,
  getFoodsByCategory,
}: DietTabProps) {
  return (
<div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
    <div>
      <h2 className="text-lg font-bold text-slate-800">הפקת תפריט אלגוריתמי</h2>
      <p className="text-sm text-slate-500">שיבוץ אוטומטי של מקורות מזון ממאגר המאמן בהתאם ליעדים</p>
    </div>
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {meals.length > 0 && !isEditingMenu && (
        <button
          onClick={handleEditMenuClick}
          disabled={isDietLoading}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 whitespace-nowrap text-sm"
        >
          <Edit2 size={16} />
          עריכת תפריט
        </button>
      )}
      {isEditingMenu && (
        <>
          <button
            onClick={() => setIsEditingMenu(false)}
            disabled={isSavingMenu}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
          >
            <X size={16} /> ביטול
          </button>
          <button
            onClick={handleSaveMenu}
            disabled={isSavingMenu}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            {isSavingMenu ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
            שמור שינויים
          </button>
        </>
      )}
      <button
        onClick={handleGenerateDiet}
        disabled={isDietLoading || isSavingMenu}
        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 whitespace-nowrap"
      >
        {isDietLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        הפקת תפריט תזונה
      </button>
    </div>
  </div>

  {isEditingMenu && (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700 text-sm flex items-center gap-2">
      <Edit2 size={14} className="flex-shrink-0" />
      מצב עריכה פעיל – ערוך שמות ומרכיבי ארוחות. לחץ ״שמור שינויים״ לאישור.
    </div>
  )}

  {meals.length === 0 ? (
    <div className="text-center py-12">
      <Utensils size={40} className="mx-auto text-slate-200 mb-3" />
      <p className="text-slate-500">עדיין לא הופק תפריט תזונה למתאמן זה.</p>
    </div>
  ) : (
    <div className="space-y-5">
      {[...meals].sort((a, b) => a.meal_index - b.meal_index).map((meal) => {
        const edit = menuEdits[meal.id];
        return (
          <div
            key={meal.id}
            className={`bg-slate-50 p-5 rounded-xl border transition-all ${
              isEditingMenu ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
            }`}
          >
            {/* Meal header */}
            <div className="flex justify-between items-center mb-4 gap-2">
              {isEditingMenu ? (
                <input
                  type="text"
                  value={edit?.meal_name ?? meal.meal_name}
                  onChange={e =>
                    setMenuEdits(prev => ({
                      ...prev,
                      [meal.id]: { ...prev[meal.id], meal_name: e.target.value },
                    }))
                  }
                  className="flex-1 font-bold text-slate-800 bg-white border border-amber-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                />
              ) : (
                <h3 className="font-bold text-slate-800">{meal.meal_name}</h3>
              )}
              {(() => {
                const displayCalories = isEditingMenu && edit
                  ? edit.target_calories
                  : meal.target_calories;
                return (
                  <span className="text-xs font-bold bg-white px-2 py-1 rounded text-purple-600 border border-slate-200 whitespace-nowrap flex-shrink-0">
                    ~{displayCalories} קק״ל
                  </span>
                );
              })()}
            </div>

            {/* Macro columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Render each category column */}
              {([
                { key: 'carb_options' as const, label: 'פחמימות', color: 'blue', target: isEditingMenu ? edit?.target_carbs : meal.target_carbs },
                { key: 'protein_options' as const, label: 'חלבונים', color: 'emerald', target: isEditingMenu ? edit?.target_protein : meal.target_protein },
                { key: 'fat_options' as const, label: 'שומנים', color: 'amber', target: isEditingMenu ? edit?.target_fat : meal.target_fat },
              ]).map(col => {
                const items: MealFoodOption[] = isEditingMenu ? (edit?.[col.key] ?? []) : (meal[col.key] ?? []);
                const borderColor = `border-${col.color}-200`;
                const headerColor = `text-${col.color}-600`;

                return (
                  <div key={col.key} className={`bg-white rounded-lg border ${borderColor} p-3`}>
                    <p className={`text-xs font-bold ${headerColor} mb-2 border-b pb-1.5`}>
                      {col.label} (כ-{col.target}g)
                    </p>

                    {/* List existing items */}
                    <ul className="text-xs text-slate-600 space-y-1.5 mb-2">
                      {items.map((opt) => (
                        <li key={opt.food_id} className="flex items-center justify-between gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                          <span className="flex-1 truncate flex items-center gap-1">
                            {isEditingMenu && (
                              <button
                                onClick={() => handleSetPrimary(meal.id, col.key, opt.food_id)}
                                className={`flex-shrink-0 p-0.5 rounded transition-colors ${
                                  opt.is_primary
                                    ? 'text-amber-500 hover:text-amber-600'
                                    : 'text-slate-300 hover:text-amber-400'
                                }`}
                                title={opt.is_primary ? 'פריט מוביל' : 'הגדר כפריט מוביל'}
                              >
                                <Star size={13} className={opt.is_primary ? 'fill-amber-400' : ''} />
                              </button>
                            )}
                            •
                            {isEditingMenu ? (
                              <input
                                type="number"
                                value={opt.grams}
                                onChange={(e) => handleUpdateItemAmount(meal.id, col.key, opt.food_id, Number(e.target.value))}
                                className="w-16 text-center font-bold bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            ) : (
                              <span>{opt.grams}</span>
                            )}
                            {(!opt.unit || opt.unit === 'g') ? 'g' : ` ${MEASUREMENT_UNIT_LABELS[opt.unit]}`} – {opt.food_name}
                          </span>
                          {isEditingMenu && (
                            <button
                              onClick={() => handleRemoveItem(meal.id, col.key, opt.food_id)}
                              className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5 hover:bg-red-50 rounded transition-colors"
                              title="הסר"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </li>
                      ))}
                      {items.length === 0 && (
                        <li className="text-slate-400 italic text-[11px]">אין פריטים</li>
                      )}
                    </ul>

                    {/* Add new item form (only in edit mode) */}
                    {isEditingMenu && (
                      <div className="border-t border-slate-100 pt-2 space-y-1.5">
                        {/* Search input */}
                        <div className="relative">
                          <Search size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="חפש מזון..."
                            value={foodSearch[meal.id]?.[col.key] || ''}
                            onChange={e => setFoodSearch(prev => ({
                              ...prev,
                              [meal.id]: { ...prev[meal.id], [col.key]: e.target.value },
                            }))}
                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-6 py-1 outline-none focus:ring-1 focus:ring-amber-300"
                          />
                        </div>
                        <select
                          value={addForms[meal.id]?.[col.key]?.foodId || ''}
                          onChange={e => setAddForms(prev => ({
                            ...prev,
                            [meal.id]: {
                              ...prev[meal.id],
                              [col.key]: { foodId: e.target.value, grams: prev[meal.id]?.[col.key]?.grams || 100 },
                            },
                          }))}
                          className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-300"
                        >
                          <option value="">-- בחר מזון --</option>
                          {getFoodsByCategory(col.key, meal.id).map(f => (
                            <option key={f.id} value={f.id}>{f.name} ({f.calories_per_100g} קק״ל/{f.serving_size || 100}g)</option>
                          ))}
                        </select>
                        <div className="flex gap-1">
                          {(() => {
                            const selectedFoodId = addForms[meal.id]?.[col.key]?.foodId;
                            const selectedFood = selectedFoodId ? foods.find(f => f.id === selectedFoodId) : null;
                            const unitLabel = selectedFood ? MEASUREMENT_UNIT_LABELS[selectedFood.measurement_unit] || 'גרם' : 'כמות';
                            return (
                              <input
                                type="number"
                                min={1}
                                placeholder={unitLabel}
                                value={addForms[meal.id]?.[col.key]?.grams || ''}
                                onChange={e => setAddForms(prev => ({
                                  ...prev,
                                  [meal.id]: {
                                    ...prev[meal.id],
                                    [col.key]: { foodId: prev[meal.id]?.[col.key]?.foodId || '', grams: Number(e.target.value) },
                                  },
                                }))}
                                className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-300 text-center"
                              />
                            );
                          })()}
                          <button
                            onClick={() => handleAddItem(meal.id, col.key)}
                            disabled={!addForms[meal.id]?.[col.key]?.foodId}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                          >
                            <Plus size={11} />
                            הוסף
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
  );
}
