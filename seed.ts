import { db } from './src/db/index';
import { exercises } from './src/db/schema';

const initialExercises = [
  {
    title: 'Neck Rotations',
    description: 'Slow, controlled circular movements of the neck to improve mobility.',
    targetMuscle: 'Neck',
    equipmentNeeded: ['None'],
    difficulty: 'beginner'
  },
  {
    title: 'Cat-Cow Stretch',
    description: 'A yoga transition between two poses that warms up the spine.',
    targetMuscle: 'Back',
    equipmentNeeded: ['Mat'],
    difficulty: 'beginner'
  },
  {
    title: 'Deadbeat Squats',
    description: 'Foundational lower body movement focusing on glutes and quads.',
    targetMuscle: 'Legs',
    equipmentNeeded: ['Dumbbells'],
    difficulty: 'beginner'
  },
  {
    title: 'Plank Hold',
    description: 'Isometric core strength exercise that involves maintaining a push-up position.',
    targetMuscle: 'Core',
    equipmentNeeded: ['Mat'],
    difficulty: 'intermediate'
  },
  {
    title: 'Push-Ups',
    description: 'Classic upper body exercise for chest, shoulders, and triceps.',
    targetMuscle: 'Chest',
    equipmentNeeded: ['None'],
    difficulty: 'beginner'
  }
];

async function seed() {
  console.log('🌱 Seeding Exercise Library...');
  try {
    for (const ex of initialExercises) {
      await db.insert(exercises).values(ex as any).onConflictDoNothing();
    }
    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
