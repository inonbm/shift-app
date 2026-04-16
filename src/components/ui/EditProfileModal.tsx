import { useState, useEffect } from 'react';
import { X, UserCog, Loader2, AlertCircle, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UserRole } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentName: string;
  currentPhone: string;
  currentRole: UserRole;
  onSuccess: () => void;
}

export function EditProfileModal({ isOpen, onClose, userId, currentName, currentPhone, currentRole, onSuccess }: EditProfileModalProps) {
  const [fullName, setFullName] = useState(currentName);
  const [phoneNumber, setPhoneNumber] = useState(currentPhone);
  const [role, setRole] = useState<UserRole>(currentRole);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(currentName);
      setPhoneNumber(currentPhone);
      setRole(currentRole);
      setError(null);
    }
  }, [isOpen, currentName, currentPhone, currentRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('נא להזין שם מלא.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          role: role,
          phone_number: phoneNumber.trim() || null
        })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setError(err?.message || 'שגיאה בעדכון הפרופיל.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <UserCog size={20} className="text-blue-500" />
            עריכת משתמש מערכת
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-500 mb-6">
            שינויים מהותיים בהרשאות עשויים לחשוף מידע רגיש. פעל בזהירות.
          </p>

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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">מספר טלפון</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-left font-mono"
                dir="ltr"
                placeholder="972501234567"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">הרשאת מערכת (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="trainee">מתאמן (Trainee)</option>
                <option value="trainer">מאמן (Trainer)</option>
                <option value="admin">מנהל ראשי (Admin)</option>
              </select>
            </div>

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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                שמור שינויים
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
