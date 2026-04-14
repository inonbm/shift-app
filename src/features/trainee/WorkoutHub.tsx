import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Clock, Loader2, Play } from 'lucide-react';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useAuthStore } from '../../stores/authStore';

export function WorkoutHub() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { templates, sessions, fetchTemplates, fetchHistory, isLoading } = useWorkoutStore();

  useEffect(() => {
    if (user?.id) {
      fetchTemplates();
      fetchHistory();
    }
  }, [user?.id, fetchTemplates, fetchHistory]);

  if (isLoading) {
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
              const dateObj = new Date(session.performed_at);
              
              return (
                <div key={session.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      {matchedTemplate?.name || 'אימון ללא שם'}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                      {dateObj.toLocaleDateString('he-IL')} בשעה {dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-slate-600">
                      סך הכל סטים: <span className="font-bold text-slate-800">{session.sets?.length || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
