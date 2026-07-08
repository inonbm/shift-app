import { useEffect, useState } from 'react';
import { Flame, Dumbbell, Droplet, Activity, ChevronDown, ChevronUp, Coffee, Loader2, Sparkles, CheckCircle2, Circle, Plus, Trash2, X, Info, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTraineeStore } from '../../stores/traineeStore';
import { useDietStore } from '../../stores/dietStore';
import { useTrackingStore } from '../../stores/trackingStore';
import { useFoodStore } from '../../stores/foodStore';
import type { MealFoodOption, MealItemSelection } from '../../types';
import { MEASUREMENT_UNIT_LABELS, normaliseSelectionArray } from '../../types';
import { RecipeModal } from './RecipeModal';
import { SwapModal } from './SwapModal';
import { generateRecipeWithAI } from '../../lib/gemini';
import { MacroProgressBar } from '../../components/ui/MacroProgressBar';

// Helper type for selection — now supports multiple items per category
type MealSelection = {
  carb?: MealFoodOption[];
  protein?: MealFoodOption[];
  fat?: MealFoodOption[];
};

export function DietView() {
  const { user } = useAuthStore();
  const { fetchMyData, currentTrainee, isLoading: isTraineeLoading } = useTraineeStore();
  const { fetchDiet, meals, isLoading: isDietLoading } = useDietStore();
  const { todaysTracking, fetchTodaysTracking, toggleMealCompletion, toggleItemSelection, swapItem, addFreeEntry, removeFreeEntry } = useTrackingStore();
  const { fetchFoods } = useFoodStore();

  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [selections, setSelections] = useState<Record<string, MealSelection>>({});
  
  // Free Entry State
  const [isFreeEntryModalOpen, setIsFreeEntryModalOpen] = useState(false);
  const [freeEntryForm, setFreeEntryForm] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });

  // Swap Modal State
  const [swapModalState, setSwapModalState] = useState<{
    isOpen: boolean;
    mealId: string;
    category: 'protein' | 'carb' | 'fat';
    originalOption: MealFoodOption;
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTodaysTracking(user.id);
    }
  }, [user?.id, fetchTodaysTracking]);

  // Prefetch foods for swap modal
  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);
  
  // AI Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [recipeResult, setRecipeResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  useEffect(() => {
    if (user?.id) {
      fetchDiet(user.id);
    }
  }, [user?.id, fetchDiet]);

  // Sync local selections state from persisted meal_selections (backward-compatible)
  useEffect(() => {
    if (todaysTracking?.meal_selections) {
      const restored: Record<string, MealSelection> = {};
      for (const [mealId, cats] of Object.entries(todaysTracking.meal_selections)) {
        restored[mealId] = {
          carb: normaliseSelectionArray(cats.carb).map(s => s as unknown as MealFoodOption),
          protein: normaliseSelectionArray(cats.protein).map(s => s as unknown as MealFoodOption),
          fat: normaliseSelectionArray(cats.fat).map(s => s as unknown as MealFoodOption),
        };
      }
      setSelections(restored);
    }
  }, [todaysTracking?.meal_selections]);

  const toggleMeal = (mealId: string) => {
    setExpandedMeals(prev => ({
      ...prev,
      [mealId]: !prev[mealId]
    }));
  };

  const handleSelectOption = (mealId: string, category: keyof MealSelection, option: MealFoodOption) => {
    // Optimistic local update — toggle in array
    setSelections(prev => {
      const currentArr = prev[mealId]?.[category] || [];
      const exists = currentArr.some(o => o.food_id === option.food_id);
      return {
        ...prev,
        [mealId]: {
          ...(prev[mealId] || {}),
          [category]: exists
            ? currentArr.filter(o => o.food_id !== option.food_id)
            : [...currentArr, option]
        }
      };
    });
    // Persist to DB and update progress
    if (user?.id) {
      toggleItemSelection(user.id, mealId, category, option);
    }
  };

  const handleSwap = (newOption: MealFoodOption) => {
    if (!swapModalState || !user?.id) return;
    const { mealId, category, originalOption } = swapModalState;
    
    // Optimistic local update: replace old with new
    setSelections(prev => {
      const currentArr = prev[mealId]?.[category] || [];
      const idx = currentArr.findIndex(o => o.food_id === originalOption.food_id);
      const newArr = [...currentArr];
      if (idx >= 0) newArr[idx] = newOption;
      else newArr.push(newOption);
      return {
        ...prev,
        [mealId]: { ...(prev[mealId] || {}), [category]: newArr }
      };
    });
    
    swapItem(user.id, mealId, category, originalOption.food_id, newOption);
  };

  const handleGenerateRecipe = async (mealId: string) => {
    const mealSelection = selections[mealId];
    if (!mealSelection || !mealSelection.carb?.length || !mealSelection.protein?.length || !mealSelection.fat?.length) return;

    setIsModalOpen(true);
    setIsAILoading(true);
    setAiError(null);
    setRecipeResult(null);

    try {
      const ingredients = [
        ...mealSelection.carb.map(c => ({ name: c.food_name, grams: c.grams })),
        ...mealSelection.protein.map(p => ({ name: p.food_name, grams: p.grams })),
        ...mealSelection.fat.map(f => ({ name: f.food_name, grams: f.grams })),
      ];
      
      const recipe = await generateRecipeWithAI(ingredients);
      setRecipeResult(recipe);
    } catch (err: any) {
      setAiError(err.message || 'אירעה שגיאה בלתי צפויה');
    } finally {
      setIsAILoading(false);
    }
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

  // Calculations for Progress Bar — sums ALL selected items per category
  const targetCalories = data?.goal_calories || 0;
  
  // Helper to sum a field across all selected items in all categories
  const sumSelections = (sel: typeof todaysTracking.meal_selections[string] | undefined, field: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g') => {
    if (!sel) return 0;
    const sumArr = (arr: MealItemSelection[]) => arr.reduce((s, item) => s + (item[field] || 0), 0);
    return sumArr(normaliseSelectionArray(sel.carb)) + sumArr(normaliseSelectionArray(sel.protein)) + sumArr(normaliseSelectionArray(sel.fat));
  };
  
  const consumedFromMeals = meals.reduce((sum, meal) => {
    if (todaysTracking?.completed_meals.includes(meal.id)) {
      return sum + meal.target_calories;
    }
    return sum + sumSelections(todaysTracking?.meal_selections?.[meal.id], 'calories');
  }, 0);
  const consumedFromFree = todaysTracking?.free_entries?.reduce((sum, entry) => sum + entry.calories, 0) || 0;
  const totalConsumed = consumedFromMeals + consumedFromFree;
  const progressPercentage = targetCalories > 0 ? Math.min(100, Math.round((totalConsumed / targetCalories) * 100)) : 0;
  const isOverTarget = totalConsumed > targetCalories;
  
  // Macros — use profile targets (same source as summary cards) to ensure a single source of truth
  const targetProtein = data?.protein_grams || 0;
  const targetCarbs = data?.carbs_grams || 0;
  const targetFat = data?.fat_grams || 0;

  const consumedProtein = meals.reduce((sum, meal) => {
    if (todaysTracking?.completed_meals.includes(meal.id)) return sum + meal.target_protein;
    return sum + sumSelections(todaysTracking?.meal_selections?.[meal.id], 'protein_g');
  }, 0) + (todaysTracking?.free_entries?.reduce((sum, entry) => sum + (entry.protein || 0), 0) || 0);
    
  const consumedCarbs = meals.reduce((sum, meal) => {
    if (todaysTracking?.completed_meals.includes(meal.id)) return sum + meal.target_carbs;
    return sum + sumSelections(todaysTracking?.meal_selections?.[meal.id], 'carbs_g');
  }, 0) + (todaysTracking?.free_entries?.reduce((sum, entry) => sum + (entry.carbs || 0), 0) || 0);
    
  const consumedFat = meals.reduce((sum, meal) => {
    if (todaysTracking?.completed_meals.includes(meal.id)) return sum + meal.target_fat;
    return sum + sumSelections(todaysTracking?.meal_selections?.[meal.id], 'fat_g');
  }, 0) + (todaysTracking?.free_entries?.reduce((sum, entry) => sum + (entry.fats || 0), 0) || 0);

  const handleAddFreeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !freeEntryForm.name || !freeEntryForm.calories) return;
    
    await addFreeEntry(user.id, {
      name: freeEntryForm.name,
      calories: Number(freeEntryForm.calories),
      protein: freeEntryForm.protein ? Number(freeEntryForm.protein) : undefined,
      carbs: freeEntryForm.carbs ? Number(freeEntryForm.carbs) : undefined,
      fats: freeEntryForm.fats ? Number(freeEntryForm.fats) : undefined,
    });
    
    setIsFreeEntryModalOpen(false);
    setFreeEntryForm({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  };

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

  const OptionColumn = ({ 
    mealId, 
    categoryKey, 
    title, 
    options, 
    bgClass, 
    labelClass 
  }: { 
    mealId: string, 
    categoryKey: keyof MealSelection, 
    title: string, 
    options: MealFoodOption[], 
    bgClass: string, 
    labelClass: string 
  }) => {
    const selectedArr = selections[mealId]?.[categoryKey] || [];
    const selectedIds = new Set(selectedArr.map(o => o.food_id));

    return (
      <div className={`p-4 rounded-xl border border-slate-100 ${bgClass}`}>
        <h4 className={`text-sm font-bold mb-3 border-b border-white/40 pb-2 ${labelClass}`}>{title}</h4>
        <div className="space-y-3">
          {options.map((opt, i) => {
            const isSelected = selectedIds.has(opt.food_id);
            return (
              <div key={i} className="relative">
                <button 
                  onClick={() => handleSelectOption(mealId, categoryKey, opt)}
                  className={`w-full text-right bg-white/60 p-3 rounded-lg flex items-start gap-3 relative overflow-hidden group transition-all border outline-none
                    ${isSelected ? 'border-emerald-400 bg-white ring-2 ring-emerald-400/20 shadow-md transform scale-[1.02]' : 'border-white/50 hover:bg-white hover:border-slate-200'}
                  `}
                >
                  <div className={`w-1 h-full absolute right-0 top-0 ${isSelected ? 'bg-emerald-500' : labelClass.replace('text-', 'bg-')} opacity-60`} />
                  {/* Checkbox indicator */}
                  <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all
                    ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'}
                  `}>
                    {isSelected && <CheckCircle2 size={14} />}
                  </div>
                  <div className="flex-1 pr-1">
                    <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {opt.food_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                      <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">
                        {opt.grams} {(!opt.unit || opt.unit === 'g') ? 'גרם' : MEASUREMENT_UNIT_LABELS[opt.unit]}
                      </span>
                      <span className="text-slate-400">({opt.calories} קק״ל)</span>
                    </div>
                  </div>
                </button>
                {/* Swap button — only on selected items */}
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSwapModalState({
                        isOpen: true,
                        mealId,
                        category: categoryKey,
                        originalOption: opt,
                      });
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-400 hover:text-purple-600 transition-colors z-10"
                    title="החלף פריט"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {options.length === 0 && (
            <p className="text-xs text-slate-400 italic">לא נבחרו מקורות</p>
          )}
          {/* Add additional source button */}
          <button
            onClick={() => {
              // Open swap modal in "add" mode — use the first option as reference for target macros
              const refOption = options[0];
              if (refOption) {
                setSwapModalState({
                  isOpen: true,
                  mealId,
                  category: categoryKey,
                  originalOption: refOption,
                });
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 bg-white/40 hover:bg-white border border-dashed border-slate-200 hover:border-emerald-300 rounded-lg p-2 transition-all"
          >
            <Plus size={14} />
            הוסף מקור נוסף
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Daily Progress Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sticky top-4 z-10">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="font-bold text-slate-800">התקדמות יומית</h3>
            <p className="text-sm text-slate-500">סה״כ להיום: {Math.round(totalConsumed)} / {Math.round(targetCalories)} קלוריות</p>
          </div>
          <div className={`font-extrabold text-xl ${isOverTarget ? 'text-red-500' : 'text-emerald-600'}`}>
            {progressPercentage}%
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-4">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out ${isOverTarget ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
        
        {/* Macro Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MacroProgressBar
            label="חלבון"
            current={consumedProtein}
            target={targetProtein}
            colorClass="bg-green-500"
          />
          <MacroProgressBar
            label="פחמימה"
            current={consumedCarbs}
            target={targetCarbs}
            colorClass="bg-blue-500"
          />
          <MacroProgressBar
            label="שומן"
            current={consumedFat}
            target={targetFat}
            colorClass="bg-purple-500"
          />
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-purple-100 p-2 md:p-2.5 rounded-full text-purple-600 mb-2 md:mb-3">
            <Flame size={24} className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <p className="text-xs md:text-sm font-bold text-slate-500 mb-1">יעד קלורי</p>
          <p className="text-lg md:text-2xl font-extrabold text-slate-800">
            {data?.goal_calories ? Math.round(data.goal_calories).toLocaleString() : '---'}
          </p>
        </div>
        
        <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-100 p-2 md:p-2.5 rounded-full text-emerald-600 mb-2 md:mb-3">
            <Dumbbell size={24} className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <p className="text-xs md:text-sm font-bold text-slate-500 mb-1">חלבון</p>
          <div className="flex items-end gap-1">
            <p className="text-lg md:text-2xl font-extrabold text-slate-800">{data?.protein_grams ? Math.round(data.protein_grams) : '---'}</p>
            <span className="text-slate-400 text-xs md:text-sm mb-0.5 md:mb-1 font-medium">גרם</span>
          </div>
        </div>

        <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-100 p-2 md:p-2.5 rounded-full text-blue-600 mb-2 md:mb-3">
            <Droplet size={24} className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <p className="text-xs md:text-sm font-bold text-slate-500 mb-1">פחמימה</p>
          <div className="flex items-end gap-1">
            <p className="text-lg md:text-2xl font-extrabold text-slate-800">{data?.carbs_grams ? Math.round(data.carbs_grams) : '---'}</p>
            <span className="text-slate-400 text-xs md:text-sm mb-0.5 md:mb-1 font-medium">גרם</span>
          </div>
        </div>

        <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-amber-100 p-2 md:p-2.5 rounded-full text-amber-600 mb-2 md:mb-3">
            <Activity size={24} className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <p className="text-xs md:text-sm font-bold text-slate-500 mb-1">שומן</p>
          <div className="flex items-end gap-1">
            <p className="text-lg md:text-2xl font-extrabold text-slate-800">{data?.fat_grams ? Math.round(data.fat_grams) : '---'}</p>
            <span className="text-slate-400 text-xs md:text-sm mb-0.5 md:mb-1 font-medium">גרם</span>
          </div>
        </div>
      </div>

      {/* Accordion List */}
      <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4 px-1">תפריט התזונה היומי שלך</h3>
      <div className="space-y-4">
        {[...meals].sort((a, b) => a.meal_index - b.meal_index).map((meal) => {
          const isExpanded = expandedMeals[meal.id] ?? false; 
          const mealSelection = selections[meal.id];
          const hasSelectedAllThree = Boolean(mealSelection?.carb?.length && mealSelection?.protein?.length && mealSelection?.fat?.length);
          const isCompleted = todaysTracking?.completed_meals.includes(meal.id) || false;
          
          return (
            <div key={meal.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
              
              {/* Accordion Header */}
              <div 
                onClick={() => toggleMeal(meal.id)}
                className={`w-full flex items-center justify-between p-5 focus:outline-none hover:bg-slate-50 transition-colors text-right relative cursor-pointer ${isCompleted ? 'opacity-80 bg-emerald-50/40' : ''}`}
              >
                <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-b from-purple-500 to-emerald-400'}`} />
                <div className="flex items-center gap-4 pr-2 flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user?.id) {
                        // If uncompleting, clear local selections too
                        if (isCompleted) {
                          setSelections(prev => {
                            const next = { ...prev };
                            delete next[meal.id];
                            return next;
                          });
                        }
                        toggleMealCompletion(user.id, meal.id);
                      }
                    }}
                    className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
                      isCompleted 
                        ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-100 hover:bg-emerald-200' 
                        : 'text-slate-300 hover:text-emerald-500 hover:bg-slate-100'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={26} className="fill-emerald-100" /> : <Circle size={26} strokeWidth={2.5} />}
                  </button>
                  <div>
                    <h3 className={`text-lg font-bold transition-colors ${isCompleted ? 'text-emerald-800 line-through decoration-emerald-300 decoration-2' : 'text-slate-800'}`}>
                      {meal.meal_name}
                    </h3>
                    <div className="flex gap-4 mt-1 text-sm font-medium text-slate-500">
                      <span className="text-purple-600">~{meal.target_calories} קק״ל</span>
                      <span>{meal.target_protein}g חלבון</span>
                      <span>{meal.target_carbs}g פחמימה</span>
                      <span>{meal.target_fat}g שומן</span>
                    </div>
                  </div>
                </div>
                <div className="text-slate-300 bg-slate-50 p-2 border border-slate-100 rounded-full flex-shrink-0 ml-1">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-50 bg-slate-50/50">
                  <div className="mb-4 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <p className="text-sm text-slate-600 font-medium tracking-wide">
                      יש לבחור <strong className="text-emerald-600">מקור אחד</strong> מכל עמודה להרכבת הארוחה:
                    </p>
                    
                    <button
                      onClick={() => handleGenerateRecipe(meal.id)}
                      disabled={!hasSelectedAllThree}
                      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all
                        ${hasSelectedAllThree 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-purple-500/30 transform active:scale-95' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                      <Sparkles size={18} />
                      יצירת מתכון עם AI
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <OptionColumn 
                      mealId={meal.id}
                      categoryKey="carb"
                      title="1. פחמימות" 
                      options={meal.carb_options} 
                      bgClass="bg-blue-50/50" 
                      labelClass="text-blue-700"
                    />
                    <OptionColumn 
                      mealId={meal.id}
                      categoryKey="protein"
                      title="2. חלבונים" 
                      options={meal.protein_options} 
                      bgClass="bg-emerald-50/50" 
                      labelClass="text-emerald-700" 
                    />
                    <OptionColumn 
                      mealId={meal.id}
                      categoryKey="fat"
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

      {/* Free Entries Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-xl font-bold text-slate-800">הזנה חופשית</h3>
          <button
            onClick={() => setIsFreeEntryModalOpen(true)}
            className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            הוסף חריגה
          </button>
        </div>
        
        {todaysTracking?.free_entries && todaysTracking.free_entries.length > 0 ? (
          <div className="space-y-3">
            {todaysTracking.free_entries.map((entry) => (
              <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">{entry.name}</h4>
                  <div className="flex gap-3 text-xs text-slate-500 mt-1">
                    <span className="font-medium text-slate-700">{entry.calories} קק״ל</span>
                    {entry.protein ? <span>{entry.protein}g חלבון</span> : null}
                    {entry.carbs ? <span>{entry.carbs}g פחמימה</span> : null}
                    {entry.fats ? <span>{entry.fats}g שומן</span> : null}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (user?.id) removeFreeEntry(user.id, entry.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 border-dashed rounded-xl p-6 text-center text-slate-500">
            לא הוזנו חריגות או פריטים חופשיים היום.
          </div>
        )}
      </div>

      {/* General Diet Guidelines */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Info className="text-blue-500" />
          המלצות לתזונה ממוקדת
        </h3>
        <ul className="space-y-3 text-sm text-slate-700 font-medium mb-6">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>יש לשקול את המזון באמצעות משקל מטבח לפי ההנחיות (לפני/אחרי בישול).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>יש לשתות לפחות ליטר וחצי מים במהלך היום.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>שימו לב:</strong> רוב הירקות מכילים קלוריות! הירקות היחידים המותרים לאכילה חופשית הם: מלפפון, חסה וסלרי. שאר הירקות יש להגביל/למדוד.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>קפה:</strong> עד 3 כוסות ביום. כוס קפה ראשונה - ללא סוכר, רק שעה מרגע הקימה, ועם מעט מאוד חלב (עדיף ללא חלב בכלל אם אפשר).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><strong>ימי אימון:</strong> מומלץ לרכז את רוב הפחמימות לארוחה שאחרי אימון הכוח.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>ניתן להחליף בין האופציות ולגוון חופשי, כל עוד נשמר היעד הקלורי והחלבון היומי.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>ארוחות במסעדות או חריגות - בתיאום איתי.</span>
          </li>
        </ul>
        <div className="bg-white p-4 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-700">הבהרה משפטית:</strong> צוות SHIFT הינם מאמני כושר ואינם דיאטנים קליניים או רופאים. תבנית זו מהווה המלצה כללית בלבד לאורח חיים אקטיבי ובריא, ואינה מהווה תחליף לייעוץ תזונתי, רפואי או קליני מוסמך. יישום ההמלצות הינו באחריות המתאמן בלבד. במקרה של רגישויות, אלרגיות, מחלות רקע או היריון, חובה להתייעץ עם רופא או תזונאי קליני בטרם תחילת התוכנית.
        </div>
      </div>
      
      {/* Free Entry Modal */}
      {isFreeEntryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">הוספת פריט חופשי</h3>
              <button onClick={() => setIsFreeEntryModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddFreeEntry} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">שם הפריט / ארוחה *</label>
                <input
                  required
                  type="text"
                  value={freeEntryForm.name}
                  onChange={e => setFreeEntryForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-800"
                  placeholder="למשל: משולש פיצה, חטיף שוקולד..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">קלוריות (סה״כ) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={freeEntryForm.calories}
                  onChange={e => setFreeEntryForm(prev => ({ ...prev, calories: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-800"
                  placeholder="0"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 text-center">חלבון (גרם)</label>
                  <input
                    type="number"
                    min="0"
                    value={freeEntryForm.protein}
                    onChange={e => setFreeEntryForm(prev => ({ ...prev, protein: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 text-center">פחמימה (גרם)</label>
                  <input
                    type="number"
                    min="0"
                    value={freeEntryForm.carbs}
                    onChange={e => setFreeEntryForm(prev => ({ ...prev, carbs: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 text-center">שומן (גרם)</label>
                  <input
                    type="number"
                    min="0"
                    value={freeEntryForm.fats}
                    onChange={e => setFreeEntryForm(prev => ({ ...prev, fats: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!freeEntryForm.name || !freeEntryForm.calories}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                הוסף ושמור
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Recipe Modal */}
      <RecipeModal
        isOpen={isModalOpen}
        isLoading={isAILoading}
        recipeMarkdown={recipeResult}
        error={aiError}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Smart Swap Modal */}
      {swapModalState && (
        <SwapModal
          isOpen={swapModalState.isOpen}
          onClose={() => setSwapModalState(null)}
          originalOption={swapModalState.originalOption}
          category={swapModalState.category}
          onSwap={handleSwap}
        />
      )}

    </div>
  );
}
