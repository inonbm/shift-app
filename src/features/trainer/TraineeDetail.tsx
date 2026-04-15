import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Calculator, Flame, Loader2, AlertCircle } from 'lucide-react';
import { useTraineeStore } from '../../stores/traineeStore';
import { GOAL_LABELS, ACTIVITY_LEVEL_LABELS, GENDER_LABELS } from '../../types';

export function TraineeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrainee, fetchTraineeById, isLoading, error } = useTraineeStore();

  useEffect(() => {
    if (id) {
      fetchTraineeById(id);
    }
  }, [id, fetchTraineeById]);

  if (isLoading || !currentTrainee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-purple-600">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-medium">טוען פרופיל מתאמן...</p>
      </div>
    );
  }

  const data = currentTrainee.trainee_data;

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
        <div>
          <h1 className="text-xl font-bold text-slate-800">{currentTrainee.full_name}</h1>
          <p className="text-sm text-slate-500">{currentTrainee.email}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Physical Stats Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calculator className="text-purple-500" />
            <h2 className="text-lg font-bold text-slate-800">נתונים פיזיים</h2>
          </div>
          
          {data ? (
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
              <div className="col-span-2 bg-purple-50 p-3 rounded-xl border border-purple-100">
                <p className="text-sm font-medium text-purple-600 mb-1">מטרה תזונתית</p>
                <p className="font-bold text-purple-900 text-lg">{GOAL_LABELS[data.goal]}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">אין נתונים פיזיים זמינים.</p>
          )}
        </div>

        {/* Nutrition Target Card */}
        <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-700">
            <Flame className="text-emerald-400" />
            <h2 className="text-lg font-bold">יעדי תזונה (יומי)</h2>
          </div>

          {data ? (
            <div className="space-y-4">
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
            </div>
          ) : (
            <p className="text-sm text-slate-400">יש להזין נתונים פיזיים כדי לראות יעדי תזונה.</p>
          )}
        </div>
      </div>
      
    </div>
  );
}
