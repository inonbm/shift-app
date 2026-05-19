import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Goal = 'cut' | 'bulk' | 'maintenance';

interface CreateTraineeInput {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  gender: Gender;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  goal: Goal;
  is_busy_lifestyle?: boolean;
  is_advanced?: boolean;
  is_available_4_plus_days?: boolean;
  protein_factor?: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_ADJUSTMENTS: Record<Goal, number> = {
  cut: -500,
  bulk: 300,
  maintenance: 0,
};


interface DefaultExercise {
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  focus_area?: string;
}

interface DefaultProgram {
  name: string;
  exercises: DefaultExercise[];
}

const FULL_BODY_WOMEN: DefaultProgram = {
  name: 'נשים - פול באדי',
  exercises: [
    // Legs
    { focus_area: 'רגליים', exercise_name: 'סקוואט בסמית', target_sets: 3, target_reps: 12 },
    { focus_area: 'רגליים', exercise_name: 'כפיפת ברכיים- המסטרינג', target_sets: 3, target_reps: 12 },
    { focus_area: 'רגליים', exercise_name: 'מקרבי ירך', target_sets: 3, target_reps: 15 },
    
    // Glutes
    { focus_area: 'ישבן', exercise_name: 'היפ טראסט', target_sets: 4, target_reps: 10 },
    { focus_area: 'ישבן', exercise_name: 'מרחיקי ירך', target_sets: 3, target_reps: 15 },
    { focus_area: 'ישבן', exercise_name: 'קיק בק בכבל/מכונה', target_sets: 3, target_reps: 15 },
    
    // Upper Body
    { focus_area: 'פלג גוף עליון- חיזוק', exercise_name: 'חתירה רחבה בפולי', target_sets: 3, target_reps: 12 },
    { focus_area: 'פלג גוף עליון- חיזוק', exercise_name: 'לחיצת חזה עם דאמבלים', target_sets: 3, target_reps: 12 },
    { focus_area: 'פלג גוף עליון- חיזוק', exercise_name: 'פשיטת מרפקים כנגד פולי', target_sets: 3, target_reps: 15 },
    
    // Abs
    { focus_area: 'בטן', exercise_name: 'כפיפת בטן על בוסו', target_sets: 3, target_reps: 20 },
  ]
};

const FULL_BODY_MEN: DefaultProgram = {
  name: 'גברים - פול באדי',
  exercises: [
    // Lower Body
    { focus_area: 'פלג גוף תחתון', exercise_name: 'סקוואט בסמית', target_sets: 3, target_reps: 10 },
    { focus_area: 'פלג גוף תחתון', exercise_name: 'כפיפת ברכיים- המסטרינג', target_sets: 3, target_reps: 12 },
    { focus_area: 'פלג גוף תחתון', exercise_name: 'פשיטת ברכיים- קוואד', target_sets: 3, target_reps: 12 },
    { focus_area: 'פלג גוף תחתון', exercise_name: 'לאנג\'ים בהליכה', target_sets: 3, target_reps: 20 },
    
    // Upper Body
    { focus_area: 'פלג גוף עליון', exercise_name: 'הרחקת כתף צידית עם דאמבלים', target_sets: 3, target_reps: 15 },
    { focus_area: 'פלג גוף עליון', exercise_name: 'הרחקת כתף צידית בכבל/פולי', target_sets: 3, target_reps: 15 },
    { focus_area: 'פלג גוף עליון', exercise_name: 'כפיפת מרפקים על ספסל בשיפוע', target_sets: 3, target_reps: 12 },
    { focus_area: 'פלג גוף עליון', exercise_name: 'פטישים עם דאמבלים', target_sets: 3, target_reps: 12 },
    { focus_area: 'פלג גוף עליון', exercise_name: 'פשיטת מרפקים כנגד פולי', target_sets: 3, target_reps: 15 },

    // Core
    { focus_area: 'בטן', exercise_name: 'כפיפות בטן על בוסו', target_sets: 3, target_reps: 20 },
    { focus_area: 'בטן', exercise_name: 'דראגון פלאג', target_sets: 3, target_reps: 10 },
    { focus_area: 'בטן', exercise_name: 'כפיפות בטן בספסל בשיפוע שלילי', target_sets: 3, target_reps: 15 },

    // Chest + Back
    { focus_area: 'חזה+גב', exercise_name: 'לחיצת חזה עם דאמבלים', target_sets: 3, target_reps: 10 },
    { focus_area: 'חזה+גב', exercise_name: 'פרפר בכבלים/כנגד פולי', target_sets: 3, target_reps: 15 },
    { focus_area: 'חזה+גב', exercise_name: 'פול-דאון אחיזה צרה', target_sets: 3, target_reps: 10 },
    { focus_area: 'חזה+גב', exercise_name: 'חתירה באחיזה צרה בפולי', target_sets: 3, target_reps: 12 },
  ]
};

const AB_MEN_ADVANCED_A: DefaultProgram = {
  name: 'AB גברים (מתקדמים) - אימון A',
  exercises: [
    // Chest
    { focus_area: 'חזה', exercise_name: 'לחיצת חזה עם דאמבלים', target_sets: 3, target_reps: 10 },
    { focus_area: 'חזה', exercise_name: 'לחיצת חזה בשיפוע חיובי עם דאמבלים', target_sets: 3, target_reps: 10 },
    { focus_area: 'חזה', exercise_name: 'פרפר בכבלים/כנגד פולי', target_sets: 3, target_reps: 15 },

    // Legs (Quads focus)
    { focus_area: 'רגליים דגש קוואדס', exercise_name: 'סקוואט בסמית', target_sets: 3, target_reps: 10 },
    { focus_area: 'רגליים דגש קוואדס', exercise_name: 'פשיטת ברכיים- קוואד', target_sets: 3, target_reps: 12 },
    { focus_area: 'רגליים דגש קוואדס', exercise_name: 'תאומים במכונה/בסמית', target_sets: 3, target_reps: 15 },

    // Biceps & Shoulders
    { focus_area: 'יד קדמית+ כתף אמצעית+עליונה', exercise_name: 'כפיפת מרפקים על ספסל בשיפוע', target_sets: 3, target_reps: 12 },
    { focus_area: 'יד קדמית+ כתף אמצעית+עליונה', exercise_name: 'פטישים עם דאמבלים', target_sets: 3, target_reps: 12 },
    { focus_area: 'יד קדמית+ כתף אמצעית+עליונה', exercise_name: 'לחיצת כתפיים עם דאמבלים/במכונה', target_sets: 3, target_reps: 10 },
    { focus_area: 'יד קדמית+ כתף אמצעית+עליונה', exercise_name: 'הרחקת כתף צידית עם דאמבלים', target_sets: 3, target_reps: 15 },

    // Abs
    { focus_area: 'בטן', exercise_name: 'כפיפות בטן על בוסו', target_sets: 3, target_reps: 20 },
    { focus_area: 'בטן', exercise_name: 'כפיפות בטן בספסל בשיפוע שלילי', target_sets: 3, target_reps: 15 },
  ]
};

const AB_MEN_ADVANCED_B: DefaultProgram = {
  name: 'AB גברים (מתקדמים) - אימון B',
  exercises: [
    // Back
    { focus_area: 'גב', exercise_name: 'פול-דאון אחיזה צרה', target_sets: 3, target_reps: 10 },
    { focus_area: 'גב', exercise_name: 'חתירה באחיזה צרה בפולי', target_sets: 3, target_reps: 12 },

    // Legs (Hamstrings/Glutes focus)
    { focus_area: 'רגליים (דגש המסטרינג/ישבן)', exercise_name: 'לאנג\'ים בהליכה', target_sets: 3, target_reps: 20 },
    { focus_area: 'רגליים (דגש המסטרינג/ישבן)', exercise_name: 'כפיפת ברכיים- המסטרינג', target_sets: 3, target_reps: 12 },
    { focus_area: 'רגליים (דגש המסטרינג/ישבן)', exercise_name: 'מקרבים', target_sets: 3, target_reps: 15 },

    // Rear Delts & Triceps
    { focus_area: 'כתף אחורית+ יד אחורית', exercise_name: 'כתף אחורית כנגד פולי/במכונה', target_sets: 3, target_reps: 15 },
    { focus_area: 'כתף אחורית+ יד אחורית', exercise_name: 'פשיטת מרפקים כנגד פולי', target_sets: 3, target_reps: 15 },
    { focus_area: 'כתף אחורית+ יד אחורית', exercise_name: 'פשיטת מרפקים מאחורי הראש עם מוט V', target_sets: 3, target_reps: 12 },

    // Abs
    { focus_area: 'בטן', exercise_name: 'כפיפות בטן על בוסו', target_sets: 3, target_reps: 20 },
    { focus_area: 'בטן', exercise_name: 'כפיפות בטן בספסל בשיפוע שלילי', target_sets: 3, target_reps: 15 },
  ]
};


function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getErrorMessage(error: unknown, fallback = 'Unknown error') {
  return error instanceof Error ? error.message : fallback;
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server environment missing ${name}`);
  return value;
}

function validateInput(input: Partial<CreateTraineeInput>): asserts input is CreateTraineeInput {
  const requiredStringFields: Array<keyof CreateTraineeInput> = ['email', 'password', 'full_name'];
  for (const field of requiredStringFields) {
    if (typeof input[field] !== 'string' || !String(input[field]).trim()) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!['male', 'female'].includes(String(input.gender))) throw new Error('Invalid gender');
  if (!['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(String(input.activity_level))) {
    throw new Error('Invalid activity_level');
  }
  if (!['cut', 'bulk', 'maintenance'].includes(String(input.goal))) throw new Error('Invalid goal');

  const positiveNumbers: Array<keyof CreateTraineeInput> = ['age', 'weight_kg', 'height_cm'];
  for (const field of positiveNumbers) {
    const value = input[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid numeric field: ${field}`);
    }
  }

  if (input.age >= 120) throw new Error('Invalid age');
  if (input.protein_factor !== undefined && (typeof input.protein_factor !== 'number' || input.protein_factor <= 0)) {
    throw new Error('Invalid protein_factor');
  }
}

