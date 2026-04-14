import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ArrowRight, Loader2, Save, AlertCircle } from 'lucide-react';
import { useTraineeStore } from '../../stores/traineeStore';
import { 
  calculateBMR, 
  calculateTDEE, 
  calculateTargetCalories, 
  calculateMacros 
} from '../../lib/nutrition';
import { 
  GENDER_LABELS, 
  ACTIVITY_LEVEL_LABELS, 
  GOAL_LABELS
} from '../../types';
import type { 
  Gender, 
  ActivityLevel, 
  Goal, 
  CreateTraineeInput
} from '../../types';

export function TraineeForm() {
  const navigate = useNavigate();
  const { createTrainee, isLoading, error, clearError } = useTraineeStore();

  const [formData, setFormData] = useState<CreateTraineeInput>({
    email: '',
    password: '',
    full_name: '',
    gender: 'male',
    age: 30,
    weight_kg: 70,
    height_cm: 175,
    activity_level: 'moderate',
    goal: 'maintenance'
  });

  // Calculate live nutrition values based on form state
  const liveNutrition = useMemo(() => {
    const bmr = calculateBMR(formData.gender, formData.weight_kg, formData.height_cm, formData.age);
    const tdee = calculateTDEE(bmr, formData.activity_level);
    const goalCalories = calculateTargetCalories(tdee, formData.goal);
    const macros = calculateMacros(formData.weight_kg, Math.max(0, goalCalories));
    
    return { bmr, tdee, goalCalories, macros };
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    clearError();
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await createTrainee(formData);
      // Wait for trigger and profile linkage to settle, then redirect
      setTimeout(() => navigate('/trainer'), 500);
    } catch (err) {
      console.error('Submission failed', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <button 
          onClick={() => navigate('/trainer')}
          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
        >
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">הוספת מתאמן חדש</h1>
          <p className="text-sm text-slate-500">הזן פרטי רישום ומדדים גופניים</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Input Fields Column */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">פרטי משתמש (התחברות)</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                <input required type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">דוא״ל</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} dir="ltr" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none text-left" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה זמנית</label>
                <input required type="text" name="password" minLength={6} value={formData.password} onChange={handleChange} dir="ltr" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none text-left" />
                <p className="text-xs text-slate-500 mt-1">שלח סיסמה זו למתאמן כדי שיוכל להתחבר.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">נתונים פיזיולוגיים ומטרות</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">מגדר</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 outline-none">
                  {(Object.keys(GENDER_LABELS) as Gender[]).map(g => (
                    <option key={g} value={g}>{GENDER_LABELS[g]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">גיל</label>
                <input required type="number" name="age" min={10} max={120} value={formData.age} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">משקל (ק״ג)</label>
                <input required type="number" name="weight_kg" step="0.1" min={30} max={300} value={formData.weight_kg} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">גובה (ס״מ)</label>
                <input required type="number" name="height_cm" min={100} max={250} value={formData.height_cm} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">רמת פעילות (יומיומית)</label>
                <select name="activity_level" value={formData.activity_level} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 outline-none">
                  {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map(lvl => (
                    <option key={lvl} value={lvl}>{ACTIVITY_LEVEL_LABELS[lvl]}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="block text-sm font-bold text-purple-800 mb-1">מטרה תזונתית</label>
                <select name="goal" value={formData.goal} onChange={handleChange} className="w-full bg-purple-50 border border-purple-200 text-purple-900 font-medium rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-purple-500">
                  {(Object.keys(GOAL_LABELS) as Goal[]).map(g => (
                    <option key={g} value={g}>{GOAL_LABELS[g]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Calculation Column */}
        <div className="md:col-span-5 relative">
          <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl sticky top-24">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
              <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                <Calculator size={24} />
              </div>
              <h2 className="text-xl font-bold">חישובים בזמן אמת</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm text-slate-400 mb-1">
                  <span>BMR (חילוף חומרים בסיסי)</span>
                  <span className="font-mono text-slate-200">{Math.round(liveNutrition.bmr).toLocaleString()} קק״ל</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400 mb-1">
                  <span>TDEE (הוצאה אנרגטית יומית)</span>
                  <span className="font-mono text-slate-200">{Math.round(liveNutrition.tdee).toLocaleString()} קק״ל</span>
                </div>
              </div>

              <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600">
                <div className="text-sm text-emerald-300 font-medium mb-1">יעד קלורי יומי (הקצבה)</div>
                <div className="text-3xl font-bold text-white flex items-end gap-2">
                  {Math.round(liveNutrition.goalCalories).toLocaleString()}
                  <span className="text-lg text-slate-400 font-normal mb-1">קק״ל</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-slate-300 border-b border-slate-700 pb-1">יעדי מאקרו</h3>
                
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-300">חלבון <span className="text-xs text-slate-500">(2.2g/kg)</span></span>
                  <span className="font-bold text-emerald-400">{liveNutrition.macros.proteinGrams}g</span>
                </div>
                
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-300">שומן <span className="text-xs text-slate-500">(1g/kg)</span></span>
                  <span className="font-bold text-purple-400">{liveNutrition.macros.fatGrams}g</span>
                </div>
                
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-300">פחמימה <span className="text-xs text-slate-500">(השלמה)</span></span>
                  <span className="font-bold text-blue-400">{liveNutrition.macros.carbsGrams}g</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 size={20} className="animate-spin" /> שומר מתאמן...</>
              ) : (
                <><Save size={20} /> צור מתאמן ושמור נתונים</>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
