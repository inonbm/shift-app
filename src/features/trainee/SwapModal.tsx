import { useState, useMemo, useEffect } from 'react';
import { X, Search, ArrowLeftRight, Loader2, AlertCircle } from 'lucide-react';
import { useFoodStore } from '../../stores/foodStore';
import type { Food, MealFoodOption, MeasurementUnit } from '../../types';
import { MEASUREMENT_UNIT_LABELS } from '../../types';

// ── Helpers (shared with dietGenerator.ts) ────────────────────────────────
const WEIGHT_BASED_UNITS: ReadonlySet<string> = new Set(['g', 'ml']);
const isWeightBased = (food: Food) => WEIGHT_BASED_UNITS.has(food.measurement_unit);
const macroRef = (food: Food): number =>
  food.serving_size > 0 ? food.serving_size : (isWeightBased(food) ? 100 : 1);

type MacroKey = 'protein_per_100g' | 'carbs_per_100g' | 'fats_per_100g';

interface SwapCandidate {
  food: Food;
  quantity: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

// ── Portion caps ──────────────────────────────────────────────────────────
const MAX_UNIT_ITEMS = 8;
const MAX_WEIGHT_G = 600;

function computeSwapCandidate(
  food: Food,
  targetMacroGrams: number,
  macroKey: MacroKey
): SwapCandidate | null {
  const macroPer = food[macroKey];
  if (macroPer <= 0) return null;

  const ref = macroRef(food);
  const rawQuantity = (targetMacroGrams * ref) / macroPer;

  // Apply portion caps
  const cap = isWeightBased(food) ? MAX_WEIGHT_G : MAX_UNIT_ITEMS;
  if (rawQuantity > cap || rawQuantity <= 0) return null;

  // Smart rounding
  let quantity: number;
  if (isWeightBased(food)) {
    quantity = rawQuantity < 20
      ? Math.round(rawQuantity)
      : food.primary_category === 'fat'
        ? Math.round(rawQuantity / 5) * 5
        : Math.round(rawQuantity / 10) * 10;
  } else {
    quantity = Math.round(rawQuantity);
    if (quantity <= 0) quantity = 1;
  }

  const protein_g = (food.protein_per_100g / ref) * quantity;
  const carbs_g = (food.carbs_per_100g / ref) * quantity;
  const fat_g = (food.fats_per_100g / ref) * quantity;
  const calories = (food.calories_per_100g / ref) * quantity;

  return {
    food,
    quantity: Math.round(quantity * 10) / 10,
    protein_g: Math.round(protein_g * 10) / 10,
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
    calories: Math.round(calories),
  };
}

// ── Component ─────────────────────────────────────────────────────────────

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The original food item being swapped — used to derive the macro target */
  originalOption: MealFoodOption;
  /** Which macro category this food belongs to */
  category: 'protein' | 'carb' | 'fat';
  /** Called when the user picks a swap candidate */
  onSwap: (newOption: MealFoodOption) => void;
}

const CATEGORY_CONFIG: Record<string, { macroKey: MacroKey; label: string; foodCategory: string; color: string }> = {
  protein: { macroKey: 'protein_per_100g', label: 'חלבון', foodCategory: 'protein', color: 'emerald' },
  carb:    { macroKey: 'carbs_per_100g',   label: 'פחמימה', foodCategory: 'carb',    color: 'blue' },
  fat:     { macroKey: 'fats_per_100g',    label: 'שומן',   foodCategory: 'fat',     color: 'amber' },
};

