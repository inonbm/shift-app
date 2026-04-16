import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldAlert, Search, Loader2, KeyRound, User, ExternalLink } from 'lucide-react';
import type { Profile } from '../../types';
import { ResetPasswordModal } from '../../components/ui/ResetPasswordModal';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [resetModalUser, setResetModalUser] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.includes(search) || u.email.includes(search)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-3 rounded-xl text-red-600">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">לוח בקרה למנהלי מערכת</h1>
            <p className="text-slate-500">ניהול משתמשים, אבטחה והרשאות ברמת הארגון.</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="חיפוש לפי שם או אמייל..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 outline-none focus:ring-2 focus:ring-red-400 transition-shadow"
            />
          </div>
          <div className="text-sm font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            סה״כ: {users.length} משתמשים
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12 text-red-500">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="py-3 px-4 font-bold">שם מלא</th>
                  <th className="py-3 px-4 font-bold">אימייל</th>
                  <th className="py-3 px-4 font-bold">תפקיד</th>
                  <th className="py-3 px-4 font-bold">מזהה מאמן</th>
                  <th className="py-3 px-4 font-bold">פעולות</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <User size={16} className="text-slate-400" />
                      {user.full_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 flex items-center w-fit justify-center rounded text-xs font-bold ${
                        user.role === 'admin' ? 'bg-red-100 text-red-700' :
                        user.role === 'trainer' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                      {user.trainer_id ? (user.trainer_id.slice(0, 8) + '...') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.role === 'trainee' && (
                          <button 
                            onClick={() => navigate(`/trainer/trainees/${user.id}`)}
                            className="bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors"
                          >
                            <ExternalLink size={14} />
                            צפה בפרופיל
                          </button>
                        )}
                        <button 
                          onClick={() => setResetModalUser({ id: user.id, name: user.full_name })}
                          className="bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                          <KeyRound size={14} />
                          אפס סיסמה
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">לא נמצאו משתמשים התואמים לחיפוש.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ResetPasswordModal
        isOpen={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        targetUserId={resetModalUser?.id || ''}
        targetUserName={resetModalUser?.name || ''}
      />
    </div>
  );
}
