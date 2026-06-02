import { useRef, useState } from 'react';
import { CalendarDays, Clock, Dumbbell, Edit2, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import type { WorkoutSessionWithSets, WorkoutTemplateWithExercises, TemplateExercise } from '../../../types';
import type { ExerciseForm, SetState } from './types';

// ─── Drag state ──────────────────────────────────────────────────────────────

interface DragState {
  templateId: string;
  /** 'block' = dragging a whole focus-area group; 'exercise' = dragging one exercise row */
  type: 'block' | 'exercise';
  /** For block drags: the focus_area string being dragged */
  dragArea: string | null;
  /** For exercise drags: the exercise id being dragged */
  dragExerciseId: string | null;
  /** For exercise drags: which block the dragged exercise lives in */
  dragExerciseArea: string | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

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
  deleteSession: (sessionId: string) => void;
  updateExercise: (exerciseId: string, updates: ExerciseForm) => void;
  addExerciseToTemplate: (templateId: string, exercise: ExerciseForm & { order_index: number }) => void;
  deleteExercise: (exerciseId: string) => void;
  reorderExercises: (templateId: string, orderedIds: string[]) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build an ordered list of { area, exercises[] } blocks from a flat exercise array.
 * Blocks are ordered by the minimum order_index of their exercises.
 */
function buildBlocks(exercises: TemplateExercise[]): { area: string; exercises: TemplateExercise[] }[] {
  const sorted = [...exercises].sort((a, b) => a.order_index - b.order_index);
  const map = new Map<string, TemplateExercise[]>();
  for (const ex of sorted) {
    const area = ex.focus_area || 'כללי';
    if (!map.has(area)) map.set(area, []);
    map.get(area)!.push(ex);
  }
  return Array.from(map.entries()).map(([area, exs]) => ({ area, exs: exs.sort((a, b) => a.order_index - b.order_index) }))
    .map(({ area, exs }) => ({ area, exercises: exs }));
}

/**
 * Given a list of blocks in their current UI order,
 * produce a flat array of exercise IDs that encodes the full order.
 */
function flatIds(blocks: { area: string; exercises: TemplateExercise[] }[]): string[] {
  return blocks.flatMap(b => b.exercises.map(e => e.id));
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  deleteSession,
  updateExercise,
  addExerciseToTemplate,
  deleteExercise,
  reorderExercises,
}: WorkoutsTabProps) {

  // Local block order state: keyed by templateId → ordered block list
  // (derived from props initially, then managed locally while dragging)
  const [localBlocks, setLocalBlocks] = useState<Record<string, { area: string; exercises: TemplateExercise[] }[]>>({});
  const dragState = useRef<DragState | null>(null);

  // Helper: get the current blocks for a template (prefer local state)
  const getBlocks = (template: WorkoutTemplateWithExercises) => {
    if (localBlocks[template.id]) return localBlocks[template.id];
    return buildBlocks(template.exercises);
  };

  // ── Block-level drag handlers ─────────────────────────────────────────────

  const onBlockDragStart = (templateId: string, area: string) => {
    dragState.current = { templateId, type: 'block', dragArea: area, dragExerciseId: null, dragExerciseArea: null };
  };

  const onBlockDragOver = (e: React.DragEvent, templateId: string, overArea: string) => {
    e.preventDefault();
    if (!dragState.current || dragState.current.type !== 'block') return;
    if (dragState.current.templateId !== templateId) return;
    const dragArea = dragState.current.dragArea!;
    if (dragArea === overArea) return;

    setLocalBlocks(prev => {
      const blocks = prev[templateId] ?? buildBlocks(traineeTemplates.find(t => t.id === templateId)!.exercises);
      const dragIdx = blocks.findIndex(b => b.area === dragArea);
      const overIdx = blocks.findIndex(b => b.area === overArea);
      if (dragIdx === -1 || overIdx === -1) return prev;
      const next = [...blocks];
      const [removed] = next.splice(dragIdx, 1);
      next.splice(overIdx, 0, removed);
      return { ...prev, [templateId]: next };
    });
  };

  const onBlockDragEnd = (templateId: string) => {
    if (!dragState.current || dragState.current.type !== 'block') return;
    dragState.current = null;
    const blocks = localBlocks[templateId];
    if (blocks) reorderExercises(templateId, flatIds(blocks));
  };

  // ── Exercise-level drag handlers ──────────────────────────────────────────

  const onExerciseDragStart = (templateId: string, area: string, exerciseId: string) => {
    dragState.current = { templateId, type: 'exercise', dragArea: null, dragExerciseId: exerciseId, dragExerciseArea: area };
  };

  const onExerciseDragOver = (e: React.DragEvent, templateId: string, area: string, overId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Don't let the block handler fire
    if (!dragState.current || dragState.current.type !== 'exercise') return;
    if (dragState.current.templateId !== templateId) return;
    const dragId = dragState.current.dragExerciseId!;
    const dragArea = dragState.current.dragExerciseArea!;
    if (dragId === overId) return;

    setLocalBlocks(prev => {
      const blocks = prev[templateId] ?? buildBlocks(traineeTemplates.find(t => t.id === templateId)!.exercises);
      const blockIdx = blocks.findIndex(b => b.area === area);
      if (blockIdx === -1) return prev;
      // Only reorder within the same block for now
      if (dragArea !== area) return prev;
      const exercises = [...blocks[blockIdx].exercises];
      const dragIdx = exercises.findIndex(ex => ex.id === dragId);
      const overIdx = exercises.findIndex(ex => ex.id === overId);
      if (dragIdx === -1 || overIdx === -1) return prev;
      const [removed] = exercises.splice(dragIdx, 1);
      exercises.splice(overIdx, 0, removed);
      const nextBlocks = blocks.map((b, i) => i === blockIdx ? { ...b, exercises } : b);
      return { ...prev, [templateId]: nextBlocks };
    });
  };

  const onExerciseDragEnd = (templateId: string) => {
    if (!dragState.current || dragState.current.type !== 'exercise') return;
    dragState.current = null;
    const blocks = localBlocks[templateId];
    if (blocks) reorderExercises(templateId, flatIds(blocks));
  };

  // ─────────────────────────────────────────────────────────────────────────

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
          {traineeTemplates.map(template => {
            const blocks = getBlocks(template);

            return (
              <div key={template.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Template header */}
                <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-800">{template.name}</h3>
                  <button
                    onClick={() => {
                      if (confirm('האם אתה בטוח שברצונך למחוק תוכנית אימון זו?')) {
                        deleteTemplate(template.id);
                        setLocalBlocks(prev => { const n = { ...prev }; delete n[template.id]; return n; });
                      }
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="מחק תוכנית"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Blocks */}
                <div className="space-y-3">
                  {blocks.map(({ area, exercises }) => (
                    <div
                      key={area}
                      className="rounded-lg border border-transparent transition-colors"
                      onDragOver={e => onBlockDragOver(e, template.id, area)}
                    >
                      {/* Block header — draggable */}
                      {area !== 'כללי' && (
                        <div
                          draggable
                          onDragStart={() => onBlockDragStart(template.id, area)}
                          onDragEnd={() => onBlockDragEnd(template.id)}
                          className="flex items-center gap-1.5 px-1 py-1 mb-1 cursor-grab active:cursor-grabbing rounded-md hover:bg-slate-200 transition-colors group"
                          title="גרור להזזת הקבוצה"
                        >
                          <GripVertical
                            size={14}
                            className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors"
                          />
                          <h4 className="text-xs font-bold text-slate-500 select-none">{area}</h4>
                        </div>
                      )}

                      {/* Exercises within the block */}
                      <div className="space-y-1.5">
                        {exercises.map(ex => (
                          <div
                            key={ex.id}
                            draggable={editingExerciseId !== ex.id}
                            onDragStart={() => onExerciseDragStart(template.id, area, ex.id)}
                            onDragOver={e => onExerciseDragOver(e, template.id, area, ex.id)}
                            onDragEnd={() => onExerciseDragEnd(template.id)}
                            className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100 group/row transition-shadow hover:shadow-sm"
                          >
                            {editingExerciseId === ex.id ? (
                              /* ── Edit mode ── */
                              <div className="flex-1 flex gap-2 flex-wrap">
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
                                  // Invalidate local block cache so rebuilt from fresh store data
                                  setLocalBlocks(prev => { const n = { ...prev }; delete n[template.id]; return n; });
                                }} className="text-emerald-500 hover:text-emerald-700">
                                  <Save size={16} />
                                </button>
                                <button onClick={() => setEditingExerciseId(null)} className="text-slate-400 hover:text-slate-600">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              /* ── View mode ── */
                              <>
                                {/* Drag handle */}
                                <GripVertical
                                  size={14}
                                  className="text-slate-200 group-hover/row:text-slate-400 flex-shrink-0 cursor-grab active:cursor-grabbing mr-1 transition-colors"
                                />
                                <span className="font-medium text-slate-700 flex-1">{ex.exercise_name}</span>
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
                                  <button
                                    onClick={() => {
                                      deleteExercise(ex.id);
                                      setLocalBlocks(prev => { const n = { ...prev }; delete n[template.id]; return n; });
                                    }}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add exercise */}
                {addingToTemplateId === template.id ? (
                  <div className="mt-3 bg-white p-2 border border-blue-200 rounded-lg flex gap-2 text-sm flex-wrap">
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
                      setLocalBlocks(prev => { const n = { ...prev }; delete n[template.id]; return n; });
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
                  <option value="פלג גוף עליון" />
                  <option value="פלג גוף תחתון" />
                  <option value="חזה" />
                  <option value="גב" />
                  <option value="רגליים" />
                  <option value="כתפיים" />
                  <option value="ידיים" />
                  <option value="בטן" />
                </datalist>
              </div>
            );
          })}
        </div>
      )}

      {/* Training history */}
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
                    <div className="flex items-start gap-2">
                      {session.notes && (
                        <div className="bg-blue-50 text-blue-700 p-2 rounded-lg text-xs max-w-xs break-words">
                          <strong>הערת מתאמן:</strong> {session.notes}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('האם אתה בטוח שברצונך למחוק אימון זה?')) {
                            deleteSession(session.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex-shrink-0"
                        title="מחק אימון"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {template && [...template.exercises].sort((a, b) => a.order_index - b.order_index).map(ex => {
                      const exerciseSets = [...session.sets].filter(s => s.exercise_id === ex.id).sort((a, b) => a.set_number - b.set_number);
                      if (exerciseSets.length === 0) return null;

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
