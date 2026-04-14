import { X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface RecipeModalProps {
  isOpen: boolean;
  isLoading: boolean;
  recipeMarkdown: string | null;
  error: string | null;
  onClose: () => void;
}

export function RecipeModal({ isOpen, isLoading, recipeMarkdown, error, onClose }: RecipeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      
      {/* Modal Container */}
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-l from-purple-50 to-white">
          <div className="flex items-center gap-2 text-purple-700">
            <Sparkles size={24} className="text-purple-500" />
            <h2 className="text-xl font-bold">המתכון האישי שלך</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 font-sans">
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-400 rounded-full blur animate-pulse" />
                <div className="relative bg-white p-4 rounded-full border border-purple-100">
                  <Sparkles size={32} className="text-purple-600 animate-bounce" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-800">השף הווירטואלי חושב...</h3>
                <p className="text-sm text-slate-500">מרכיב מתכון אידיאלי מהמצרכים שבחרת</p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 flex flex-col items-center text-center">
              <div className="bg-red-100 p-3 rounded-full mb-3">
                <X size={24} className="text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-1">אופס, משהו השתבש</h3>
              <p className="text-sm text-red-600/80 mb-4">{error}</p>
              <button 
                onClick={onClose}
                className="bg-red-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-red-700 transition"
              >
                סגור ונסה שוב
              </button>
            </div>
          )}

          {recipeMarkdown && !isLoading && !error && (
            <div className="prose prose-purple prose-sm md:prose-base max-w-none text-slate-700 focus:outline-none">
              <ReactMarkdown>
                {recipeMarkdown}
              </ReactMarkdown>
            </div>
          )}

        </div>

        {/* Footer */}
        {!isLoading && !error && recipeMarkdown && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
            <button 
              onClick={onClose}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all w-full sm:w-auto"
            >
              הבנתי, תודה!
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}
