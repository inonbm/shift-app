import { useState, useEffect } from 'react';

import { Search, Loader2, AlertCircle, Edit2, Trash2, Plus, Apple, Save, X } from 'lucide-react';
import { useFoodStore } from '../../stores/foodStore';
import { useAuthStore } from '../../stores/authStore';
import { FOOD_CATEGORY_LABELS } from '../../types';
import type { Food, FoodCategory } from '../../types';

export function FoodsManager() {
  const { profile } = useAuthStore();
  const { foods, isLoading, error, fetchFoods, deleteFood } = useFoodStore();
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const filteredFoods = foods.filter(f => 
    f.name.includes(search)
  ).sort((a, b) => a.name.localeCompare(b.name, 'he'));

  const handleDelete = async (food: Food) => {
    if (!profile) return;
    
    // Authorization check
    if (profile.role !== 'admin' && food.created_by !== profile.id) {
      alert('אינך מורשה למחוק מאכל זה. ניתן למחוק רק מאכלים שאתה יצרת.');
      return;
    }

    const isConfirmed = window.confirm(`האם אתה בטוח שברצונך למחוק את המאכל "${food.name}"?`);
    if (!isConfirmed) return;

    try {
      await deleteFood(food.id, food.created_by, profile.id, profile.role);
    } catch (err) {
      // Error is handled in store
    }
  };

  const openCreateModal = () => {
    setEditingFood(null);
    setIsModalOpen(true);
  };

  const openEditModal = (food: Food) => {
    if (!profile) return;
    if (profile.role !== 'admin' && food.created_by !== profile.id) {
      alert('אינך מורשה לערוך מאכל זה. ניתן לערוך רק מאכלים שאתה יצרת.');
      return;
    }
    setEditingFood(food);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
            <Apple size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ניהול מאגר מזון</h1>
            <p className="text-slate-500">הוספה, עריכה ומחיקה של ערכים תזונתיים.</p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
        >
          <Plus size={18} />
          הוסף מאכל חדש
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="חיפוש מאכל..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400 transition-shadow"
            />
          </div>
          <div className="text-sm font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            סה״כ: {foods.length} מאכלים
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12 text-emerald-500">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="py-3 px-4 font-bold">שם המאכל</th>
                  <th className="py-3 px-4 font-bold hidden sm:table-cell">קטגוריה</th>
                  <th className="py-3 px-4 font-bold">כמות (גרם)</th>
                  <th className="py-3 px-4 font-bold">קלוריות</th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">חלבון <span className="text-xs text-slate-400">(g)</span></th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">פחמימה <span className="text-xs text-slate-400">(g)</span></th>
                  <th className="py-3 px-4 font-bold whitespace-nowrap">שומן <span className="text-xs text-slate-400">(g)</span></th>
                  <th className="py-3 px-4 font-bold text-left">פעולות</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredFoods.map(food => {
                  const canManage = profile?.role === 'admin' || food.created_by === profile?.id;
                  
                  return (
                    <tr key={food.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {food.name}
                        {!canManage && (
                          <span className="block text-xs font-normal text-slate-400 mt-0.5">מאכל גלובלי/של יצרן אחר</span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                          {FOOD_CATEGORY_LABELS[food.primary_category] || food.primary_category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{food.serving_size || 100}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">{food.calories_per_100g}</td>
                      <td className="py-3 px-4 font-mono">{food.protein_per_100g}</td>
                      <td className="py-3 px-4 font-mono">{food.carbs_per_100g}</td>
                      <td className="py-3 px-4 font-mono">{food.fats_per_100g}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(food)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                              canManage 
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed hidden sm:flex'
                            }`}
                            disabled={!canManage}
                            title={!canManage ? "אין לך הרשאה לערוך מאכל זה" : ""}
                          >
                            <Edit2 size={14} />
                            <span className="hidden sm:inline">ערוך</span>
                          </button>
                          {canManage && (
                            <button 
                              onClick={() => handleDelete(food)}
                              className="bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors"
                            >
                              <Trash2 size={14} />
                              <span className="hidden sm:inline">מחק</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredFoods.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">לא נמצאו מאכלים.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FoodModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        food={editingFood}
      />
    </div>
  );
}

// ─── Modal Component ──────────────────────────────────────────────────────────

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  food: Food | null;
}

function FoodModal({ isOpen, onClose, food }: FoodModalProps) {
  const { createFood, updateFood } = useFoodStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    primary_category: 'protein' as FoodCategory,
    serving_size: 100,
    calories_per_100g: 0,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fats_per_100g: 0,
  });

  useEffect(() => {
    if (isOpen) {
      if (food) {
        setFormData({
          name: food.name,
          primary_category: food.primary_category,
          serving_size: food.serving_size || 100,
          calories_per_100g: food.calories_per_100g,
          protein_per_100g: food.protein_per_100g,
          carbs_per_100g: food.carbs_per_100g,
          fats_per_100g: food.fats_per_100g,
        });
      } else {
        setFormData({
          name: '',
          primary_category: 'protein',
          serving_size: 100,
          calories_per_100g: 0,
          protein_per_100g: 0,
          carbs_per_100g: 0,
          fats_per_100g: 0,
        });
      }
      setError(null);
    }
  }, [isOpen, food]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (type === 'number' && name !== 'name') ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.name.trim()) {
      setError('חובה להזין את שם המאכל');
      return;
    }

    setIsSubmitting(true);
    try {
      if (food) {
        await updateFood(food.id, formData);
      } else {
        await createFood(formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה בשמירת המאכל');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Apple size={20} className="text-emerald-500" />
            {food ? 'עריכת מאכל' : 'הוספת מאכל חדש'}
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-100">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">שם המאכל</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="למשל: חזה עוף (לפני בישול)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">קטגוריה</label>
              <select
                name="primary_category"
                value={formData.primary_category}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map(cat => (
                  <option key={cat} value={cat}>{FOOD_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">כמות ייחוס (גרם)</label>
              <input
                type="number"
                name="serving_size"
                min="1"
                required
                value={formData.serving_size}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                dir="ltr"
              />
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
              <h3 className="text-sm font-bold text-slate-700 mb-3 block text-center bg-emerald-50 text-emerald-700 py-1.5 rounded-lg border border-emerald-100">
                ערכים תזונתיים ל-{formData.serving_size || 100} גרם
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">קלוריות (kcal)</label>
                  <input
                    type="number"
                    name="calories_per_100g"
                    min="0"
                    step="0.1"
                    required
                    value={formData.calories_per_100g}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">חלבון (g)</label>
                  <input
                    type="number"
                    name="protein_per_100g"
                    min="0"
                    step="0.1"
                    required
                    value={formData.protein_per_100g}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">פחמימות (g)</label>
                  <input
                    type="number"
                    name="carbs_per_100g"
                    min="0"
                    step="0.1"
                    required
                    value={formData.carbs_per_100g}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">שומן (g)</label>
                  <input
                    type="number"
                    name="fats_per_100g"
                    min="0"
                    step="0.1"
                    required
                    value={formData.fats_per_100g}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl font-bold transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {food ? 'שמור שינויים' : 'הוסף למאגר'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
