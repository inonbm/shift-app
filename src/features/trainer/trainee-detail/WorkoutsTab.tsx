import { CalendarDays, Clock, Dumbbell, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import type { WorkoutSessionWithSets, WorkoutTemplateWithExercises } from '../../../types';
import type { ExerciseForm, SetState } from './types';

interface WorkoutsTabProps {
  traineeTemplates: WorkoutTemplateWithExercises[];
  traineeSessions: WorkoutSessionWithSets[];
  templates: WorkoutTemplateWithExercises[];
  editingExerciseId: string | null;
  exerciseForm: ExerciseForm;
  addingToTemplateId: string | null;
  setEditingExerciseId: (value: string | null) => void;
  setExerciseForm: SetState<ExerciseForm>;
  setAddingToTemplateId: (value: string | null) => void;
  onCreateWorkout: () => void;
  deleteTemplate: (templateId: string) => void;
  updateExercise: (exerciseId: string, updates: ExerciseForm) => void;
  addExerciseToTemplate: (templateId: string, exercise: ExerciseForm & { order_index: number }) => void;
  deleteExercise: (exerciseId: string) => void;
}

export function WorkoutsTab({
  traineeTemplates,
  traineeSessions,
  templates,
  editingExerciseId,
  exerciseForm,
  addingToTemplateId,
  setEditingExerciseId,
  setExerciseForm,
  setAddingToTemplateId,
  onCreateWorkout,
  deleteTemplate,
  updateExercise,
  addExerciseToTemplate,
  deleteExercise,
}: WorkoutsTabProps) {
  return (
<div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
    <div>
      <h2 className="text-lg font-bold text-slate-800">תוכניות אימון צמודות</h2>
      <p className="text-sm text-slate-500">תבניות הפעילות שהוקצו למתאמן זה</p>
    </div>
    <button
      onClick={() => onCreateWorkout()}
      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
    >
      <Plus size={18} />
      צור תוכנית חדשה
    </button>
  </div>

  {traineeTemplates.length === 0 ? (
    <div className="text-center py-12">
      <Dumbbell size={40} className="mx-auto text-slate-200 mb-3" />
      <p className="text-slate-500">עדיין לא הוקצו תוכניות אימון.</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {traineeTemplates.map(template => (
        <div key={template.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
            <h3 className="font-bold text-slate-800">{template.name}</h3>
            <button
              onClick={() => {
                if (confirm('האם אתה בטוח שברצונך למחוק תוכנית אימון זו?')) {
                  deleteTemplate(template.id);
                }
              }}
              className="text-red-500 hover:text-red-700 p-1"
              title="מחק תוכנית"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {(() => {
              const sorted = [...template.exercises].sort((a,b) => a.order_index - b.order_index);

              const grouped = sorted.reduce((acc, ex) => {
                const area = ex.focus_area || 'כללי';
                if (!acc[area]) acc[area] = [];
                acc[area].push(ex);
                return acc;
              }, {} as Record<string, typeof sorted>);

              return Object.entries(grouped).map(([area, exercises]) => (
                <div key={area} className="space-y-2">
                  {area !== 'כללי' && (
                    <h4 className="text-xs font-bold text-slate-500 mb-1 px-1 border-b border-slate-200 pb-1">{area}</h4>
                  )}
                  {exercises.map(ex => (
                    <div key={ex.id} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100">
                      {editingExerciseId === ex.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={exerciseForm.exercise_name}
                            onChange={e => setExerciseForm({ ...exerciseForm, exercise_name: e.target.value })}
                            className="w-full px-2 py-1 text-xs border rounded bg-slate-50"
                          />
                          <input
                            type="text"
                            list={`focus-areas-${template.id}`}
                            placeholder="קבוצת שריר"
                            value={exerciseForm.focus_area || ''}
                            onChange={e => setExerciseForm({ ...exerciseForm, focus_area: e.target.value })}
                            className="w-24 px-2 py-1 text-xs border rounded bg-slate-50"
                          />
                          <input
                            type="number"
                            value={exerciseForm.target_sets}
                            onChange={e => setExerciseForm({ ...exerciseForm, target_sets: Number(e.target.value) })}
                            className="w-12 px-2 py-1 text-xs border rounded bg-slate-50 text-center"
                          />
                          <span className="self-center text-slate-400">×</span>
                          <input
                            type="number"
                            value={exerciseForm.target_reps}
                            onChange={e => setExerciseForm({ ...exerciseForm, target_reps: Number(e.target.value) })}
                            className="w-12 px-2 py-1 text-xs border rounded bg-slate-50 text-center"
                          />
                          <button onClick={() => {
                            updateExercise(ex.id, exerciseForm);
                            setEditingExerciseId(null);
                          }} className="text-emerald-500 hover:text-emerald-700">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingExerciseId(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-700">{ex.exercise_name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-mono">{ex.target_sets} × {ex.target_reps}</span>
                            <button
                              onClick={() => {
                                setEditingExerciseId(ex.id);
                                setExerciseForm({ exercise_name: ex.exercise_name, target_sets: ex.target_sets, target_reps: ex.target_reps, focus_area: ex.focus_area || '' });
                              }}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteExercise(ex.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>

          {addingToTemplateId === template.id ? (
            <div className="mt-3 bg-white p-2 border border-blue-200 rounded-lg flex gap-2 text-sm">
              <input
                type="text"
                placeholder="שם תרגיל"
                value={exerciseForm.exercise_name}
                onChange={e => setExerciseForm({ ...exerciseForm, exercise_name: e.target.value })}
                className="w-full px-2 py-1 text-xs border rounded bg-slate-50"
              />
              <input
                type="text"
                list={`focus-areas-${template.id}`}
                placeholder="קבוצת שריר"
                value={exerciseForm.focus_area || ''}
                onChange={e => setExerciseForm({ ...exerciseForm, focus_area: e.target.value })}
                className="w-28 px-2 py-1 text-xs border rounded bg-slate-50"
              />
              <input
                type="number"
                placeholder="סטים"
                value={exerciseForm.target_sets}
                onChange={e => setExerciseForm({ ...exerciseForm, target_sets: Number(e.target.value) })}
                className="w-12 px-2 py-1 text-xs border rounded bg-slate-50 text-center"
              />
              <input
                type="number"
                placeholder="חזרות"
                value={exerciseForm.target_reps}
                onChange={e => setExerciseForm({ ...exerciseForm, target_reps: Number(e.target.value) })}
                className="w-12 px-2 py-1 text-xs border rounded bg-slate-50 text-center"
              />
              <button onClick={() => {
                addExerciseToTemplate(template.id, {
                  exercise_name: exerciseForm.exercise_name,
                  target_sets: exerciseForm.target_sets,
                  target_reps: exerciseForm.target_reps,
                  focus_area: exerciseForm.focus_area || undefined,
                  order_index: template.exercises.length
                });
                setAddingToTemplateId(null);
              }} className="text-emerald-500 hover:text-emerald-700">
                <Plus size={16} />
              </button>
              <button onClick={() => setAddingToTemplateId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAddingToTemplateId(template.id);
                setExerciseForm({ exercise_name: '', target_sets: 3, target_reps: 10, focus_area: '' });
              }}
              className="mt-3 w-full py-1.5 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors border border-dashed border-blue-200 flex items-center justify-center gap-1"
            >
              <Plus size={14} /> הוסף תרגיל
            </button>
          )}
          
          <datalist id={`focus-areas-${template.id}`}>
            {Array.from(new Set(template.exercises.map(ex => ex.focus_area).filter(Boolean))).map(area => (
              <option key={area} value={area} />
            ))}
          </datalist>
        </div>
      ))}
    </div>
  )}
  <div className="pt-8 mt-8 border-t border-slate-100">
    <div className="flex items-center gap-2 mb-6">
      <Clock className="text-blue-500" />
      <h2 className="text-lg font-bold text-slate-800">היסטוריית אימונים (יומן ביצוע)</h2>
    </div>

    {traineeSessions.length === 0 ? (
      <div className="text-center py-8">
        <p className="text-slate-400">המתאמן טרם רשם אימונים שבוצעו במערכת.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {traineeSessions.map(session => {
          const template = templates.find(t => t.id === session.template_id);
          const sessionDate = new Date(session.performed_at).toLocaleDateString('he-IL', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          // Group sets by exercise_id to merge them conceptually just for viewing
          // However, for simplicity, we can just list them compactly
          return (
            <div key={session.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {template?.name || 'אימון שמור (תבנית נמחקה)'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                    <CalendarDays size={14} />
                    {sessionDate}
                  </div>
                </div>
                {session.notes && (
                  <div className="bg-blue-50 text-blue-700 p-2 rounded-lg text-xs max-w-xs break-words">
                    <strong>הערת מתאמן:</strong> {session.notes}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {template && template.exercises.sort((a,b) => a.order_index - b.order_index).map(ex => {
                  const exerciseSets = session.sets.filter(s => s.exercise_id === ex.id).sort((a,b) => a.set_number - b.set_number);
                  if (exerciseSets.length === 0) return null; // skipped exercise

                  return (
                    <div key={ex.id} className="bg-white rounded-lg p-3 border border-slate-100 flex flex-col md:flex-row gap-3 md:items-center">
                      <span className="font-bold text-slate-700 min-w-[150px]">{ex.exercise_name}</span>
                      <div className="flex flex-wrap gap-2">
                        {exerciseSets.map(set => (
                          <span key={set.id} className="bg-slate-50 px-2 py-1 rounded text-xs text-slate-600 font-mono border border-slate-200 shadow-sm">
                            סט {set.set_number}: <strong className="text-slate-800">{set.weight_kg}kg</strong> × {set.reps_done}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>
  );
}
