import { Link, useLocation } from 'react-router-dom';
import { Activity, LogOut, Utensils, Dumbbell, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function Header() {
  const { user, profile, signOut } = useAuthStore();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Activity className="text-emerald-500" size={28} strokeWidth={2.5} />
          <h1 className="text-2xl font-extrabold text-[#4A235A] tracking-wider mt-1">SHIFT</h1>
        </div>

        {/* Trainee Navigation Links */}
        {profile?.role === 'trainee' && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <Link 
              to="/diet" 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive('/diet') ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Utensils size={18} />
              תזונה
            </Link>
            <Link 
              to="/workouts" 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isActive('/workouts') ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Dumbbell size={18} />
              אימונים
            </Link>
          </div>
        )}

        {/* User Actions */}
        {user && profile && (
          <div className="flex items-center gap-4">
            {profile.role === 'admin' && (
              <Link 
                to="/admin"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors mr-2"
              >
                <ShieldAlert size={16} />
                ניהול מערכת
              </Link>
            )}

            <div className="hidden md:block text-sm text-slate-500">
              שלום, <strong className="text-slate-800">{profile.full_name}</strong>
              <span className="mx-2">|</span>
              <span className={`font-medium ${profile.role === 'admin' ? 'text-red-600' : 'text-emerald-600'}`}>
                {profile.role === 'trainer' ? 'מאמן' : profile.role === 'admin' ? 'מנהל ראשי' : 'מתאמן'}
              </span>
            </div>
            
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="התנתק"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
