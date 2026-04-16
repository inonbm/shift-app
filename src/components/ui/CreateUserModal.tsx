import { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UserRole, Profile } from '../../types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainers: Profile[];
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose, trainers, onSuccess }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('trainee');
  const [trainerId, setTrainerId] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('trainee');
      setTrainerId('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('נא למלא את כל שדות החובה.');
      return;
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    if (role === 'trainee' && !trainerId) {
      setError('חובה לבחור במאמן עבור מתאמן חדש.');
      return;
    }

    setIsLoading(true);

    try {
      // Create user purely via Edge function using Service Role to prevent session drop
      const { data, error: functionError } = await supabase.functions.invoke('admin-create-user', {
        body: { 
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
          trainer_id: trainerId || null
        }
      });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      console.error('User creation failed:', err);
      setError(err?.message || 'שגיאה ביצירת המשתמש. אנא מולטי ודא שהאימייל לא תפוס.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <UserPlus size={20} className="text-purple-600" />
            הוספת משתמש חדש
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">המשתמש נוצר בהצלחה!</h3>
              <p className="text-slate-500 text-sm mb-6">
                {fullName} התווסף למערכת כ-{role === 'admin' ? 'מנהל' : role === 'trainer' ? 'מאמן' : 'מתאמן'}.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-all"
              >
                סגור
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-100">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">שם מלא</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="הזן שם מלא"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">אימייל התחברות</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-left font-mono"
                    dir="ltr"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">סיסמה זמנית</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-left font-mono"
                    dir="ltr"
                    minLength={6}
                    placeholder="לפחות 6 תווים"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">תפקיד (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value as UserRole);
                      if (e.target.value !== 'trainee') setTrainerId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="trainee">מתאמן (Trainee)</option>
                    <option value="trainer">מאמן (Trainer)</option>
                    <option value="admin">מנהל ראשי (Admin)</option>
                  </select>
                </div>

                {role === 'trainee' && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <label className="block text-sm font-semibold text-purple-900 mb-1">בחירת מאמן מלווה</label>
                    <select
                      required
                      value={trainerId}
                      onChange={(e) => setTrainerId(e.target.value)}
                      className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- בחר מאמן מרשימה --</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl font-bold transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                    צור משתמש
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