function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number) {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0;
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return gender === 'male' ? base + 5 : base - 161;
}

function calculateTDEE(bmr: number, activityLevel: ActivityLevel) {
  if (bmr <= 0) return 0;
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

function calculateTargetCalories(tdee: number, goal: Goal) {
  if (tdee <= 0) return 0;
  return tdee + GOAL_CALORIE_ADJUSTMENTS[goal];
}

function calculateMacros(weightKg: number, targetCalories: number, proteinFactor = 2.0) {
  if (weightKg <= 0 || targetCalories <= 0) {
    return { proteinGrams: 0, fatGrams: 0, carbsGrams: 0 };
  }
  const proteinGrams = Math.round(weightKg * proteinFactor);
  const fatGrams = Math.round(weightKg * 1.0);
  const remainingCalories = targetCalories - (proteinGrams * 4) - (fatGrams * 9);
  const carbsGrams = remainingCalories > 0 ? Math.round(remainingCalories / 4) : 0;
  return { proteinGrams, fatGrams, carbsGrams };
}

function getDefaultPrograms(gender: Gender, isAdvanced: boolean, isAvailable: boolean) {
  if (gender === 'female') return [FULL_BODY_WOMEN];
  if (isAdvanced && isAvailable) return [AB_MEN_ADVANCED_A, AB_MEN_ADVANCED_B];
  return [FULL_BODY_MEN];
}

async function assignDefaultWorkoutTemplate(
  // Service-role Supabase client; Edge Function runtime typing does not include generated DB types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  traineeId: string,
  trainerId: string,
  gender: Gender,
  isAdvanced: boolean,
  isAvailable: boolean,
) {
  const programsToAssign = getDefaultPrograms(gender, isAdvanced, isAvailable);

  for (const program of programsToAssign) {
    const { data: templateData, error: templateError } = await supabaseAdmin
      .from('workout_templates')
      .insert({
        name: program.name,
        trainer_id: trainerId,
        trainee_id: traineeId,
      })
      .select('id')
      .single();

    if (templateError || !templateData) {
      throw new Error(`Failed to create workout template: ${templateError?.message ?? 'missing template id'}`);
    }

    const exercisesToInsert = program.exercises.map((exercise, index) => ({
      template_id: templateData.id,
      exercise_name: exercise.exercise_name,
      target_sets: exercise.target_sets,
      target_reps: exercise.target_reps,
      focus_area: exercise.focus_area || null,
      order_index: index,
    }));

    const { error: exercisesError } = await supabaseAdmin
      .from('template_exercises')
      .insert(exercisesToInsert);

    if (exercisesError) {
      throw new Error(`Failed to create workout exercises: ${exercisesError.message}`);
    }
  }
}

// Service-role Supabase client; Edge Function runtime typing does not include generated DB types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rollbackCreatedTrainee(supabaseAdmin: any, traineeId: string | null) {
  if (!traineeId) return;

  const { error: profileDeleteError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', traineeId);

  if (profileDeleteError) {
    console.error('create-trainee rollback profile deletion failed:', profileDeleteError.message);
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(traineeId);
  if (authDeleteError) {
    console.error('create-trainee rollback auth deletion failed:', authDeleteError.message);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let createdTraineeId: string | null = null;
  // Service-role Supabase client; Edge Function runtime typing does not include generated DB types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseAdmin: any | null = null;

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const input = await req.json() as Partial<CreateTraineeInput>;
    validateInput(input);

    const { data: { user: currentUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !currentUser) return jsonResponse({ error: 'Not authenticated' }, 401);

    const { data: callerProfile, error: callerProfileError } = await callerClient
      .from('profiles')
      .select('id, role')
      .eq('id', currentUser.id)
      .single();

    if (callerProfileError || !callerProfile) throw new Error('Could not identify caller profile');
    if (!['trainer', 'admin'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'Unauthorized. Only trainers or admins can create trainees.' }, 403);
    }

    const trainerId = callerProfile.id;
    const { data: newUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email.trim(),
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name.trim(),
        role: 'trainee',
      },
    });

    if (createUserError) throw createUserError;
    if (!newUserData.user) throw new Error('Failed to create user account');

    createdTraineeId = newUserData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: createdTraineeId,
        email: input.email.trim(),
        full_name: input.full_name.trim(),
        role: 'trainee',
        trainer_id: trainerId,
        phone_number: input.phone_number || null,
      }, { onConflict: 'id' });

    if (profileError) throw new Error(`Failed to create trainee profile: ${profileError.message}`);

    const bmr = calculateBMR(input.gender, input.weight_kg, input.height_cm, input.age);
    const tdee = calculateTDEE(bmr, input.activity_level);
    const goalCalories = calculateTargetCalories(tdee, input.goal);
    const proteinFactor = input.protein_factor || 2.0;
    const macros = calculateMacros(input.weight_kg, Math.max(0, goalCalories), proteinFactor);

    const traineeData = {
      id: createdTraineeId,
      gender: input.gender,
      age: input.age,
      weight_kg: input.weight_kg,
      height_cm: input.height_cm,
      activity_level: input.activity_level,
      goal: input.goal,
      is_busy_lifestyle: input.is_busy_lifestyle ?? false,
      bmr,
      tdee,
      goal_calories: goalCalories,
      protein_grams: macros.proteinGrams,
      carbs_grams: macros.carbsGrams,
      fat_grams: macros.fatGrams,
      is_advanced: input.is_advanced ?? false,
      is_available_4_plus_days: input.is_available_4_plus_days ?? false,
      protein_factor: proteinFactor,
      updated_at: new Date().toISOString(),
    };

    const { error: traineeDataError } = await supabaseAdmin
      .from('trainee_data')
      .insert(traineeData);

    if (traineeDataError) throw new Error(`Failed to create trainee data: ${traineeDataError.message}`);

    await assignDefaultWorkoutTemplate(
      supabaseAdmin,
      createdTraineeId,
      trainerId,
      input.gender,
      input.is_advanced ?? false,
      input.is_available_4_plus_days ?? false,
    );

    return jsonResponse({
      success: true,
      trainee: {
        id: createdTraineeId,
        email: input.email.trim(),
        full_name: input.full_name.trim(),
        role: 'trainee',
        trainer_id: trainerId,
        phone_number: input.phone_number || null,
        trainee_data: traineeData,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error, 'Failed to create trainee');

    if (createdTraineeId && supabaseAdmin) {
      await rollbackCreatedTrainee(supabaseAdmin, createdTraineeId);
    }

    console.error('create-trainee failed:', message);
    return jsonResponse({ error: message }, 400);
  }
});
