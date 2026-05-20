import { Calculator, CheckCheck, Flame, Loader2, Save, SlidersHorizontal, X } from 'lucide-react';
import { ACTIVITY_LEVEL_LABELS, GENDER_LABELS, GOAL_LABELS } from '../../../types';
import type { ActivityLevel, Gender, Goal, TraineeData } from '../../../types';
import type { CheckboxChangeHandler, InputOrSelectChangeHandler, SetState } from './types';

interface OverviewTabProps {
  data: TraineeData | null | undefined;
  isEditing: boolean;
  editForm: Partial<TraineeData>;
  setEditForm: SetState<Partial<TraineeData>>;
  isTraineeLoading: boolean;
  isEditingTargets: boolean;
  isSavingTargets: boolean;
  targetsForm: { goal_calories: number; protein_grams: number; carbs_grams: number; fat_grams: number };
  setTargetsForm: SetState<{ goal_calories: number; protein_grams: number; carbs_grams: number; fat_grams: number }>;
  setIsEditingTargets: (value: boolean) => void;
  handleChange: InputOrSelectChangeHandler;
  handleCheckboxChange: CheckboxChangeHandler;
  handleCancelEdit: () => void;
  handleSave: () => void;
  handleEditTargetsClick: () => void;
  handleSaveTargets: () => void;
}

export function OverviewTab({
  data,
  isEditing,
  editForm,
  setEditForm,
  isTraineeLoading,
  isEditingTargets,
  isSavingTargets,
  targetsForm,
  setTargetsForm,
  setIsEditingTargets,
  handleChange,
  handleCheckboxChange,
  handleCancelEdit,
  handleSave,
  handleEditTargetsClick,
  handleSaveTargets,
}: OverviewTabProps) {
  return (
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">גיל</label>
                <input type="number" name="age" value={editForm.age || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">מגדר</label>
                <select name="gender" value={editForm.gender} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm">
                  {(Object.keys(GENDER_LABELS) as Gender[]).map(g => (
                    <option key={g} value={g}>{GENDER_LABELS[g]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">משקל (ק״ג)</label>
                <input type="number" step="0.1" name="weight_kg" value={editForm.weight_kg || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">גובה (ס״מ)</label>
                <input type="number" name="height_cm" value={editForm.height_cm || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">רמת פעילות</label>
              <select name="activity_level" value={editForm.activity_level} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-sm">
                {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map(lvl => (
                  <option key={lvl} value={lvl}>{ACTIVITY_LEVEL_LABELS[lvl]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">מטרה תזונתית</label>
              <select name="goal" value={editForm.goal} onChange={handleChange} className="w-full bg-purple-50 border border-purple-200 text-purple-900 font-bold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-purple-400">
                {(Object.keys(GOAL_LABELS) as Goal[]).map(g => (
                  <option key={g} value={g}>{GOAL_LABELS[g]}</option>
                ))}
              </select>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">יעד חלבון (גרם לק״ג)</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {[1.8, 2.0, 2.2].map(factor => (
                  <button
                    key={factor}
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, protein_factor: factor }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      (editForm.protein_factor || 2.0) === factor
                        ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {factor}g
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Busy Lifestyle toggle */}
          <label dir="ltr" className="flex w-full h-auto items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 cursor-pointer transition-colors hover:bg-amber-100">
            <input
              type="checkbox"
              name="is_busy_lifestyle"
              checked={(editForm as any).is_busy_lifestyle ?? false}
              onChange={handleCheckboxChange}
              className="h-4 w-4 flex-shrink-0 rounded accent-amber-500 cursor-pointer"
            />
            <div dir="rtl" className="min-w-0 flex-1 text-right">
              <p className="text-xs font-bold leading-snug text-amber-800 whitespace-normal break-words">מתאמן עסוק / סטודנט ⏱️</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-600 whitespace-normal break-words">מעדיף מאכלים מהירים וללא בישול בעת יצירת תפריט</p>
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate-500">גיל</p>
              <p className="font-bold text-slate-800">{data.age} שנים</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500">מגדר</p>
              <p className="font-bold text-slate-800">{GENDER_LABELS[data.gender]}</p>
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate-500">גובה</p>
              <p className="font-bold text-slate-800">{data.height_cm} ס״מ</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500">משקל</p>
              <p className="font-bold text-slate-800">{data.weight_kg} ק״ג</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500">רמת פעילות</p>
            <p className="font-bold text-slate-800">{ACTIVITY_LEVEL_LABELS[data.activity_level]}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 mt-2">
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
  );
}
