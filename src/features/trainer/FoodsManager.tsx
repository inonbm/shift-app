import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, AlertCircle, Loader2, Utensils } from 'lucide-react';
import { useFoodStore } from '../../stores/foodStore';
import type { FoodCategory, CreateFoodInput } from '../../types';
import { FOOD_CATEGORY_LABELS } from '../../types';

export function FoodsManager() {
  const { foods, isLoading, error, fetchFoods, createFood, deleteFood } = useFoodStore();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<CreateFoodInput>({
    name: '',
    primary_category: 'protein',
    calories_per_100g: 0,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fats_per_100g: 0
  });

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFood(formData);
    setIsFormOpen(false);
    setFormData({
      name: '',
      primary_category: 'protein',
      calories_per_100g: 0,
      protein_per_100g: 0,
      carbs_per_100g: 0,
      fats_per_100g: 0
    });
  };

  const getCategoryColor = (category: FoodCategory) => {
    switch(category) {
      case 'protein': return 'bg-emerald-100 text-emerald-800';
      case 'carb': return 'bg-blue-100 text-blue-800';
      case 'fat': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
            <Utensils size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">מאגר מזונות</h1>
            <p className="text-sm text-slate-500">ניהול מקורות התזונה במערכת</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isFormOpen ? 'סגור טופס' : <><Plus size={20} /> הוסף מזון חדש</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl space-y-4 border border-slate-700">
          <h2 className="text-lg font-bold border-b border-slate-700 pb-2">הוספת מזון חדש למאגר</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">שם המזון (עברית)</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">מטרה עיקרית</label>
              <select name="primary_category" value={formData.primary_category} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none">
                {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map(c => (
                  <option key={c} value={c}>{FOOD_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">קלוריות (ל-100g)</label>
              <input required type="number" step="0.1" name="calories_per_100g" value={formData.calories_per_100g} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">חלבון (ל-100g)</label>
              <input required type="number" step="0.1" name="protein_per_100g" value={formData.protein_per_100g} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">פחמימה (ל-100g)</label>
              <input required type="number" step="0.1" name="carbs_per_100g" value={formData.carbs_per_100g} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">שומן (ל-100g)</label>
              <input required type="number" step="0.1" name="fats_per_100g" value={formData.fats_per_100g} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={isLoading} className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50">
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'שמור מזון'}
            </button>
          </div>
        </form>
      )}

      {isLoading && !isFormOpen ? (
        <div className="flex justify-center py-10 text-purple-500">
          <Loader2 size={40} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-slate-700 font-sans">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">שם המזון</th>
                  <th className="px-6 py-4 font-bold">קטגוריה</th>
                  <th className="px-6 py-4 font-bold">קלוריות</th>
                  <th className="px-6 py-4 font-bold">חלבון</th>
                  <th className="px-6 py-4 font-bold">פחמימה</th>
                  <th className="px-6 py-4 font-bold">שומן</th>
                  <th className="px-6 py-4 font-bold text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {foods.map(food => (
                  <tr key={food.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{food.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(food.primary_category)}`}>
                        {FOOD_CATEGORY_LABELS[food.primary_category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{food.calories_per_100g}
                      <span className="text-slate-400 text-xs ml-1">kcal</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{food.protein_per_100g}g</td>
                    <td className="px-6 py-4 font-mono text-sm">{food.carbs_per_100g}g</td>
                    <td className="px-6 py-4 font-mono text-sm">{food.fats_per_100g}g</td>
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                      <button className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors" title="עריכה בעתיד">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteFood(food.id)}
                        className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {foods.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                      אין מזונות במסד הנתונים.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
