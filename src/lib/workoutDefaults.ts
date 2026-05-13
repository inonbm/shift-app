import { supabase } from './supabase';
import type { Gender } from '../types';

export interface DefaultExercise {
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  focus_area?: string;
}

export interface DefaultProgram {
  name: string;
  exercises: DefaultExercise[];
}

export const FULL_BODY_WOMEN: DefaultProgram = {
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

export const FULL_BODY_MEN: DefaultProgram = {
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

export const AB_MEN_ADVANCED_A: DefaultProgram = {
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

export const AB_MEN_ADVANCED_B: DefaultProgram = {
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

export async function assignDefaultWorkoutTemplate(
  traineeId: string,
  trainerId: string,
  gender: Gender,
  isAdvanced: boolean,
  isAvailable: boolean
) {
  let programsToAssign: DefaultProgram[] = [];

  if (gender === 'female') {
    programsToAssign.push(FULL_BODY_WOMEN);
  } else {
    if (isAdvanced && isAvailable) {
      programsToAssign.push(AB_MEN_ADVANCED_A, AB_MEN_ADVANCED_B);
    } else {
      programsToAssign.push(FULL_BODY_MEN);
    }
  }

  for (const program of programsToAssign) {
    // 1. Create Template
    const { data: templateData, error: templateError } = await supabase
      .from('workout_templates')
      .insert({
        name: program.name,
        trainer_id: trainerId,
        trainee_id: traineeId
      })
      .select('id')
      .single();

    if (templateError) {
      console.error('Failed to create default workout template [FULL]:', JSON.stringify(templateError, null, 2));
      throw templateError;
    }

    // 2. Create Exercises
    const exercisesToInsert = program.exercises.map((ex, index) => ({
      template_id: templateData.id,
      exercise_name: ex.exercise_name,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
      focus_area: ex.focus_area || null,
      order_index: index
    }));

    const { error: exercisesError } = await supabase
      .from('template_exercises')
      .insert(exercisesToInsert);

    if (exercisesError) {
      console.error('Failed to insert default template exercises [FULL]:', JSON.stringify(exercisesError, null, 2));
      throw exercisesError;
    }
  }
}
