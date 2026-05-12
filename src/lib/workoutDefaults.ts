import { supabase } from './supabase';
import type { Gender } from '../types';

export interface DefaultExercise {
  exercise_name: string;
  target_sets: number;
  target_reps: number;
}

export interface DefaultProgram {
  name: string;
  exercises: DefaultExercise[];
}

export const FULL_BODY_WOMEN: DefaultProgram = {
  name: 'Full Body Women',
  exercises: [
    { exercise_name: 'Squat', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Leg Curl', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Adductors', target_sets: 3, target_reps: 15 },
    { exercise_name: 'Hip Thrust', target_sets: 4, target_reps: 10 },
    { exercise_name: 'Abductors', target_sets: 3, target_reps: 15 },
    { exercise_name: 'Kickback', target_sets: 3, target_reps: 15 },
    { exercise_name: 'Row', target_sets: 3, target_reps: 12 },
    { exercise_name: 'DB Press', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Tricep Pushdown', target_sets: 3, target_reps: 15 },
    { exercise_name: 'Bosu Crunches', target_sets: 3, target_reps: 20 },
  ]
};

export const FULL_BODY_MEN: DefaultProgram = {
  name: 'Full Body Men',
  exercises: [
    { exercise_name: 'Squat', target_sets: 3, target_reps: 10 },
    { exercise_name: 'Leg Curl', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Leg Extension', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Walking Lunges', target_sets: 3, target_reps: 20 },
    { exercise_name: 'DB Press', target_sets: 3, target_reps: 10 },
    { exercise_name: 'Cable Fly', target_sets: 3, target_reps: 15 },
    { exercise_name: 'Neutral Pulldown', target_sets: 3, target_reps: 10 },
    { exercise_name: 'Neutral Row', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Lateral Raises', target_sets: 3, target_reps: 15 },
    { exercise_name: 'Incline Curl', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Hammer Curl', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Tricep Pushdown', target_sets: 3, target_reps: 15 },
    { exercise_name: 'Bosu Crunches', target_sets: 3, target_reps: 20 },
    { exercise_name: 'Dragon Flags', target_sets: 3, target_reps: 10 },
    { exercise_name: 'Incline Leg Raises', target_sets: 3, target_reps: 15 },
  ]
};

export const AB_MEN_ADVANCED_A: DefaultProgram = {
  name: 'AB Men (Advanced) - Workout A',
  exercises: [
    { exercise_name: 'Bench Press', target_sets: 4, target_reps: 8 },
    { exercise_name: 'Incline DB Press', target_sets: 3, target_reps: 10 },
    { exercise_name: 'Squat', target_sets: 4, target_reps: 8 },
    { exercise_name: 'Leg Extension', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Barbell Curl', target_sets: 3, target_reps: 10 },
    { exercise_name: 'Lateral Raises', target_sets: 4, target_reps: 15 },
  ]
};

export const AB_MEN_ADVANCED_B: DefaultProgram = {
  name: 'AB Men (Advanced) - Workout B',
  exercises: [
    { exercise_name: 'Pull-ups', target_sets: 4, target_reps: 8 },
    { exercise_name: 'Barbell Row', target_sets: 3, target_reps: 10 },
    { exercise_name: 'Romanian Deadlift', target_sets: 4, target_reps: 8 },
    { exercise_name: 'Lying Leg Curl', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Tricep Extension', target_sets: 3, target_reps: 12 },
    { exercise_name: 'Calf Raises', target_sets: 4, target_reps: 15 },
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
      console.error('Failed to create default workout template:', templateError);
      throw templateError;
    }

    // 2. Create Exercises
    const exercisesToInsert = program.exercises.map((ex, index) => ({
      template_id: templateData.id,
      exercise_name: ex.exercise_name,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
      order_index: index
    }));

    const { error: exercisesError } = await supabase
      .from('template_exercises')
      .insert(exercisesToInsert);

    if (exercisesError) {
      console.error('Failed to insert default template exercises:', exercisesError);
      throw exercisesError;
    }
  }
}
