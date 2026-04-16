import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Calculator, Flame, Loader2, AlertCircle, Edit2, Save, Trash2, Utensils, Dumbbell, Sparkles, Plus, KeyRound, Clock, CalendarDays, MessageCircle } from 'lucide-react';
import { useTraineeStore } from '../../stores/traineeStore';
import { useDietStore } from '../../stores/dietStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { ResetPasswordModal } from '../../components/ui/ResetPasswordModal';
import { GOAL_LABELS, ACTIVITY_LEVEL_LABELS, GENDER_LABELS } from '../../types';
import type { Gender, ActivityLevel, Goal, TraineeData } from '../../types';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros } from '../../lib/nutrition';

type Tab = 'overview' | 'diet' | 'workouts';

export function TraineeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { currentTrainee, fetchTraineeById, updateTraineeData, deleteTrainee, isLoading: isTraineeLoading, error: traineeError } = useTraineeStore();
  const { meals, fetchDiet, generateDiet, isLoading: isDietLoading, error: dietError } = useDietStore();
  const { templates, fetchTemplates, sessions, fetchHistory, error: workoutError } = useWorkoutStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TraineeData>>({});
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTraineeById(id);
      fetchDiet(id);
      fetchTemplates();
      fetchHistory();
    }
  }, [id, fetchTraineeById, fetchDiet, fetchTemplates, fetchHistory]);

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

  const handleDelete = async () => {
    if (!id) return;
    const isConfirmed = window.confirm(
      'האם אתה בטוח שברצונך למחוק מתאמן זה? פעולה זו תמחק גם את כל נתוני התזונה, היסטוריית האימונים, והפרופיל שלו לצמיתות.'
    );
    if (isConfirmed) {
      try {
        await deleteTrainee(id);
        navigate('/trainer');
      } catch (err) {
        console.error('Failed to delete', err);
      }
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
              onClick={handleDelete}
              disabled={isTraineeLoading}
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
      <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit mx-auto md:mx-0">
        <button
          onClick={() => { setActiveTab('overview'); setIsEditing(false); }}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'overview' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calculator size={18} />
          נתונים
        </button>
        <button
          onClick={() => { setActiveTab('diet'); setIsEditing(false); }}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'diet' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Utensils size={18} />
          תזונה
        </button>
        <button
          onClick={() => { setActiveTab('workouts'); setIsEditing(false); }}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'workouts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Dumbbell size={18} />
          אימונים
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
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">רמת פעילות</label>
                      <select name="activity_level" value={editForm.activity_level} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm">
                        {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map(lvl => (
                          <option key={lvl} value={lvl}>{ACTIVITY_LEVEL_LABELS[lvl]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">מטרה תזונתית</label>
                      <select name="goal" value={editForm.goal} onChange={handleChange} className="w-full bg-purple-50 border border-purple-200 text-purple-900 font-bold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-400">
                        {(Object.keys(GOAL_LABELS) as Goal[]).map(g => (
                          <option key={g} value={g}>{GOAL_LABELS[g]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

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
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">רמת פעילות</p>
                    <p className="font-bold text-slate-800">{ACTIVITY_LEVEL_LABELS[data.activity_level]}</p>
                  </div>
                  <div className="col-span-2 bg-purple-50 p-3 rounded-xl border border-purple-100 mt-2">
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
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
              <Flame className="text-emerald-400" />
              <h2 className="text-lg font-bold">יעדי תזונה (יומי)</h2>
            </div>

            {data ? (
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
            <button
              onClick={handleGenerateDiet}
              disabled={isDietLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 whitespace-nowrap"
            >
              {isDietLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              הפקת תפריט תזונה
            </button>
          </div>

          {meals.length === 0 ? (
            <div className="text-center py-12">
              <Utensils size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">עדיין לא הופק תפריט תזונה למתאמן זה.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meals.sort((a, b) => a.meal_index - b.meal_index).map((meal) => (
                <div key={meal.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-800">{meal.meal_name}</h3>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded text-purple-600 border border-slate-200">
                      ~{meal.target_calories} קק״ל
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-blue-600 mb-1 border-b border-blue-100 pb-1">פחמימות (כ-{meal.target_carbs}g)</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {meal.carb_options.map(opt => <li key={opt.food_id}>• {opt.grams}g - {opt.food_name}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-600 mb-1 border-b border-emerald-100 pb-1">חלבונים (כ-{meal.target_protein}g)</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {meal.protein_options.map(opt => <li key={opt.food_id}>• {opt.grams}g - {opt.food_name}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-600 mb-1 border-b border-amber-100 pb-1">שומנים (כ-{meal.target_fat}g)</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {meal.fat_options.map(opt => <li key={opt.food_id}>• {opt.grams}g - {opt.food_name}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
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
                  <h3 className="font-bold text-slate-800 mb-3">{template.name}</h3>
                  <div className="space-y-2">
                    {template.exercises.sort((a,b) => a.order_index - b.order_index).map(ex => (
                      <div key={ex.id} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100">
                        <span className="font-medium text-slate-700">{ex.exercise_name}</span>
                        <span className="text-xs text-slate-500 font-mono">{ex.target_sets} × {ex.target_reps}</span>
                      </div>
                    ))}
                  </div>
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

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        targetUserId={currentTrainee.id}
        targetUserName={currentTrainee.full_name}
      />

    </div>
  );
}
