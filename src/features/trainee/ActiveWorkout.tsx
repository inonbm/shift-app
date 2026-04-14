import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Save, Loader2, AlertCircle } from 'lucide-react';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useAuthStore } from '../../stores/authStore';

export function ActiveWorkout() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { templates, fetchTemplates, logSession, isLoading, error } = useWorkoutStore();

  const [notes, setNotes] = useState('');
  // Map: exercise_id -> set_number -> { reps_done, weight_kg, isDone }
  const [setsData, setSetsData] = useState<Record<string, Record<number, { reps: number; weight: number; isDone: boolean }>>>({});

  useEffect(() => {
    if (templates.length === 0) {
      fetchTemplates();
    }
  }, [templates.length, fetchTemplates]);

  const template = templates.find(t => t.id === templateId);

  // Initialize form state once template loads
  useEffect(() => {
    if (template && Object.keys(setsData).length === 0) {
      const initialData: typeof setsData = {};
      template.exercises.forEach(ex => {
        initialData[ex.id] = {};
        for (let i = 1; i <= ex.target_sets; i++) {
          initialData[ex.id][i] = { reps: ex.target_reps, weight: 0, isDone: false };
        }
      });
      setSetsData(initialData);
    }
  }, [template, setsData]);

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-purple-600">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-medium">טוען אימון...</p>
      </div>
    );
  }

  const handleSetChange = (exerciseId: string, setNum: number, field: 'reps' | 'weight', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setSetsData(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [setNum]: {
          ...prev[exerciseId][setNum],
          [field]: numValue
        }
      }
    }));
  };

  const toggleSetComplete = (exerciseId: string, setNum: number) => {
    setSetsData(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [setNum]: {
          ...prev[exerciseId][setNum],
          isDone: !prev[exerciseId][setNum].isDone
        }
      }
    }));
  };

  const activeExercises = template.exercises.sort((a, b) => a.order_index - b.order_index);

  const handleFinishWorkout = async () => {
    if (!user) return;
    
    // Flatten sets for DB
    const finalSets: { exercise_id: string; set_number: number; reps_done: number; weight_kg: number }[] = [];
    
    Object.entries(setsData).forEach(([exId, setsObj]) => {
      Object.entries(setsObj).forEach(([setNumStr, data]) => {
        if (data.isDone) {
          finalSets.push({
            exercise_id: exId,
            set_number: parseInt(setNumStr),
            reps_done: data.reps,
            weight_kg: data.weight
          });
        }
      });
    });

    if (finalSets.length === 0) {
      alert('יש לאשר לפחות סט אחד כדי לסיים אימון!');
      return;
    }

    try {
      await logSession({
        template_id: template.id,
        trainee_id: user.id,
        notes,
        sets: finalSets
      });
      navigate('/workouts');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between sticky top-4 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/workouts')}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronRight size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{template.name}</h1>
            <p className="text-sm text-emerald-600 font-bold">אימון פעיל</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Exercises List */}
      <div className="space-y-6">
        {activeExercises.map((ex, index) => (
          <div key={ex.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                {ex.exercise_name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 mr-8">
                יעד מתוכנן: {ex.target_sets} סטים × {ex.target_reps} חזרות
              </p>
            </div>
            
            <div className="p-3 bg-white">
              <div className="grid grid-cols-[30px_1fr_1fr_40px] gap-2 mb-2 px-2 text-xs font-bold text-slate-400 text-center">
                <div>סט</div>
                <div>משקל (ק״ג)</div>
                <div>חזרות</div>
                <div></div>
              </div>
              
              <div className="space-y-2">
                {Array.from({ length: ex.target_sets }).map((_, i) => {
                  const setNum = i + 1;
                  const currentSet = setsData[ex.id]?.[setNum];
                  const isDone = currentSet?.isDone || false;

                  return (
                    <div key={setNum} className={`grid grid-cols-[30px_1fr_1fr_40px] gap-2 items-center p-2 rounded-xl border transition-all ${isDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="text-center font-bold text-slate-500 text-sm">
                        {setNum}
                      </div>
                      
                      <input 
                        type="number" 
                        disabled={isDone}
                        value={currentSet?.weight || ''}
                        onChange={(e) => handleSetChange(ex.id, setNum, 'weight', e.target.value)}
                        placeholder="0"
                        className={`w-full text-center py-2 rounded-lg font-mono font-bold text-lg outline-none transition-all
                          ${isDone ? 'bg-transparent text-emerald-700' : 'bg-white border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400'}
                        `}
                      />
                      
                      <input 
                        type="number" 
                        disabled={isDone}
                        value={currentSet?.reps || ''}
                        onChange={(e) => handleSetChange(ex.id, setNum, 'reps', e.target.value)}
                        className={`w-full text-center py-2 rounded-lg font-mono font-bold text-lg outline-none transition-all
                          ${isDone ? 'bg-transparent text-emerald-700' : 'bg-white border border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400'}
                        `}
                      />
                      
                      <button 
                        onClick={() => toggleSetComplete(ex.id, setNum)}
                        className={`w-full h-full flex items-center justify-center rounded-lg transition-all
                          ${isDone ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 text-slate-400 hover:bg-emerald-100 hover:text-emerald-500'}
                        `}
                      >
                        <CheckCircle2 size={24} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-sm font-bold text-slate-700 mb-2">הערות לאימון (אופציונלי)</label>
        <textarea 
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="איך הרגשת היום? הערות על המשקלים..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
        />
      </div>

      {/* Floating Action Button for smaller screens, standard button for normal */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-50 md:relative md:bg-transparent md:border-none md:p-0">
        <button
          onClick={handleFinishWorkout}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isLoading ? (
            <><Loader2 size={24} className="animate-spin" /> שומר אימון...</>
          ) : (
            <><Save size={24} /> סיום ושמירת אימון</>
          )}
        </button>
      </div>

    </div>
  );
}
