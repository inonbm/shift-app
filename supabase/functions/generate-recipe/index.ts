import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ingredients } = await req.json();
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error('Ingredients list is required');
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Server configuration error: GEMINI_API_KEY is missing');
    }

    // Build the prompt
    let ingredientText = ingredients.map((i: any) => `- ${i.grams} גרם של ${i.name}`).join('\n');
    
    const prompt = `
You are an expert fitness chef. Create a short, healthy, and easy-to-make recipe using EXACTLY the following primary ingredients:
${ingredientText}

You may use basic zero-calorie pantry staples like salt, pepper, herbs, non-stick spray, or a splash of lemon.
Return the recipe in HEBREW ONLY. Format it cleanly with Markdown (use bold titles, and bullet points for instructions). 
Do not include calorie math, just the recipe title, a short motivating intro, ingredients list, and instructions.
Keep it concise and motivating!
`;

    // Call Gemini API directly from Edge Function
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini API Error:', data);
      throw new Error('Failed to generate recipe from AI service');
    }

    const markdownOutput = data.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({ recipe: markdownOutput }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})
