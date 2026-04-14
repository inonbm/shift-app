import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <Header />
      
      <main className="flex-1 pb-12 w-full max-w-4xl mx-auto px-4 pt-6">
        <Outlet />
      </main>

      <footer className="py-6 text-center text-slate-400 text-xs">
        <p>SHIFT — שינוי אמיתי מבפנים החוצה</p>
      </footer>
    </div>
  );
}
