import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Flame, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { useTraineeStore } from '../../stores/traineeStore';
import { GOAL_LABELS } from '../../types';
import { calculateBMR, calculateTDEE, calculateTargetCalories } from '../../lib/nutrition';

export function TrainerDashboard() {
  const { trainees, isLoading, error, fetchTrainees } = useTraineeStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrainees();
  }, [fetchTrainees]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">המתאמנים שלי</h1>
            <p className="text-sm text-slate-500">ניהול שוטף ומעקב תזונה</p>
          </div>
        </div>
        
        <button
          onClick={() => navigate('/trainer/trainees/new')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          <span>הוסף מתאמן חדש</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Trainees List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-purple-500">
          <Loader2 size={40} className="animate-spin mb-4" />
          <p>טוען נתונים...</p>
        </div>
      ) : trainees.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">אין מתאמנים פעילים</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            עדיין לא הוספת מתאמנים למערכת. לחץ על הכפתור למעלה כדי להתחיל.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trainees.map((trainee) => {
            const data = trainee.trainee_data;
            const goalLabel = data ? GOAL_LABELS[data.goal] : 'לא הוגדר';
            
            let calories = '---';
            if (data?.goal_calories) {
              calories = Math.round(data.goal_calories).toLocaleString();
            } else if (data) {
              // Fallback calculation for older records
              const bmr = calculateBMR(data.gender, data.weight_kg, data.height_cm, data.age);
              const tdee = calculateTDEE(bmr, data.activity_level);
              calories = Math.round(calculateTargetCalories(tdee, data.goal)).toLocaleString();
            }

            return (
              <Link 
                key={trainee.id}
                to={`/trainer/trainees/${trainee.id}`}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-300 hover:shadow-md transition-all group block"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                      {trainee.full_name}
                    </h3>
                    <p className="text-sm text-slate-500">{trainee.email}</p>
                  </div>
                  <div className="text-slate-400 group-hover:text-purple-500 transition-colors bg-slate-50 p-2 rounded-full">
                    <ChevronLeft size={20} />
                  </div>
                </div>

                <div className="flex gap-3 mt-4 pt-4 border-t border-slate-50">
                  <div className="flex-1 bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">מטרה</p>
                    <p className="font-semibold text-slate-700">{goalLabel}</p>
                  </div>
                  <div className="flex-1 bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-500 mb-1 flex items-center gap-1">
                      <Flame size={12} />
                      הקצבה יומית
                    </p>
                    <p className="font-bold text-purple-900">{calories} קק״ל</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
