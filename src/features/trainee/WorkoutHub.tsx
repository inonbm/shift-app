import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Clock, Loader2, Play, Edit2, Trash2, X, Save, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useAuthStore } from '../../stores/authStore';
import { useTraineeStore } from '../../stores/traineeStore';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { WorkoutSession, SessionSet, WorkoutTemplate, TemplateExercise } from '../../types';

// ─── Edit Session Modal ───────────────────────────────────────────────────────

interface EditSessionModalProps {
  session: WorkoutSession & { sets: SessionSet[] };
  template: (WorkoutTemplate & { exercises: TemplateExercise[] }) | undefined;
  onClose: () => void;
}

function EditSessionModal({ session, template, onClose }: EditSessionModalProps) {
  const { updateSession, isLoading, error } = useWorkoutStore();
  const [notes, setNotes] = useState(session.notes || '');
  const [setsData, setSetsData] = useState<Record<string, Record<number, { reps: number; weight: number; isDone: boolean }>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize sets from existing session data
  useEffect(() => {
    if (!template) return;

    const initialData: typeof setsData = {};

    template.exercises.forEach(ex => {
      initialData[ex.id] = {};
      for (let i = 1; i <= ex.target_sets; i++) {
        const existingSet = session.sets.find(s => s.exercise_id === ex.id && s.set_number === i);
        initialData[ex.id][i] = {
          reps: existingSet ? existingSet.reps_done : ex.target_reps,
          weight: existingSet ? existingSet.weight_kg : 0,
          isDone: !!existingSet,
        };
      }
    });

    setSetsData(initialData);
  }, [template, session.sets]);

  const handleSetChange = (exerciseId: string, setNum: number, field: 'reps' | 'weight', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setSetsData(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [setNum]: {
          ...prev[exerciseId]?.[setNum],
          [field]: numValue
        }
      }
    }));
  };

  const toggleSetDone = (exerciseId: string, setNum: number) => {
    setSetsData(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [setNum]: {
          ...prev[exerciseId]?.[setNum],
          isDone: !prev[exerciseId]?.[setNum]?.isDone
        }
      }
    }));
  };

  const handleSave = async () => {
    setSubmitError(null);

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
      setSubmitError('יש לאשר לפחות סט אחד.');
      return;
    }

    try {
      await updateSession(session.id, { notes, sets: finalSets });
      onClose();
    } catch {
      setSubmitError('שגיאה בשמירת השינויים. נסה שוב.');
    }
  };

  const sortedExercises = template?.exercises ? [...template.exercises].sort((a, b) => a.order_index - b.order_index) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Edit2 size={18} className="text-purple-500" />
            עריכת אימון
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {(submitError || error) && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-100">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{submitError || error}</p>
            </div>
          )}

          {/* Exercises */}
          {sortedExercises.map(ex => (
            <div key={ex.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-white border-b border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm">{ex.exercise_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">יעד: {ex.target_sets} סטים × {ex.target_reps} חזרות</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 px-1 text-xs font-bold text-slate-400 text-center">
                  <div>סט</div>
                  <div>משקל (ק״ג)</div>
                  <div>חזרות</div>
                  <div></div>
                </div>
                {Array.from({ length: ex.target_sets }).map((_, i) => {
                  const setNum = i + 1;
                  const setData = setsData[ex.id]?.[setNum];
                  const isDone = setData?.isDone || false;

                  return (
                    <div
                      key={setNum}
                      className={`grid grid-cols-[28px_1fr_1fr_36px] gap-2 items-center p-2 rounded-xl border transition-all ${
                        isDone ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-center font-bold text-slate-500 text-sm">{setNum}</div>

                      <input
                        type="number"
                        value={setData?.weight ?? ''}
                        onChange={e => handleSetChange(ex.id, setNum, 'weight', e.target.value)}
                        placeholder="0"
                        className={`w-full text-center py-1.5 rounded-lg font-mono font-bold text-sm outline-none transition-all ${
                          isDone
                            ? 'bg-transparent text-emerald-700'
                            : 'bg-slate-50 border border-slate-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-300'
                        }`}
                      />

                      <input
                        type="number"
                        value={setData?.reps ?? ''}
                        onChange={e => handleSetChange(ex.id, setNum, 'reps', e.target.value)}
                        className={`w-full text-center py-1.5 rounded-lg font-mono font-bold text-sm outline-none transition-all ${
                          isDone
                            ? 'bg-transparent text-emerald-700'
                            : 'bg-slate-50 border border-slate-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-300'
                        }`}
                      />

                      <button
                        onClick={() => toggleSetDone(ex.id, setNum)}
                        className={`w-full h-full flex items-center justify-center rounded-lg transition-all ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-500'
                        }`}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">הערות</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="הערות לאימון..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl font-bold transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            שמור שינויים
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: WorkoutSession & { sets: SessionSet[] };
  templateName: string;
  template: (WorkoutTemplate & { exercises: TemplateExercise[] }) | undefined;
  /** Whether the trainee has permission to delete this session */
  canDelete: boolean;
  onDelete: (sessionId: string) => void;
}

function SessionCard({ session, templateName, template, canDelete, onDelete }: SessionCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dateObj = new Date(session.performed_at);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {/* Main row */}
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{templateName}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
              {dateObj.toLocaleDateString('he-IL')} בשעה{' '}
              {dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-sm font-medium text-slate-600">
              סך הכל סטים: <span className="font-bold text-slate-800">{session.sets?.length || 0}</span>
            </div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {expanded ? 'הסתר' : 'פרטים'}
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-bold transition-colors"
            >
              <Edit2 size={14} />
              ערוך
            </button>
            {canDelete && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-lg text-sm font-bold transition-colors border border-red-100"
                title="מחק אימון"
              >
                <Trash2 size={14} />
                מחק
              </button>
            )}
          </div>
        </div>

        {/* Expanded details — grouped by exercise (same as trainer view) */}
        {expanded && session.sets.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 space-y-2">
            {template ? (
              // ── Primary: use template exercise order ──────────────────────
              [...template.exercises]
                .sort((a, b) => a.order_index - b.order_index)
                .map(ex => {
                  const exerciseSets = [...session.sets]
                    .filter(s => s.exercise_id === ex.id)
                    .sort((a, b) => a.set_number - b.set_number);
                  if (exerciseSets.length === 0) return null;
                  return (
                    <div
                      key={ex.id}
                      className="bg-white rounded-lg p-3 border border-slate-100 flex flex-col md:flex-row gap-3 md:items-center"
                    >
                      <span className="font-bold text-slate-700 min-w-[150px] text-sm">{ex.exercise_name}</span>
                      <div className="flex flex-wrap gap-2">
                        {exerciseSets.map(set => (
                          <span
                            key={set.id}
                            className="bg-slate-50 px-2 py-1 rounded text-xs text-slate-600 font-mono border border-slate-200 shadow-sm"
                          >
                            סט {set.set_number}: <strong className="text-slate-800">{set.weight_kg}kg</strong> × {set.reps_done}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
            ) : (
              // ── Fallback: group by exercise_id when template was deleted ──
              Object.entries(
                session.sets.reduce<Record<string, typeof session.sets>>((acc, s) => {
                  const key = s.exercise_id ?? 'unknown';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(s);
                  return acc;
                }, {})
              ).map(([exerciseId, sets]) => {
                const exName = sets[0]?.exercise?.exercise_name ?? 'תרגיל';
                const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number);
                return (
                  <div
                    key={exerciseId}
                    className="bg-white rounded-lg p-3 border border-slate-100 flex flex-col md:flex-row gap-3 md:items-center"
                  >
                    <span className="font-bold text-slate-700 min-w-[150px] text-sm">{exName}</span>
                    <div className="flex flex-wrap gap-2">
                      {sortedSets.map(set => (
                        <span
                          key={set.id}
                          className="bg-slate-50 px-2 py-1 rounded text-xs text-slate-600 font-mono border border-slate-200 shadow-sm"
                        >
                          סט {set.set_number}: <strong className="text-slate-800">{set.weight_kg}kg</strong> × {set.reps_done}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
            {session.notes && (
              <p className="text-xs text-slate-500 italic pt-1">הערות: {session.notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EditSessionModal
          session={session}
          template={template}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Confirm delete modal */}
      <ConfirmModal
        isOpen={deleteOpen}
        title="מחיקת אימון"
        message="האם אתה בטוח שברצונך למחוק אימון זה? פעולה זו אינה הפיכה."
        confirmLabel="מחק"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          onDelete(session.id);
          setDeleteOpen(false);
        }}
      />
    </>
  );
}

// ─── WorkoutHub ───────────────────────────────────────────────────────────────

export function WorkoutHub() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { templates, sessions, fetchTemplates, fetchHistory, deleteSession, isLoading } = useWorkoutStore();
  const { currentTrainee, fetchMyData } = useTraineeStore();

  const canDeleteSessions = currentTrainee?.trainee_data?.can_delete_sessions ?? false;

  useEffect(() => {
    if (user?.id) {
      fetchTemplates();
      fetchHistory();
      fetchMyData();
    }
  }, [user?.id, fetchTemplates, fetchHistory, fetchMyData]);

  if (isLoading && sessions.length === 0 && templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-purple-600">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-medium">טוען נתונים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">

      {/* Templates Section */}
      <section>
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <Dumbbell size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">הקצאות אימון</h2>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center border-dashed">
            <p className="text-slate-500">המאמן שלך עדיין לא הקצה לך תבניות אימון.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-300 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-slate-800">{tpl.name}</h3>
                  <span className="bg-slate-50 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-md">
                    {tpl.exercises?.length || 0} תרגילים
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/workouts/active/${tpl.id}`)}
                  className="w-full bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Play size={18} fill="currentColor" /> התחל אימון עכשיו
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History Section */}
      <section>
        <div className="flex items-center gap-3 mb-4 px-1 mt-8">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
            <Clock size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">היסטוריית אימונים</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center border-dashed">
            <p className="text-slate-500">טרם ביצעת אימונים במערכת.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => {
              const matchedTemplate = templates.find(t => t.id === session.template_id);
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  templateName={matchedTemplate?.name || 'אימון ללא שם'}
                  template={matchedTemplate}
                  canDelete={canDeleteSessions}
                  onDelete={deleteSession}
                />
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
