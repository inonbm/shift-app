import { supabase } from './supabase';

interface IngredientData {
  name: string;
  grams: number;
}

export async function generateRecipeWithAI(ingredients: IngredientData[]): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-recipe', {
      body: { ingredients }
    });

    if (error) {
      console.error('Supabase Edge Function Error:', error);
      throw new Error(`שגיאה בתקשורת עם השרת: ${error.message}`);
    }

    if (!data || !data.recipe) {
      throw new Error('לא התקבל מתכון תקין מהשרת.');
    }

    return data.recipe;
  } catch (error) {
    console.error('AI Generation failed:', error);
    throw error;
  }
}
