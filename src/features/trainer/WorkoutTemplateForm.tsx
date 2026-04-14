import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, Save, Dumbbell, AlertCircle, Loader2 } from 'lucide-react';
import { useTraineeStore } from '../../stores/traineeStore';
import { useWorkoutStore } from '../../stores/workoutStore';

export function WorkoutTemplateForm() {
  const navigate = useNavigate();
  const { trainees, fetchTrainees } = useTraineeStore();
  const { createTemplate, isLoading, error, clearError } = useWorkoutStore();

  const [traineeId, setTraineeId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [exercises, setExercises] = useState([
    { exercise_name: '', target_sets: 3, target_reps: 10 }
  ]);

  useEffect(() => {
    fetchTrainees();
    clearError();
  }, [fetchTrainees, clearError]);

  const handleAddExercise = () => {
    setExercises([...exercises, { exercise_name: '', target_sets: 3, target_reps: 10 }]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (index: number, field: string, value: string | number) => {
    const newEx = [...exercises];
    newEx[index] = { ...newEx[index], [field]: value };
    setExercises(newEx);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traineeId) {
      alert('נא לבחור מתאמן מהרשימה');
      return;
    }

    try {
      await createTemplate({
        name: templateName,
        trainee_id: traineeId,
        exercises: exercises.map((ex, idx) => ({
          ...ex,
          order_index: idx
        }))
      });
      navigate('/trainer');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <button 
          onClick={() => navigate('/trainer')}
          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
        >
          <ArrowRight size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
            <Dumbbell size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">יצירת תבנית אימון</h1>
            <p className="text-sm text-slate-500">הקצאת תוכנית אימון למתאמן ספציפי</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">הגדרות בסיסיות</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">שיוך למתאמן</label>
              <select 
                required
                value={traineeId}
                onChange={(e) => setTraineeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>--- בחר מתאמן ---</option>
                {trainees.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">שם האימון (למשל: יום א׳ - חזה וגב)</label>
              <input 
                required
                type="text" 
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-lg font-bold text-slate-800">רשימת תרגילים</h2>
            <button 
              type="button" 
              onClick={handleAddExercise}
              className="text-emerald-600 font-bold flex items-center gap-1 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors text-sm"
            >
              <Plus size={16} /> שורה חדשה
            </button>
          </div>

          <div className="space-y-3">
            {exercises.map((ex, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                <div className="w-full font-medium text-slate-400 text-sm md:w-auto px-2">{i + 1}.</div>
                <div className="flex-1 w-full">
                  <label className="block md:hidden text-xs text-slate-500 mb-1">שם התרגיל</label>
                  <input 
                    required
                    placeholder="לדוגמה: לחיצת חזה כנגד מוט"
                    type="text" 
                    value={ex.exercise_name}
                    onChange={(e) => handleExerciseChange(i, 'exercise_name', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none"
                  />
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-xs text-slate-500 mb-1 font-bold text-center">סטים</label>
                  <input 
                    required
                    type="number" 
                    min={1} max={20}
                    value={ex.target_sets}
                    onChange={(e) => handleExerciseChange(i, 'target_sets', parseInt(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none text-center font-mono"
                  />
                </div>
                <div className="w-full md:w-24">
                  <label className="block text-xs text-slate-500 mb-1 font-bold text-center">חזרות</label>
                  <input 
                    required
                    type="number" 
                    min={1} max={100}
                    value={ex.target_reps}
                    onChange={(e) => handleExerciseChange(i, 'target_reps', parseInt(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none text-center font-mono"
                  />
                </div>
                {exercises.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => handleRemoveExercise(i)}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70"
        >
          {isLoading ? (
            <><Loader2 size={20} className="animate-spin" /> שומר תבנית...</>
          ) : (
            <><Save size={20} /> צור תוכנית אימון ושמור</>
          )}
        </button>
      </form>
    </div>
  );
}
