import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Utensils, Dumbbell, ShieldAlert, Apple, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import shiftLogo from '../../assets/shift-logo.jpeg';

export function Header() {
  const { user, profile, signOut } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img src={shiftLogo} alt="SHIFT" className="h-14 w-auto" />
        </Link>

        {/* Hamburger Menu Toggle (Mobile Only) */}
        {user && profile && (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-emerald-600 focus:outline-none"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        )}

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center flex-1 justify-end gap-4 ml-4">
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
          <div className="hidden md:flex items-center gap-4">
            {(profile.role === 'trainer' || profile.role === 'admin') && (
              <Link 
                to="/trainer/foods"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-colors mr-2"
              >
                <Apple size={16} />
                ניהול מזון
              </Link>
            )}
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
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && user && profile && (
        <div className="md:hidden bg-white border-t border-slate-100 p-4 space-y-4 shadow-lg absolute w-full left-0">
          <div className="text-sm text-slate-500 pb-2 border-b border-slate-100">
            שלום, <strong className="text-slate-800">{profile.full_name}</strong>
            <span className="mx-2">|</span>
            <span className={`font-medium ${profile.role === 'admin' ? 'text-red-600' : 'text-emerald-600'}`}>
              {profile.role === 'trainer' ? 'מאמן' : profile.role === 'admin' ? 'מנהל ראשי' : 'מתאמן'}
            </span>
          </div>

          {profile.role === 'trainee' && (
            <div className="flex flex-col gap-2">
              <Link 
                to="/diet"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isActive('/diet') ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Utensils size={20} /> תזונה
              </Link>
              <Link 
                to="/workouts"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isActive('/workouts') ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Dumbbell size={20} /> אימונים
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            {(profile.role === 'trainer' || profile.role === 'admin') && (
              <Link 
                to="/trainer/foods"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold transition-colors"
              >
                <Apple size={20} /> ניהול מזון
              </Link>
            )}
            {profile.role === 'admin' && (
              <Link 
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold transition-colors"
              >
                <ShieldAlert size={20} /> ניהול מערכת
              </Link>
            )}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut();
              }}
              className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors w-full text-right"
            >
              <LogOut size={20} /> התנתק
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
