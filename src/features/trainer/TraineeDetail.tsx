import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Calculator, Flame, Loader2, AlertCircle, Edit2, Save } from 'lucide-react';
import { useTraineeStore } from '../../stores/traineeStore';
import { GOAL_LABELS, ACTIVITY_LEVEL_LABELS, GENDER_LABELS } from '../../types';
import type { Gender, ActivityLevel, Goal, TraineeData } from '../../types';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros } from '../../lib/nutrition';

export function TraineeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrainee, fetchTraineeById, updateTraineeData, isLoading, error } = useTraineeStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TraineeData>>({});

  useEffect(() => {
    if (id) {
      fetchTraineeById(id);
    }
  }, [id, fetchTraineeById]);

  if (isLoading && !currentTrainee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-purple-600">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-medium">טוען פרופיל מתאמן...</p>
      </div>
    );
  }

  if (!currentTrainee) return null;

  const data = currentTrainee.trainee_data;

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

    // Auto-Recalculate all nutrition parameters
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
      // Re-fetch to get newest data directly mapping state
      await fetchTraineeById(id);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update', err);
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
        {!isEditing && data && (
          <button 
            onClick={handleEditClick}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors text-sm font-bold"
          >
            <Edit2 size={16} /> ערוך נתונים
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Grid */}
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
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-sm transition-colors"
                  >
                    ביטול
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    שמור וחשב מחדש
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
      
    </div>
  );
}
