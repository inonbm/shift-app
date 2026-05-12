import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Calculator, Flame, Loader2, AlertCircle, Edit2, Save, Trash2, Utensils, Dumbbell, Sparkles, Plus, KeyRound, Clock, CalendarDays, MessageCircle, SlidersHorizontal, CheckCheck, X, Search } from 'lucide-react';
import { useTraineeStore } from '../../stores/traineeStore';
import { useDietStore } from '../../stores/dietStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useFoodStore } from '../../stores/foodStore';
import { useTrackingStore } from '../../stores/trackingStore';
import { supabase } from '../../lib/supabase';
import { ResetPasswordModal } from '../../components/ui/ResetPasswordModal';
import { DeleteUserModal } from '../../components/ui/DeleteUserModal';
import { GOAL_LABELS, ACTIVITY_LEVEL_LABELS, GENDER_LABELS, MEASUREMENT_UNIT_LABELS } from '../../types';
import type { Gender, ActivityLevel, Goal, TraineeData, MealFoodOption, Food, DailyTracking } from '../../types';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros } from '../../lib/nutrition';
import { recalculateDietTotals } from '../../lib/dietGenerator';

type Tab = 'overview' | 'diet' | 'workouts' | 'nutrition_log';

export function TraineeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { currentTrainee, fetchTraineeById, updateTraineeData, isLoading: isTraineeLoading, error: traineeError } = useTraineeStore();
  const { meals, fetchDiet, generateDiet, isLoading: isDietLoading, error: dietError } = useDietStore();
  const { templates, fetchTemplates, sessions, fetchHistory, deleteTemplate, updateExercise, addExerciseToTemplate, deleteExercise, error: workoutError } = useWorkoutStore();
  const { foods, fetchFoods } = useFoodStore();
  const { fetchTrackingForDate } = useTrackingStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TraineeData>>({});
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Manual nutrition target override state ---
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [targetsForm, setTargetsForm] = useState({ goal_calories: 0, protein_grams: 0, carbs_grams: 0, fat_grams: 0 });

  // --- Structured menu editing state ---
  interface MealEdit {
    meal_name: string;
    protein_options: MealFoodOption[];
    carb_options: MealFoodOption[];
    fat_options: MealFoodOption[];
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fat?: number;
  }
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [menuEdits, setMenuEdits] = useState<Record<string, MealEdit>>({});
  // Per-meal, per-category: which food is selected in the dropdown and how many grams
  const [addForms, setAddForms] = useState<Record<string, Record<string, { foodId: string; grams: number }>>>({});
  const [foodSearch, setFoodSearch] = useState<Record<string, Record<string, string>>>({});
  
  // --- Nutrition log state ---
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dayLog, setDayLog] = useState<DailyTracking | null>(null);
  const [isLogLoading, setIsLogLoading] = useState(false);

  // --- Workout editing state ---
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseForm, setExerciseForm] = useState<{ exercise_name: string; target_sets: number; target_reps: number }>({ exercise_name: '', target_sets: 3, target_reps: 10 });
  const [addingToTemplateId, setAddingToTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTraineeById(id);
      fetchDiet(id);
      fetchTemplates();
      fetchHistory();
    }
  }, [id, fetchTraineeById, fetchDiet, fetchTemplates, fetchHistory]);

  useEffect(() => {
    if (activeTab === 'nutrition_log' && id) {
      const loadLog = async () => {
        setIsLogLoading(true);
        const log = await fetchTrackingForDate(id, logDate);
        setDayLog(log);
        setIsLogLoading(false);
      };
      loadLog();
    }
  }, [activeTab, logDate, id, fetchTrackingForDate]);

  if (isTraineeLoading && !currentTrainee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-purple-600">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-medium">טוען פרופיל מתאמן...</p>
      </div>
    );
  }

  if (!currentTrainee) return null;

  const data = currentTrainee.trainee_data;
  const traineeTemplates = templates.filter(t => t.trainee_id === id);
  const traineeSessions = sessions.filter(s => s.trainee_id === id);
  const compositeError = traineeError || dietError || workoutError;

  // --- Handlers ---
  const handleEditClick = () => {
    if (data) {
      setEditForm({
        gender: data.gender,
        age: data.age,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        activity_level: data.activity_level,
        goal: data.goal,
        is_busy_lifestyle: data.is_busy_lifestyle ?? false,
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setEditForm(prev => ({ ...prev, [name]: checked }));
  };

  const handleSave = async () => {
    if (!id || !editForm.gender || !editForm.weight_kg || !editForm.height_cm || !editForm.age || !editForm.activity_level || !editForm.goal) {
      return;
    }

    const bmr = calculateBMR(editForm.gender as Gender, editForm.weight_kg, editForm.height_cm, editForm.age);
    const tdee = calculateTDEE(bmr, editForm.activity_level as ActivityLevel);
    const goalCalories = calculateTargetCalories(tdee, editForm.goal as Goal);
    const macros = calculateMacros(editForm.weight_kg, Math.max(0, goalCalories));

    const payload: Partial<TraineeData> = {
      ...editForm,
      bmr,
      tdee,
      goal_calories: goalCalories,
      protein_grams: macros.proteinGrams,
      carbs_grams: macros.carbsGrams,
      fat_grams: macros.fatGrams,
    };

    try {
      await updateTraineeData(id, payload);
      await fetchTraineeById(id);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update', err);
    }
  };

  const confirmDeleteUser = async () => {
    if (!id) return;
    setIsDeleting(true);

    try {
      const { error: deleteError } = await supabase.functions.invoke('admin-delete-user', { 
        body: { targetUserId: id } 
      });
      
      if (deleteError) {
        console.error('Edge Function Error:', deleteError);
        throw deleteError;
      }
      
      setIsDeleteModalOpen(false);
      navigate('/trainer');
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      alert(`שגיאה במחיקת המשתמש: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateDiet = async () => {
    if (!id) return;
    try {
      await generateDiet(id);
    } catch (err) {
      console.error('Failed to generate diet', err);
    }
  };

  // --- Manual nutrition targets handlers ---
  const handleEditTargetsClick = () => {
    if (!data) return;
    setTargetsForm({
      goal_calories: Math.round(data.goal_calories ?? 0),
      protein_grams: Math.round(data.protein_grams ?? 0),
      carbs_grams: Math.round(data.carbs_grams ?? 0),
      fat_grams: Math.round(data.fat_grams ?? 0),
    });
    setIsEditingTargets(true);
  };

  const handleSaveTargets = async () => {
    if (!id) return;
    setIsSavingTargets(true);
    try {
      await updateTraineeData(id, {
        goal_calories: targetsForm.goal_calories,
        protein_grams: targetsForm.protein_grams,
        carbs_grams: targetsForm.carbs_grams,
        fat_grams: targetsForm.fat_grams,
      });
      await fetchTraineeById(id);
      setIsEditingTargets(false);
    } catch (err) {
      console.error('Failed to save targets', err);
    } finally {
      setIsSavingTargets(false);
    }
  };

  // --- Structured menu editing handlers ---
  const buildMealFoodOption = (food: Food, grams: number): MealFoodOption => {
    const factor = grams / (food.serving_size || 100);
    return {
      food_id: food.id,
      food_name: food.name,
      unit: food.measurement_unit || 'g',
      grams: Math.round(grams),
      protein_g: Math.round(food.protein_per_100g * factor * 10) / 10,
      carbs_g: Math.round(food.carbs_per_100g * factor * 10) / 10,
      fat_g: Math.round(food.fats_per_100g * factor * 10) / 10,
      calories: Math.round(food.calories_per_100g * factor),
    };
  };

  /**
   * Calculates representative meal totals for the edit-mode header chip.
   *
   * The three option arrays (protein_options, carb_options, fat_options) are
   * mutually-exclusive "OR" choices: a trainee picks ONE item per category.
   * We therefore use index [0] from each array as the representative sample
   * instead of summing every alternative, which would massively overcount.
   */
  // No longer needed, use recalculateDietTotals instead

  const handleEditMenuClick = async () => {
    // Load foods if not loaded yet
    if (foods.length === 0) await fetchFoods();
    const edits: Record<string, MealEdit> = {};
    meals.forEach(m => {
      edits[m.id] = {
        meal_name: m.meal_name,
        protein_options: [...m.protein_options],
        carb_options: [...m.carb_options],
        fat_options: [...m.fat_options],
        target_calories: m.target_calories,
        target_protein: m.target_protein,
        target_carbs: m.target_carbs,
        target_fat: m.target_fat,
      };
    });
    setMenuEdits(edits);
    setAddForms({});
    setFoodSearch({});
    setIsEditingMenu(true);
  };

  const handleRemoveItem = (mealId: string, category: 'protein_options' | 'carb_options' | 'fat_options', foodId: string) => {
    setMenuEdits(prev => {
      const updatedMeal = {
        ...prev[mealId],
        [category]: prev[mealId][category].filter(o => o.food_id !== foodId),
      };
      
      const [recalculated] = recalculateDietTotals([updatedMeal]);
      
      return {
        ...prev,
        [mealId]: recalculated
      };
    });
  };

  const handleAddItem = (mealId: string, category: 'protein_options' | 'carb_options' | 'fat_options') => {
    const form = addForms[mealId]?.[category];
    if (!form?.foodId || !form?.grams || form.grams <= 0) return;
    const food = foods.find(f => f.id === form.foodId);
    if (!food) return;
    const option = buildMealFoodOption(food, form.grams);
    setMenuEdits(prev => {
      const updatedMeal = {
        ...prev[mealId],
        [category]: [...prev[mealId][category], option],
      };
      const [recalculated] = recalculateDietTotals([updatedMeal]);
      return {
        ...prev,
        [mealId]: recalculated
      };
    });
    // Reset this add-form
    setAddForms(prev => ({
      ...prev,
      [mealId]: { ...prev[mealId], [category]: { foodId: '', grams: 100 } },
    }));
    setFoodSearch(prev => ({
      ...prev,
      [mealId]: { ...prev[mealId], [category]: '' },
    }));
  };

  const handleUpdateItemAmount = (mealId: string, category: 'protein_options' | 'carb_options' | 'fat_options', foodId: string, newGrams: number) => {
    if (newGrams < 0) return;
    setMenuEdits(prev => {
      const meal = prev[mealId];
      const updatedOptions = meal[category].map(opt => {
        if (opt.food_id === foodId) {
          const food = foods.find(f => f.id === foodId);
          if (food) {
             return buildMealFoodOption(food, newGrams);
          }
        }
        return opt;
      });

      const updatedMeal = {
        ...meal,
        [category]: updatedOptions
      };

      const [recalculated] = recalculateDietTotals([updatedMeal]);

      return {
        ...prev,
        [mealId]: recalculated
      };
    });
  };

  const handleSaveMenu = async () => {
    setIsSavingMenu(true);
    try {
      const updates = Object.entries(menuEdits).map(([mealId, fields]) => {
        return supabase
          .from('generated_meals')
          .update({
            meal_name: fields.meal_name,
            protein_options: fields.protein_options,
            carb_options: fields.carb_options,
            fat_options: fields.fat_options,
            target_calories: fields.target_calories || 0,
            target_protein: fields.target_protein || 0,
            target_carbs: fields.target_carbs || 0,
            target_fat: fields.target_fat || 0,
          })
          .eq('id', mealId);
      });
      await Promise.all(updates);
      if (id) await fetchDiet(id);
      setIsEditingMenu(false);
    } catch (err) {
      console.error('Failed to save menu edits', err);
    } finally {
      setIsSavingMenu(false);
    }
  };

  // Helper: filter foods by category for the dropdown
  const getFoodsByCategory = (category: 'protein_options' | 'carb_options' | 'fat_options', mealId: string) => {
    const catMap = { protein_options: 'protein', carb_options: 'carb', fat_options: 'fat' } as const;
    const primaryCat = catMap[category];
    const search = (foodSearch[mealId]?.[category] || '').trim().toLowerCase();
    return foods
      .filter(f => f.primary_category === primaryCat)
      .filter(f => !search || f.name.toLowerCase().includes(search));
  };

  const cleanPhoneNumber = (phone: string) => phone.replace(/\D/g, '');

  const handleWhatsAppShare = () => {
    if (!currentTrainee) return;
    
    // Check if the user is already an admin/trainer bypassing? Usually this is just sending a link.
    const text = `היי ${currentTrainee.full_name},
הכנס לפרופיל האישי שלך באפליקציית SHIFT! 

כניסה לאפליקציה: ${window.location.origin}/login
האימייל שלך: ${currentTrainee.email}`;
    
    const encodedText = encodeURIComponent(text);
    if (currentTrainee.phone_number) {
      const cleanPhone = cleanPhoneNumber(currentTrainee.phone_number);
      window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <button 
          onClick={() => navigate('/trainer')}
          className="p-2 -mr-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
        >
          <ChevronRight size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{currentTrainee.full_name}</h1>
          <p className="text-sm text-slate-500">{currentTrainee.email}</p>
        </div>
        {!isEditing && data && activeTab === 'overview' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
              title="איפוס סיסמה"
            >
              <KeyRound size={20} />
            </button>
            <button 
              onClick={handleWhatsAppShare}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
              title="שתף ב-WhatsApp"
            >
              <MessageCircle size={20} />
            </button>
            <button 
              onClick={handleEditClick}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors text-sm font-bold"
            >
              <Edit2 size={16} /> ערוך
            </button>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isTraineeLoading || isDeleting}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="מחק מתאמן"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {compositeError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium">{compositeError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto w-full md:w-fit bg-slate-200/50 p-1 rounded-xl mx-auto md:mx-0 snap-x">
        <button
          onClick={() => { setActiveTab('overview'); setIsEditing(false); }}
          className={`whitespace-nowrap flex-shrink-0 snap-start flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'overview' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calculator size={18} />
          נתונים
        </button>
        <button
          onClick={() => { setActiveTab('diet'); setIsEditing(false); }}
          className={`whitespace-nowrap flex-shrink-0 snap-start flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'diet' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Utensils size={18} />
          תזונה
        </button>
        <button
          onClick={() => { setActiveTab('workouts'); setIsEditing(false); }}
          className={`whitespace-nowrap flex-shrink-0 snap-start flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'workouts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Dumbbell size={18} />
          אימונים
        </button>
        <button
          onClick={() => { setActiveTab('nutrition_log'); setIsEditing(false); }}
          className={`whitespace-nowrap flex-shrink-0 snap-start flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'nutrition_log' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarDays size={18} />
          יומן תזונה
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Physical Stats Card / Edit Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calculator className="text-purple-500" />
                <h2 className="text-lg font-bold text-slate-800">
                  {isEditing ? 'עריכת נתונים' : 'נתונים פיזיים'}
                </h2>
              </div>
            </div>
            
            {data ? (
              isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">גיל</label>
                      <input type="number" name="age" value={editForm.age || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">מגדר</label>
                      <select name="gender" value={editForm.gender} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm">
                        {(Object.keys(GENDER_LABELS) as Gender[]).map(g => (
                          <option key={g} value={g}>{GENDER_LABELS[g]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">משקל (ק״ג)</label>
                      <input type="number" step="0.1" name="weight_kg" value={editForm.weight_kg || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">גובה (ס״מ)</label>
                      <input type="number" name="height_cm" value={editForm.height_cm || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">רמת פעילות</label>
                      <select name="activity_level" value={editForm.activity_level} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm">
                        {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map(lvl => (
                          <option key={lvl} value={lvl}>{ACTIVITY_LEVEL_LABELS[lvl]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">מטרה תזונתית</label>
                      <select name="goal" value={editForm.goal} onChange={handleChange} className="w-full bg-purple-50 border border-purple-200 text-purple-900 font-bold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-400">
                        {(Object.keys(GOAL_LABELS) as Goal[]).map(g => (
                          <option key={g} value={g}>{GOAL_LABELS[g]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Busy Lifestyle toggle */}
                  <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
                    <input
                      type="checkbox"
                      name="is_busy_lifestyle"
                      checked={(editForm as any).is_busy_lifestyle ?? false}
                      onChange={handleCheckboxChange}
                      className="mt-0.5 w-4 h-4 rounded accent-amber-500 flex-shrink-0 cursor-pointer"
                    />
                    <div>
                      <p className="font-bold text-amber-800 text-xs">מתאמן עסוק / סטודנט ⏱️</p>
                      <p className="text-xs text-amber-600 mt-0.5">מעדיף מאכלים מהירים וללא בישול בעת יצירת תפריט</p>
                    </div>
                  </label>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button 
                      onClick={handleCancelEdit}
                      disabled={isTraineeLoading}
                      className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-sm transition-colors"
                    >
                      ביטול
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isTraineeLoading}
                      className="flex-1 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {isTraineeLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      שמור וחשב
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">גיל</p>
                    <p className="font-bold text-slate-800">{data.age} שנים</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">מגדר</p>
                    <p className="font-bold text-slate-800">{GENDER_LABELS[data.gender]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">גובה</p>
                    <p className="font-bold text-slate-800">{data.height_cm} ס״מ</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">משקל</p>
                    <p className="font-bold text-slate-800">{data.weight_kg} ק״ג</p>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-sm text-slate-500">רמת פעילות</p>
                    <p className="font-bold text-slate-800">{ACTIVITY_LEVEL_LABELS[data.activity_level]}</p>
                  </div>
                  <div className="col-span-1 md:col-span-2 bg-purple-50 p-3 rounded-xl border border-purple-100 mt-2">
                    <p className="text-sm font-medium text-purple-600 mb-1">מטרה תזונתית</p>
                    <p className="font-bold text-purple-900 text-lg">{GOAL_LABELS[data.goal]}</p>
                  </div>
                </div>
              )
            ) : (
              <p className="text-sm text-slate-500">אין נתונים פיזיים זמינים.</p>
            )}
          </div>

          {/* Nutrition Target Card */}
          <div className={`text-white p-6 rounded-2xl shadow-lg space-y-4 transition-colors ${isEditing ? 'bg-slate-700' : 'bg-slate-800'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Flame className="text-emerald-400" />
                <h2 className="text-lg font-bold">יעדי תזונה (יומי)</h2>
              </div>
              {data && !isEditing && !isEditingTargets && (
                <button
                  onClick={handleEditTargetsClick}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  title="עריכה ידנית של יעדי תזונה"
                >
                  <SlidersHorizontal size={13} />
                  עריכת יעדים
                </button>
              )}
            </div>

            {data ? (
              isEditingTargets ? (
                <div className="space-y-3">
                  <div className="bg-slate-700/50 p-4 rounded-xl border border-amber-500/40">
                    <label className="block text-emerald-300 font-medium text-xs mb-1">קלוריות יומיות (קק״ל)</label>
                    <input
                      type="number"
                      value={targetsForm.goal_calories}
                      onChange={e => setTargetsForm(f => ({ ...f, goal_calories: Number(e.target.value) }))}
                      className="w-full bg-slate-900/70 text-white text-2xl font-bold text-center rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 border border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-slate-300 min-w-[60px]">חלבון</span>
                      <input
                        type="number"
                        value={targetsForm.protein_grams}
                        onChange={e => setTargetsForm(f => ({ ...f, protein_grams: Number(e.target.value) }))}
                        className="flex-1 bg-slate-900/70 text-emerald-400 font-bold text-right rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-400 border border-slate-600 text-sm"
                      />
                      <span className="text-slate-400 text-sm">g</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-slate-300 min-w-[60px]">שומן</span>
                      <input
                        type="number"
                        value={targetsForm.fat_grams}
                        onChange={e => setTargetsForm(f => ({ ...f, fat_grams: Number(e.target.value) }))}
                        className="flex-1 bg-slate-900/70 text-purple-400 font-bold text-right rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-purple-400 border border-slate-600 text-sm"
                      />
                      <span className="text-slate-400 text-sm">g</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-slate-300 min-w-[60px]">פחמימה</span>
                      <input
                        type="number"
                        value={targetsForm.carbs_grams}
                        onChange={e => setTargetsForm(f => ({ ...f, carbs_grams: Number(e.target.value) }))}
                        className="flex-1 bg-slate-900/70 text-blue-400 font-bold text-right rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400 border border-slate-600 text-sm"
                      />
                      <span className="text-slate-400 text-sm">g</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setIsEditingTargets(false)}
                      disabled={isSavingTargets}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold text-sm transition-colors"
                    >
                      <X size={14} /> ביטול
                    </button>
                    <button
                      onClick={handleSaveTargets}
                      disabled={isSavingTargets}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-bold text-sm transition-colors"
                    >
                      {isSavingTargets ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                      שמור יעדים
                    </button>
                  </div>
                  <p className="text-xs text-amber-300/80 text-center">⚠ שינוי ידני יחליף את חישוב ה-BMR</p>
                </div>
              ) : (
                <div className={`space-y-4 ${isEditing ? 'opacity-50' : 'opacity-100'} transition-opacity delay-100`}>
                  <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 text-center">
                    <p className="text-emerald-300 font-medium mb-1 text-sm">הקצבה יומית (קלוריות)</p>
                    <div className="text-4xl font-bold text-white flex items-baseline justify-center gap-1">
                      {data.goal_calories ? Math.round(data.goal_calories).toLocaleString() : '---'}
                      <span className="text-base text-slate-400 font-normal">קק״ל</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-slate-300">חלבון</span>
                      <span className="font-bold text-emerald-400 text-lg">{data.protein_grams}g</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-slate-300">שומן</span>
                      <span className="font-bold text-purple-400 text-lg">{data.fat_grams}g</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="text-slate-300">פחמימה</span>
                      <span className="font-bold text-blue-400 text-lg">{data.carbs_grams}g</span>
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
                      היעדים יעודכנו אוטומטית לפי הנוסחאות<br/>
                      לאחר לחיצה על לחצן השמירה.
                    </div>
                  )}
                </div>
              )
            ) : (
              <p className="text-sm text-slate-400">יש להזין נתונים פיזיים כדי לראות יעדי תזונה.</p>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 2: DIET                                             */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'diet' && (
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
              {meals.sort((a, b) => a.meal_index - b.meal_index).map((meal) => {
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
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 3: WORKOUTS                                           */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'workouts' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">תוכניות אימון צמודות</h2>
              <p className="text-sm text-slate-500">תבניות הפעילות שהוקצו למתאמן זה</p>
            </div>
            <button
              onClick={() => navigate(`/trainer/workouts/new?traineeId=${id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus size={18} />
              צור תוכנית חדשה
            </button>
          </div>

          {traineeTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">עדיין לא הוקצו תוכניות אימון.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {traineeTemplates.map(template => (
                <div key={template.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-slate-800">{template.name}</h3>
                    <button
                      onClick={() => {
                        if (confirm('האם אתה בטוח שברצונך למחוק תוכנית אימון זו?')) {
                          deleteTemplate(template.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="מחק תוכנית"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {template.exercises.sort((a,b) => a.order_index - b.order_index).map(ex => (
                      <div key={ex.id} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100">
                        {editingExerciseId === ex.id ? (
                          <div className="flex-1 flex gap-2">
                            <input 
                              type="text" 
                              value={exerciseForm.exercise_name} 
                              onChange={e => setExerciseForm({ ...exerciseForm, exercise_name: e.target.value })}
                              className="w-full px-2 py-1 text-xs border rounded bg-slate-50"
                            />
                            <input 
                              type="number" 
                              value={exerciseForm.target_sets} 
                              onChange={e => setExerciseForm({ ...exerciseForm, target_sets: Number(e.target.value) })}
                              className="w-12 px-2 py-1 text-xs border rounded bg-slate-50 text-center"
                            />
                            <span className="self-center text-slate-400">×</span>
                            <input 
                              type="number" 
                              value={exerciseForm.target_reps} 
                              onChange={e => setExerciseForm({ ...exerciseForm, target_reps: Number(e.target.value) })}
                              className="w-12 px-2 py-1 text-xs border rounded bg-slate-50 text-center"
                            />
                            <button onClick={() => {
                              updateExercise(ex.id, exerciseForm);
                              setEditingExerciseId(null);
                            }} className="text-emerald-500 hover:text-emerald-700">
                              <Save size={16} />
                            </button>
                            <button onClick={() => setEditingExerciseId(null)} className="text-slate-400 hover:text-slate-600">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium text-slate-700">{ex.exercise_name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500 font-mono">{ex.target_sets} × {ex.target_reps}</span>
                              <button 
                                onClick={() => {
                                  setEditingExerciseId(ex.id);
                                  setExerciseForm({ exercise_name: ex.exercise_name, target_sets: ex.target_sets, target_reps: ex.target_reps });
                                }} 
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => deleteExercise(ex.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {addingToTemplateId === template.id ? (
                    <div className="mt-3 bg-white p-2 border border-blue-200 rounded-lg flex gap-2 text-sm">
                      <input 
                        type="text" 
                        placeholder="שם תרגיל"
                        value={exerciseForm.exercise_name} 
                        onChange={e => setExerciseForm({ ...exerciseForm, exercise_name: e.target.value })}
                        className="w-full px-2 py-1 text-xs border rounded bg-slate-50"
                      />
                      <input 
                        type="number" 
                        placeholder="סטים"
                        value={exerciseForm.target_sets} 
                        onChange={e => setExerciseForm({ ...exerciseForm, target_sets: Number(e.target.value) })}
                        className="w-12 px-2 py-1 text-xs border rounded bg-slate-50 text-center"
                      />
                      <input 
                        type="number" 
                        placeholder="חזרות"
                        value={exerciseForm.target_reps} 
                        onChange={e => setExerciseForm({ ...exerciseForm, target_reps: Number(e.target.value) })}
                        className="w-12 px-2 py-1 text-xs border rounded bg-slate-50 text-center"
                      />
                      <button onClick={() => {
                        addExerciseToTemplate(template.id, {
                          exercise_name: exerciseForm.exercise_name,
                          target_sets: exerciseForm.target_sets,
                          target_reps: exerciseForm.target_reps,
                          order_index: template.exercises.length
                        });
                        setAddingToTemplateId(null);
                      }} className="text-emerald-500 hover:text-emerald-700">
                        <Plus size={16} />
                      </button>
                      <button onClick={() => setAddingToTemplateId(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setAddingToTemplateId(template.id);
                        setExerciseForm({ exercise_name: '', target_sets: 3, target_reps: 10 });
                      }}
                      className="mt-3 w-full py-1.5 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors border border-dashed border-blue-200 flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> הוסף תרגיל
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="pt-8 mt-8 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="text-blue-500" />
              <h2 className="text-lg font-bold text-slate-800">היסטוריית אימונים (יומן ביצוע)</h2>
            </div>
            
            {traineeSessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">המתאמן טרם רשם אימונים שבוצעו במערכת.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {traineeSessions.map(session => {
                  const template = templates.find(t => t.id === session.template_id);
                  const sessionDate = new Date(session.performed_at).toLocaleDateString('he-IL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  // Group sets by exercise_id to merge them conceptually just for viewing
                  // However, for simplicity, we can just list them compactly
                  return (
                    <div key={session.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-200">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">
                            {template?.name || 'אימון שמור (תבנית נמחקה)'}
                          </h3>
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                            <CalendarDays size={14} />
                            {sessionDate}
                          </div>
                        </div>
                        {session.notes && (
                          <div className="bg-blue-50 text-blue-700 p-2 rounded-lg text-xs max-w-xs break-words">
                            <strong>הערת מתאמן:</strong> {session.notes}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {template && template.exercises.sort((a,b) => a.order_index - b.order_index).map(ex => {
                          const exerciseSets = session.sets.filter(s => s.exercise_id === ex.id).sort((a,b) => a.set_number - b.set_number);
                          if (exerciseSets.length === 0) return null; // skipped exercise

                          return (
                            <div key={ex.id} className="bg-white rounded-lg p-3 border border-slate-100 flex flex-col md:flex-row gap-3 md:items-center">
                              <span className="font-bold text-slate-700 min-w-[150px]">{ex.exercise_name}</span>
                              <div className="flex flex-wrap gap-2">
                                {exerciseSets.map(set => (
                                  <span key={set.id} className="bg-slate-50 px-2 py-1 rounded text-xs text-slate-600 font-mono border border-slate-200 shadow-sm">
                                    סט {set.set_number}: <strong className="text-slate-800">{set.weight_kg}kg</strong> × {set.reps_done}
                                  </span>
                                ))}
                              </div>
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 4: NUTRITION LOG                                      */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'nutrition_log' && (
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
          ) : !dayLog || (dayLog.completed_meals.length === 0 && (!dayLog.free_entries || dayLog.free_entries.length === 0)) ? (
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
                {dayLog.completed_meals.length > 0 ? (
                  <div className="space-y-2">
                    {dayLog.completed_meals.map(mealId => {
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
              </div>

              {/* Free Entries */}
              <div>
                <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">
                  <Plus className="text-orange-500" size={18} />
                  הזנה חופשית (חריגות)
                </h3>
                {dayLog.free_entries && dayLog.free_entries.length > 0 ? (
                  <div className="space-y-2">
                    {dayLog.free_entries.map(entry => (
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
      )}

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        targetUserId={currentTrainee.id}
        targetUserName={currentTrainee.full_name}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteUser}
        isDeleting={isDeleting}
      />

    </div>
  );
}
