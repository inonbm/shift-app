import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ArrowRight, ArrowLeft, Loader2, Save, AlertCircle, UserPlus, Activity, CheckCircle2, MessageCircle } from 'lucide-react';
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

export function cleanPhoneNumber(phone: string): string {
  // Strip everything except numbers
  const cleaned = phone.replace(/\D/g, '');
  return cleaned;
}

export function TraineeForm() {
  const navigate = useNavigate();
  const { createTrainee, isLoading, error, clearError } = useTraineeStore();

  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<CreateTraineeInput>({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
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

  const handleNextStep = () => {
    // Validate step 1 fields before proceeding
    if (!formData.full_name.trim()) return alert('נא להזין שם מלא');
    if (!formData.email.trim()) return alert('נא להזין כתובת דוא״ל');
    if (!formData.password || formData.password.length < 6) return alert('סיסמה חייבת להיות לפחות 6 תווים');
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await createTrainee(formData);
      setStep(3); // Go to success screen
    } catch (err) {
      console.error('Submission failed', err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `היי ${formData.full_name},
הפרופיל שלך באפליקציית SHIFT מוכן! 

כניסה לאפליקציה: ${window.location.origin}/login
האימייל שלך: ${formData.email}
הסיסמה שלך: ${formData.password}`;
    
    const encodedText = encodeURIComponent(text);
    if (formData.phone_number) {
      const cleanPhone = cleanPhoneNumber(formData.phone_number);
      window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }
  };

  // ─── Step Progress Indicator ───────────────────
  const StepIndicator = () => (
    <div className="flex items-center gap-3 justify-center mb-6">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
        ${step === 1 ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
      >
        {step > 1 ? '✓' : '1'}
        <span>פרטי חשבון</span>
      </div>
      <div className={`w-8 h-0.5 rounded-full transition-colors ${(step >= 2) ? 'bg-emerald-400' : 'bg-slate-200'}`} />
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
        ${step === 2 ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25' : 
          step > 2 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
      >
        {step > 2 ? '✓' : '2'}
        <span>נתונים גופניים</span>
      </div>
      <div className={`w-8 h-0.5 rounded-full transition-colors ${step === 3 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
        ${step === 3 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
      >
        3
        <span>סיום</span>
      </div>
    </div>
  );

  // ─── Live Calculator Card ─────────────────────
  const LiveCalculatorCard = () => (
    <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl">
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
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <button 
          onClick={() => step === 1 ? navigate('/trainer') : setStep(1)}
          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
        >
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">הוספת מתאמן חדש</h1>
          <p className="text-sm text-slate-500">
            {step === 1 ? 'שלב 1: פרטי רישום והתחברות' : 
             step === 2 ? 'שלב 2: נתונים פיזיולוגיים ומטרות' : 'המתאמן נוצר בהצלחה!'}
          </p>
        </div>
      </div>

      <StepIndicator />

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 1: Account Details                     */}
      {/* ═══════════════════════════════════════════ */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                  <UserPlus size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">פרטי משתמש (התחברות)</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                  <input required type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="לדוגמה: ישראל ישראלי" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">דוא״ל</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} dir="ltr" placeholder="trainee@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-left text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה זמנית</label>
                  <input required type="text" name="password" minLength={6} value={formData.password} onChange={handleChange} dir="ltr" placeholder="לפחות 6 תווים" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-left text-lg" />
                  <p className="text-xs text-slate-500 mt-1.5">שלח סיסמה זו למתאמן כדי שיוכל להתחבר בפעם הראשונה.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">מספר טלפון (אופציונלי - לשליחת פרטים לוואטסאפ)</label>
                  <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} dir="ltr" placeholder="972501234567" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none text-left text-lg font-mono" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-purple-500/30 transform active:scale-[0.98]"
              >
                הבא: נתונים פיזיים
                <ArrowLeft size={20} />
              </button>
            </div>
          </div>
          
          {/* Preview card on step 1 */}
          <div className="md:col-span-5">
            <div className="bg-slate-100 border-2 border-dashed border-slate-200 p-6 rounded-2xl text-center space-y-3">
              <Activity size={40} className="text-slate-300 mx-auto" />
              <p className="text-sm text-slate-400 font-medium">החישובים יוצגו בשלב הבא לאחר הזנת הנתונים הפיזיים.</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 2: Physical Data & Goals               */}
      {/* ═══════════════════════════════════════════ */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">

          <div className="md:col-span-7 space-y-6">

            {/* Quick Account Summary (read-only) */}
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center gap-3">
              <div className="bg-purple-200 p-2 rounded-full text-purple-700">
                <UserPlus size={16} />
              </div>
              <div className="flex-1 text-sm">
                <span className="font-bold text-purple-800">{formData.full_name}</span>
                <span className="text-purple-500 mx-2">|</span>
                <span className="text-purple-600 font-mono">{formData.email}</span>
              </div>
              <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-purple-600 hover:underline">שנה</button>
            </div>

            {/* Physical Fields */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <Activity size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">נתונים פיזיולוגיים ומטרות</h2>
              </div>
              
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

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowRight size={20} />
                חזור לשלב 1
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/30 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> שומר מתאמן...</>
                ) : (
                  <><Save size={20} /> צור מתאמן ושמור נתונים</>
                )}
              </button>
            </div>
          </div>

          {/* Live Calculation Column — visible in Step 2 */}
          <div className="md:col-span-5 relative">
            <div className="sticky top-24">
              <LiveCalculatorCard />
            </div>
          </div>

        </form>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 3: Success & WhatsApp Share            */}
      {/* ═══════════════════════════════════════════ */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 text-center max-w-lg mx-auto mt-8 space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={32} />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-slate-800">המתאמן נוצר בהצלחה!</h2>
            <p className="text-slate-500 mt-2">
              הפרופיל של {formData.full_name} נשמר במערכת ומוכן מחושב. כעת יש להעביר אליו את פרטי ההתחברות.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl text-right border border-slate-100 text-sm font-mono text-slate-700">
            <p><strong>דוא״ל:</strong> {formData.email}</p>
            <p><strong>סיסמה:</strong> {formData.password}</p>
          </div>

          <button
            onClick={handleWhatsAppShare}
            className="w-full bg-[#25D366] hover:bg-[#1ebd59] text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-[#25D366]/30 transform active:scale-[0.98]"
          >
            <MessageCircle size={20} />
            שתף פרטים ב-WhatsApp
          </button>
          
          <button
            onClick={() => navigate('/trainer')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-colors"
          >
            חזור ללוח הבקרה
          </button>
        </div>
      )}
    </div>
  );
}
