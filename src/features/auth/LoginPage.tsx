import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  const { signIn, isLoading, error, clearError, user, profile } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      navigate(profile.role === 'trainer' ? '/trainer' : '/diet', { replace: true });
    }
  }, [user, profile, navigate]);

  // Clear global auth error when component mounts or unmounts
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setFormError('נא למלא אימייל וסיסמה.');
      return;
    }

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      console.error('Login failed:', err);
      // The authStore handles setting the global error state which will be displayed in the UI
    }
  };

  const displayError = formError || error;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col items-center justify-center p-4">
      {/* SHIFT Logo & Branding */}
      <div className="mb-8 text-center flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Activity className="text-emerald-500" size={40} strokeWidth={2.5} />
          <h1 className="text-5xl md:text-6xl font-extrabold text-[#4A235A] tracking-wider">SHIFT</h1>
        </div>
        <p className="text-purple-800/70 text-base md:text-lg font-medium tracking-wide">שינוי אמיתי מבפנים החוצה</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">התחברות למערכת</h2>

        {displayError && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium leading-relaxed">
              {displayError === 'Invalid login credentials' 
                ? 'פרטי ההתחברות שגויים. אנא נסה שוב.'
                : displayError}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">אימייל</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Mail className="text-slate-400" size={20} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="הזן את האימייל שלך"
                dir="ltr"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">סיסמה</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Lock className="text-slate-400" size={20} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="הזן סיסמה"
                dir="ltr"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-l from-purple-700 to-purple-500 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                מתחבר...
              </>
            ) : (
              'כניסה לחשבון'
            )}
          </button>
        </form>
      </div>

      {/* Footer info */}
      <div className="mt-8 text-center text-sm text-slate-400">
        <p>מערכת הניהול והתזונה של מתאמני SHIFT.</p>
        <p className="mt-1">אם עדיין אין לך חשבון, פנה למאמן שלך.</p>
      </div>
    </div>
  );
}
