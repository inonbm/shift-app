import { useState } from 'react';
import { X, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
}

export function ResetPasswordModal({ isOpen, onClose, targetUserId, targetUserName }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }

    if (newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('admin-reset-password', {
        body: { targetUserId, newPassword }
      });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setError(err?.message || 'שגיאה באיפוס הסיסמה. אנא ודא הרשאות ושגיאות רשת.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <KeyRound size={20} className="text-amber-500" />
            איפוס סיסמה בעצימות גבוהה
          </div>
          <button 
            onClick={handleClose}
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
              <h3 className="text-xl font-bold text-slate-800 mb-2">הסיסמה שונתה בהצלחה!</h3>
              <p className="text-slate-500 text-sm mb-6">
                הסיסמה של {targetUserName} עודכנה במערכת. באפשרותו להתחבר כעת עם הסיסמה החדשה.
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-all"
              >
                סגור
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-6">
                פעולה זו תדרוס את הסיסמה הנוכחית של <strong className="text-slate-800">{targetUserName}</strong> ותקבע סיסמה חדשה להתחברות.
              </p>

              {error && (
                <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-100">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">סיסמה זמנית חדשה</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-left font-mono"
                    dir="ltr"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">אימות סיסמה</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-left font-mono"
                    dir="ltr"
                    minLength={6}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl font-bold transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-amber-500/30 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                    אפס סיסמה
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
