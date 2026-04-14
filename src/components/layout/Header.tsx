import { Activity, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function Header() {
  const { user, profile, signOut } = useAuthStore();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Activity className="text-emerald-500" size={28} strokeWidth={2.5} />
          <h1 className="text-2xl font-extrabold text-[#4A235A] tracking-wider mt-1">SHIFT</h1>
        </div>

        {/* User Actions */}
        {user && profile && (
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-slate-500">
              שלום, <strong className="text-slate-800">{profile.full_name}</strong>
              <span className="mx-2">|</span>
              <span className="text-emerald-600 font-medium">
                {profile.role === 'trainer' ? 'מאמן' : 'מתאמן'}
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