export function SwapModal({ isOpen, onClose, originalOption, category, onSwap }: SwapModalProps) {
  const { foods, fetchFoods, isLoading: isFoodsLoading } = useFoodStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch foods once on mount if not already loaded
  useEffect(() => {
    if (isOpen && foods.length === 0) {
      fetchFoods();
    }
  }, [isOpen, foods.length, fetchFoods]);

  const config = CATEGORY_CONFIG[category];

  // Determine target: how many grams of the primary macro the original option provides
  const targetMacroGrams = useMemo(() => {
    switch (category) {
      case 'protein': return originalOption.protein_g;
      case 'carb':    return originalOption.carbs_g;
      case 'fat':     return originalOption.fat_g;
    }
  }, [category, originalOption]);

  // Compute swap candidates from all foods in the same category
  const candidates = useMemo(() => {
    if (!foods.length || targetMacroGrams <= 0) return [];

    const categoryFoods = foods.filter(f => f.primary_category === config.foodCategory);

    const results: SwapCandidate[] = [];
    for (const food of categoryFoods) {
      // Skip the original food
      if (food.id === originalOption.food_id) continue;

      const candidate = computeSwapCandidate(food, targetMacroGrams, config.macroKey);
      if (candidate) results.push(candidate);
    }

    // Sort by calorie efficiency (closest calories first)
    results.sort((a, b) => a.calories - b.calories);
    return results;
  }, [foods, targetMacroGrams, config, originalOption.food_id]);

  // Filter by search
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(c => c.food.name.toLowerCase().includes(q));
  }, [candidates, searchQuery]);

  const handleSelect = (candidate: SwapCandidate) => {
    const newOption: MealFoodOption = {
      food_id: candidate.food.id,
      food_name: candidate.food.name,
      unit: candidate.food.measurement_unit as MeasurementUnit,
      grams: candidate.quantity,
      protein_g: candidate.protein_g,
      carbs_g: candidate.carbs_g,
      fat_g: candidate.fat_g,
      calories: candidate.calories,
    };
    onSwap(newOption);
    onClose();
  };

  if (!isOpen) return null;

  const unitLabel = (c: SwapCandidate) => {
    const u = c.food.measurement_unit;
    if (!u || u === 'g') return 'גרם';
    return MEASUREMENT_UNIT_LABELS[u] || u;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ArrowLeftRight size={20} className={`text-${config.color}-600`} />
                החלפת {config.label}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                חלופות ל-<strong className="text-slate-700">{originalOption.food_name}</strong>
                {' '}({Math.round(targetMacroGrams)}g {config.label})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1.5 shadow-sm border border-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Original item summary */}
          <div className={`mt-3 p-3 rounded-lg bg-${config.color}-50 border border-${config.color}-100 text-sm`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">{originalOption.food_name}</span>
              <span className="text-slate-500 text-xs">
                {originalOption.grams} {(!originalOption.unit || originalOption.unit === 'g') ? 'גרם' : MEASUREMENT_UNIT_LABELS[originalOption.unit]}
              </span>
            </div>
            <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
              <span>{originalOption.calories} קק״ל</span>
              <span>{originalOption.protein_g}g חלבון</span>
              <span>{originalOption.carbs_g}g פחמימה</span>
              <span>{originalOption.fat_g}g שומן</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="חיפוש מזון..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-800"
            />
          </div>
        </div>

        {/* Candidates list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isFoodsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 size={28} className="animate-spin mb-3" />
              <p className="text-sm">טוען מאכלים...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <AlertCircle size={28} className="mb-3" />
              <p className="text-sm">
                {searchQuery ? 'לא נמצאו תוצאות' : 'אין חלופות זמינות'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-3 px-1">
                {filteredCandidates.length} חלופות — הכמויות מחושבות עבור ~{Math.round(targetMacroGrams)}g {config.label}
              </p>
              {filteredCandidates.map(candidate => (
                <button
                  key={candidate.food.id}
                  onClick={() => handleSelect(candidate)}
                  className="w-full text-right bg-white hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all group flex items-start gap-3 active:scale-[0.99]"
                >
                  <div className={`w-1 h-full min-h-[3rem] rounded-full bg-${config.color}-400 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-800 group-hover:text-emerald-700 transition-colors">
                      {candidate.food.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium flex-wrap">
                      <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-bold text-slate-700">
                        {candidate.quantity} {unitLabel(candidate)}
                      </span>
                      <span>{candidate.calories} קק״ל</span>
                      <span className="text-emerald-600">{candidate.protein_g}g ח׳</span>
                      <span className="text-blue-600">{candidate.carbs_g}g פ׳</span>
                      <span className="text-amber-600">{candidate.fat_g}g ש׳</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-slate-300 group-hover:text-emerald-500 transition-colors self-center">
                    <ArrowLeftRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
