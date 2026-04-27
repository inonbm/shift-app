import { Loader2, AlertTriangle, X } from 'lucide-react';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteUserModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-red-100 bg-red-50">
          <div className="flex items-center gap-2 text-red-800 font-bold">
            <AlertTriangle size={20} className="text-red-500" />
            מחיקת משתמש
          </div>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 hover:bg-red-100 p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-6 leading-relaxed">
            האם אתה בטוח שברצונך למחוק משתמש זה לצמיתות? פעולה זו תמחק את הפרופיל שלו ואת כל הנתונים הקשורים אליו. פעולה זו אינה הפיכה.
          </p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  מוחק...
                </>
              ) : (
                'מחק משתמש'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
