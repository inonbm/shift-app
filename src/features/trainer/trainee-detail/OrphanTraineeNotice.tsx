import { AlertCircle } from 'lucide-react';

export function OrphanTraineeNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-sm mt-8">
      <AlertCircle size={48} className="text-amber-500 mx-auto" />
      <h2 className="text-xl font-bold text-amber-800">נתוני מתאמן חסרים (Orphan Record)</h2>
      <p className="text-amber-700 max-w-md mx-auto">
        נוצרה שגיאה בתהליך הרישום של מתאמן זה (ככל הנראה תקלה ברשת או הגדרות חסרות) וחלק מהנתונים שלו חסרים. אי אפשר להציג את הפרופיל כראוי.
        <br/><br/>
        <strong>אנא מחק מתאמן זה (באמצעות כפתור הפח למעלה) ונסה ליצור אותו מחדש.</strong>
      </p>
    </div>
  );
}
