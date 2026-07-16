import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, ChevronRight, Edit2, KeyRound, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { useTraineeStore } from '../../stores/traineeStore';
import { useDietStore } from '../../stores/dietStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useFoodStore } from '../../stores/foodStore';
import { useTrackingStore } from '../../stores/trackingStore';
import { supabase } from '../../lib/supabase';
import { ResetPasswordModal } from '../../components/ui/ResetPasswordModal';
import { DeleteUserModal } from '../../components/ui/DeleteUserModal';
import type { ActivityLevel, Food, Gender, Goal, MealFoodOption, TraineeData, DailyTracking } from '../../types';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros } from '../../lib/nutrition';
import { recalculateDietTotals } from '../../lib/dietGenerator';
import { DietTab } from './trainee-detail/DietTab';
import { NutritionLogTab } from './trainee-detail/NutritionLogTab';
import { OrphanTraineeNotice } from './trainee-detail/OrphanTraineeNotice';
import { OverviewTab } from './trainee-detail/OverviewTab';
import { TraineeDetailTabs } from './trainee-detail/TraineeDetailTabs';
import { WorkoutsTab } from './trainee-detail/WorkoutsTab';
import type { AddForms, ExerciseForm, FoodSearch, MealEdit, Tab } from './trainee-detail/types';

