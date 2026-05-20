import { useEffect, type ReactElement } from 'react';
import { Activity, BadgeCheck, CalendarDays, Loader2, ShieldAlert, Target, UserRound } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTraineeStore } from '../../stores/traineeStore';
import {
  ACTIVITY_LEVEL_LABELS,
  GENDER_LABELS,
  GOAL_LABELS,
  type TraineeData,
} from '../../types';

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactElement;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MacroRow({ label, current, target, accentClass }: { label: string; current: number; target: number; accentClass: string }) {
  const safeTarget = target > 0 ? target : 0;
  const progress = safeTarget > 0 ? Math.min(100, Math.round((current / safeTarget) * 100)) : 0;

  return (
    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500">
          {Math.round(current)} / {Math.round(target)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${accentClass}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function getDashboardStatus(data: TraineeData | null): { label: string; tone: string; icon: React.ReactNode; description: string } {
  if (!data) {
    return {
      label: 'חסרים נתוני פרופיל',
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <ShieldAlert size={18} />,
      description: 'לא נמצאו נתוני trainee_data, יש להמתין לעדכון מהמאמן.',
    };
  }

  return {
    label: 'הפרופיל מוכן',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <BadgeCheck size={18} />,
    description: 'הפרופיל נטען בהצלחה ומוצגים נתוני הבסיס והיעדים שלך.',
  };
}

export function TraineeDashboard() {
  const { profile } = useAuthStore();
  const { fetchMyData, currentTrainee, isLoading, error, clearError } = useTraineeStore();

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-sky-600">
        <Loader2 size={40} className="mb-4 animate-spin" />
        <p className="text-lg font-medium">טוען את לוח המחוונים שלך...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        <p className="font-bold">שגיאה בטעינת הדשבורד</p>
        <p className="mt-2 text-sm">{error}</p>
        <button
          type="button"
          onClick={clearError}
          className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
        >
          סגור הודעה
        </button>
      </div>
    );
  }

  const trainee = currentTrainee;
  const data = trainee?.trainee_data ?? null;
  const status = getDashboardStatus(data);

  if (!trainee) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <UserRound className="mx-auto mb-4 text-slate-400" size={44} />
        <h1 className="text-2xl font-bold text-slate-800">Trainee Dashboard</h1>
        <p className="mt-2 text-slate-500">לא נמצא פרופיל מתאמן פעיל עבור המשתמש המחובר.</p>
      </div>
    );
  }

  const readinessLabel = data ? 'פעיל ומעודכן' : 'ממתין להשלמה';

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">Trainee Dashboard</p>
            <h1 className="text-3xl font-black text-slate-900">{trainee.full_name}</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              מסך מתאמן עצמאי לקריאה בלבד, עם תמונת מצב של הפרופיל, היעדים והסטטוס הנוכחי מול המידע שנשמר ב-Supabase.
            </p>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${status.tone}`}>
            {status.icon}
            <span>{status.label}</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {status.description}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<UserRound size={20} />} label="שם מלא" value={trainee.full_name} />
        <StatCard icon={<CalendarDays size={20} />} label="אימייל" value={trainee.email} />
        <StatCard icon={<Target size={20} />} label="מטרה" value={data ? GOAL_LABELS[data.goal] : 'לא הוגדר'} />
        <StatCard icon={<Activity size={20} />} label="סטטוס" value={readinessLabel} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Overview</h2>
              <p className="text-sm text-slate-500">נתוני בסיס ויעדים, ללא אפשרויות עריכה.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard icon={<UserRound size={20} />} label="מין" value={data ? GENDER_LABELS[data.gender] : 'לא הוגדר'} />
            <StatCard icon={<Activity size={20} />} label="רמת פעילות" value={data ? ACTIVITY_LEVEL_LABELS[data.activity_level] : 'לא הוגדר'} />
            <StatCard icon={<Target size={20} />} label="גיל" value={data ? `${data.age}` : 'לא הוגדר'} />
            <StatCard icon={<Target size={20} />} label="משקל" value={data ? `${data.weight_kg} ק"ג` : 'לא הוגדר'} />
            <StatCard icon={<Target size={20} />} label="גובה" value={data ? `${data.height_cm} ס"מ` : 'לא הוגדר'} />
            <StatCard icon={<CalendarDays size={20} />} label="עודכן לאחרונה" value={data?.updated_at ? new Date(data.updated_at).toLocaleDateString('he-IL') : 'אין נתון'} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">סטטוס</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>חשבון</span>
                <span className="font-semibold text-slate-800">{profile?.role === 'trainee' ? 'מתאמן' : 'לא זוהה'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>מצב הפרופיל</span>
                <span className="font-semibold text-slate-800">{readinessLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>תצוגה</span>
                <span className="font-semibold text-slate-800">קריאה בלבד</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">Macro Targets</h2>
            <p className="mt-1 text-sm text-slate-500">סיכום היעדים מהמערכת, אם קיימים.</p>

            {data ? (
              <div className="mt-4 space-y-3">
                <MacroRow label="קלוריות" current={data.goal_calories} target={data.goal_calories} accentClass="bg-sky-500" />
                <MacroRow label="חלבון" current={data.protein_grams} target={data.protein_grams} accentClass="bg-emerald-500" />
                <MacroRow label="פחמימות" current={data.carbs_grams} target={data.carbs_grams} accentClass="bg-blue-500" />
                <MacroRow label="שומן" current={data.fat_grams} target={data.fat_grams} accentClass="bg-amber-500" />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                עדיין אין נתוני trainee_data להצגה.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