export function TraineeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { currentTrainee, fetchTraineeById, updateTraineeData, updateCanDeleteSessions, isLoading: isTraineeLoading, error: traineeError } = useTraineeStore();
  const { meals, fetchDiet, generateDiet, isLoading: isDietLoading, error: dietError } = useDietStore();
  const { templates, fetchTemplates, sessions, fetchHistory, deleteTemplate, deleteSession, updateExercise, addExerciseToTemplate, deleteExercise, reorderExercises, error: workoutError } = useWorkoutStore();
  const { foods, fetchFoods } = useFoodStore();
  const { fetchTrackingForDate } = useTrackingStore();

  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? 'overview';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
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
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [menuEdits, setMenuEdits] = useState<Record<string, MealEdit>>({});
  // Per-meal, per-category: which food is selected in the dropdown and how many grams
  const [addForms, setAddForms] = useState<AddForms>({});
  const [foodSearch, setFoodSearch] = useState<FoodSearch>({});
  
  // --- Nutrition log state ---
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dayLog, setDayLog] = useState<DailyTracking | null>(null);
  const [isLogLoading, setIsLogLoading] = useState(false);

  // --- Workout editing state ---
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseForm, setExerciseForm] = useState<ExerciseForm>({ exercise_name: '', target_sets: 3, target_reps: 10 });
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
        num_meals: data.num_meals ?? 4,
        allow_multi_select: data.allow_multi_select ?? false,
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
    const macros = calculateMacros(editForm.weight_kg, Math.max(0, goalCalories), editForm.protein_factor || 2.0);

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

  /**
   * Auto-calculates the required grams for a newly selected food based on the
   * first item in the same category. The first item serves as the "reference":
   * we compute how many grams of the new food are needed to match the primary
   * macro contribution of the reference item.
   */
  const handleFoodSelect = (mealId: string, category: 'protein_options' | 'carb_options' | 'fat_options', foodId: string) => {
    if (!foodId) {
      // Cleared selection — reset form
      setAddForms(prev => ({
        ...prev,
        [mealId]: { ...prev[mealId], [category]: { foodId: '', grams: 100 } },
      }));
      return;
    }

    const selectedFood = foods.find(f => f.id === foodId);
    if (!selectedFood) {
      setAddForms(prev => ({
        ...prev,
        [mealId]: { ...prev[mealId], [category]: { foodId, grams: 100 } },
      }));
      return;
    }

    // Determine which primary macro key to match based on category
    const macroKeyMap = {
      protein_options: 'protein_g' as const,
      carb_options: 'carbs_g' as const,
      fat_options: 'fat_g' as const,
    };
    const perFoodKeyMap = {
      protein_options: 'protein_per_100g' as const,
      carb_options: 'carbs_per_100g' as const,
      fat_options: 'fats_per_100g' as const,
    };

    const edit = menuEdits[mealId];
    const items = edit?.[category] ?? [];
    const referenceItem = items[0];
    const macroKey = macroKeyMap[category];
    const perFoodKey = perFoodKeyMap[category];

    let calculatedGrams = selectedFood.serving_size || 100; // default fallback

    if (referenceItem && referenceItem[macroKey] > 0 && selectedFood[perFoodKey] > 0) {
      // Target: match the primary macro grams of the reference item
      const targetMacroGrams = referenceItem[macroKey];
      const servingRef = selectedFood.serving_size || 100;
      // macroPerUnit = selectedFood[perFoodKey] per servingRef
      // units needed = targetMacroGrams / (selectedFood[perFoodKey] / servingRef)
      const rawUnits = (targetMacroGrams * servingRef) / selectedFood[perFoodKey];
      // Round to nearest integer for clean UX
      calculatedGrams = Math.max(1, Math.round(rawUnits));
    }

    setAddForms(prev => ({
      ...prev,
      [mealId]: {
        ...prev[mealId],
        [category]: { foodId, grams: calculatedGrams },
      },
    }));
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

  const handleSetPrimary = (mealId: string, category: 'protein_options' | 'carb_options' | 'fat_options', foodId: string) => {
    setMenuEdits(prev => {
      const meal = prev[mealId];
      const updatedOptions = meal[category].map(opt => ({
        ...opt,
        is_primary: opt.food_id === foodId ? !opt.is_primary : false,
      }));
      return {
        ...prev,
        [mealId]: { ...meal, [category]: updatedOptions },
      };
    });
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
      // Re-run totals calculation on the live menuEdits state right before saving.
      // This guarantees the DB receives fresh target_calories/protein/carbs/fat
      // values even if React batched any intermediate state updates.
      const freshEdits = { ...menuEdits };
      Object.keys(freshEdits).forEach(mealId => {
        const meal = freshEdits[mealId];
        const [recalculated] = recalculateDietTotals([meal]);
        freshEdits[mealId] = recalculated;
      });

      const updates = Object.entries(freshEdits).map(([mealId, fields]) => {
        return supabase
          .from('generated_meals')
          .update({
            meal_name: fields.meal_name,
            protein_options: fields.protein_options,
            carb_options: fields.carb_options,
            fat_options: fields.fat_options,
            target_calories: fields.target_calories ?? 0,
            target_protein: fields.target_protein ?? 0,
            target_carbs: fields.target_carbs ?? 0,
            target_fat: fields.target_fat ?? 0,
          })
          .eq('id', mealId);
      });
      await Promise.all(updates);

      // Optimistically update local state with the freshly-computed edits so
      // the UI stays in sync while the DB fetch completes.
      setMenuEdits(freshEdits);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => navigate('/trainer')}
            className="p-2 -mr-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors flex-shrink-0"
          >
            <ChevronRight size={24} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 truncate">{currentTrainee.full_name}</h1>
            <p className="text-sm text-slate-500 truncate">{currentTrainee.email}</p>
          </div>
        </div>
        {!isEditing && activeTab === 'overview' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {data && (
              <>
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
              </>
            )}
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

      {!data ? (
        <OrphanTraineeNotice />
      ) : (
        <>
          <TraineeDetailTabs
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setIsEditing(false);
            }}
          />

          {activeTab === 'overview' && (
            <OverviewTab
              data={data}
              isEditing={isEditing}
              editForm={editForm}
              setEditForm={setEditForm}
              isTraineeLoading={isTraineeLoading}
              isEditingTargets={isEditingTargets}
              isSavingTargets={isSavingTargets}
              targetsForm={targetsForm}
              setTargetsForm={setTargetsForm}
              setIsEditingTargets={setIsEditingTargets}
              handleChange={handleChange}
              handleCheckboxChange={handleCheckboxChange}
              handleCancelEdit={handleCancelEdit}
              handleSave={handleSave}
              handleEditTargetsClick={handleEditTargetsClick}
              handleSaveTargets={handleSaveTargets}
            />
          )}

          {activeTab === 'diet' && (
            <DietTab
              meals={meals}
              foods={foods}
              isDietLoading={isDietLoading}
              isEditingMenu={isEditingMenu}
              isSavingMenu={isSavingMenu}
              menuEdits={menuEdits}
              addForms={addForms}
              foodSearch={foodSearch}
              setIsEditingMenu={setIsEditingMenu}
              setMenuEdits={setMenuEdits}
              setAddForms={setAddForms}
              setFoodSearch={setFoodSearch}
              handleEditMenuClick={handleEditMenuClick}
              handleSaveMenu={handleSaveMenu}
              handleGenerateDiet={handleGenerateDiet}
              handleUpdateItemAmount={handleUpdateItemAmount}
              handleRemoveItem={handleRemoveItem}
              handleAddItem={handleAddItem}
              handleFoodSelect={handleFoodSelect}
              handleSetPrimary={handleSetPrimary}
              getFoodsByCategory={getFoodsByCategory}
            />
          )}

          {activeTab === 'workouts' && (
            <WorkoutsTab
              traineeTemplates={traineeTemplates}
              traineeSessions={traineeSessions}
              templates={templates}
              editingExerciseId={editingExerciseId}
              exerciseForm={exerciseForm}
              addingToTemplateId={addingToTemplateId}
              canDeleteSessions={data?.can_delete_sessions ?? false}
              setEditingExerciseId={setEditingExerciseId}
              setExerciseForm={setExerciseForm}
              setAddingToTemplateId={setAddingToTemplateId}
              onCreateWorkout={() => navigate(`/trainer/workouts/new?traineeId=${id}`)}
              deleteTemplate={deleteTemplate}
              deleteSession={deleteSession}
              updateExercise={updateExercise}
              addExerciseToTemplate={addExerciseToTemplate}
              deleteExercise={deleteExercise}
              reorderExercises={reorderExercises}
              onToggleCanDelete={async (value) => {
                if (!id) return;
                await updateCanDeleteSessions(id, value);
                // Re-fetch so currentTrainee.trainee_data stays in sync
                await fetchTraineeById(id);
              }}
            />
          )}

          {activeTab === 'nutrition_log' && (
            <NutritionLogTab
              logDate={logDate}
              setLogDate={setLogDate}
              isLogLoading={isLogLoading}
              dayLog={dayLog}
              meals={meals}
            />
          )}
        </>
      )}

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
