// All program data for the block. Edit this file for the next block; no UI code needs to change.

export type SessionType = 'A' | 'B' | 'C'
/** Decides load rounding: barbell 2.5 kg, everything else 1 kg. */
export type Equipment = 'barbell' | 'dumbbell' | 'plate' | 'cable' | 'bodyweight'
export type Measure = 'reps' | 'secs' | 'metres'
export type MainLift = 'squat' | 'deadlift' | 'pullup'

export interface Cues {
  setup: string
  move: string
  avoid: string
}

export interface Exercise {
  id: string
  name: string
  equipment: Equipment
  cues?: Cues
  /** Free Exercise DB id(s). Absent = no good photo, show placeholder + video link. */
  photo?: string
  /** Use only one frame of the photo (dead hang = finish frame of pull-ups). */
  photoFrame?: 0 | 1
  photoNote?: string
  /** A single openly licensed photo from outside Free Exercise DB, credited in the guide. */
  photoFile?: { url: string; credit: string }
  altPhoto?: { id: string; label: string }
}

export interface SessionItem {
  exerciseId: string
  kind: 'main' | 'accessory' | 'mobility'
  /** Ignored for main lifts (sets come from the phase). */
  sets: number
  measure: Measure
  /** Target per set. Ranges use min..max; fixed targets use min = max. */
  min: number
  max: number
  perSide?: boolean
  /** Shows a kg field. Pull-up is loaded only from phase 2 (added weight). */
  loaded: boolean
  restSec: number
  /** Show "Start hold" countdown for the target seconds. */
  hold?: boolean
  dose: string
  note: string
}

export interface WarmupStep {
  name: string
  dose: string
  point: string
  exerciseId?: string
}

export interface MainLiftPrescription {
  sets: number
  min: number
  max: number
  /** Pull-up in phase 1: 3 x max minus 2, no fixed range. */
  maxMinus?: number
}

export interface Phase {
  n: 1 | 2 | 3 | 4
  name: string
  /** Label for narrow places like chart bands. */
  short: string
  /** [month 1-12, day]. Oct to Dec belong to the block start year, Jan to Mar to the next. */
  start: [number, number]
  end: [number, number]
  rir: string
  loadRule: string
  main: Record<MainLift, MainLiftPrescription>
  pullupLoaded: boolean
  /** Hint shown when adding weight. */
  addHint: string
}

export const DEFAULT_BLOCK_START = '2026-10-05'
export const DELOAD_EVERY = 5
/** Length of the block in weeks. After this Today shows the block as complete. */
export const BLOCK_WEEKS = 26
/** Hard squash matches in one week that call for an extra deload week. */
export const HARD_MATCHES_FOR_DELOAD = 2

export const exercises: Record<string, Exercise> = {
  squat: {
    id: 'squat',
    name: 'Back squat',
    equipment: 'barbell',
    photo: 'Barbell_Full_Squat',
    cues: {
      setup:
        'Bar on the upper back, feet shoulder width, toes slightly out. Big breath in, brace the stomach.',
      move: 'Sit down between the hips until they are just below the knees, then drive straight up.',
      avoid: 'Lower back rounding at the bottom, heels lifting, knees caving in.',
    },
  },
  deadlift: {
    id: 'deadlift',
    name: 'Deadlift',
    equipment: 'barbell',
    photo: 'Barbell_Deadlift',
    altPhoto: { id: 'Trap_Bar_Deadlift', label: 'Trap bar' },
    cues: {
      setup:
        'Bar over the middle of the foot, shins touching it, back flat, shoulders just ahead of the bar.',
      move: 'Push the floor away and keep the bar against the legs until you stand tall. Lower it the same way.',
      avoid: 'Rounding the back, yanking the bar off the floor, leaning back at the top.',
    },
  },
  pullup: {
    id: 'pullup',
    name: 'Pull-up',
    equipment: 'barbell',
    photo: 'Pullups',
    cues: {
      setup: 'Full hang, hands just outside the shoulders, legs still.',
      move: 'Drive the elbows down to the ribs until the chin clears the bar. Lower for 2 to 3 seconds.',
      avoid: 'Swinging, half reps, shrugging the shoulders to the ears.',
    },
  },
  backext: {
    id: 'backext',
    name: '45 degree back extension',
    equipment: 'plate',
    photo: 'Hyperextensions_Back_Extensions',
    cues: {
      setup:
        'Pad just below the hip crease so you can fold at the hips. Arms crossed on the chest.',
      move: 'Fold forward with a flat back, then squeeze the glutes to come up to a straight line.',
      avoid: 'Coming up past straight. That last bit is lower back arch, not glutes.',
    },
  },
  chop: {
    id: 'chop',
    name: 'Half kneeling cable chop',
    equipment: 'cable',
    photo: 'Standing_Cable_Wood_Chop',
    photoNote: 'Photo shows it standing. Do it half kneeling.',
    cues: {
      setup:
        'Cable set high, side-on to the machine, both hands on the handle, knee nearest the machine up, the other on the floor.',
      move: 'Pull the handle diagonally down across the body to the opposite hip. Shoulders and hips turn together.',
      avoid: 'Twisting from the lower back, bending the arms to do the work.',
    },
  },
  pallof: {
    id: 'pallof',
    name: 'Pallof press',
    equipment: 'cable',
    photo: 'Pallof_Press',
    cues: {
      setup:
        'Cable at chest height, stand side-on to the machine, handle held at the chest with both hands.',
      move: 'Press straight out in front, hold 2 seconds, bring it back slowly.',
      avoid: 'Letting the cable turn you toward the machine. The whole job is not turning.',
    },
  },
  sideplank: {
    id: 'sideplank',
    name: 'Side plank',
    equipment: 'bodyweight',
    photo: 'Side_Bridge',
    cues: {
      setup: 'On your side, elbow under the shoulder, feet stacked.',
      move: 'Lift the hips until the body is one straight line and hold.',
      avoid: 'Hips sagging or drifting backward.',
    },
  },
  landmine: {
    id: 'landmine',
    name: 'Landmine rotational press',
    equipment: 'plate',
    cues: {
      setup:
        'One end of the bar in a landmine or a corner. Hold the other end at your shoulder, feet shoulder width, body turned slightly away from the bar.',
      move: 'Push off the back foot, turn hips and chest toward the bar, and let the arm finish long.',
      avoid: 'Arching the lower back, pressing with the arm only.',
    },
  },
  dbrow: {
    id: 'dbrow',
    name: 'Single arm dumbbell row',
    equipment: 'dumbbell',
    photo: 'One-Arm_Dumbbell_Row',
    cues: {
      setup:
        'One hand and the same side knee on a bench, back flat, dumbbell hanging straight down.',
      move: 'Pull the elbow up along the ribs toward the hip. Lower under control.',
      avoid: 'Twisting the chest open to lift more weight.',
    },
  },
  suitcase: {
    id: 'suitcase',
    name: 'Suitcase carry',
    equipment: 'dumbbell',
    photo: 'Farmers_Walk',
    photoNote: 'Photo shows two weights. Carry one.',
    cues: {
      setup:
        'Pick the weight up like a deadlift: flat back, legs do the lifting. One dumbbell, one side only.',
      move: 'Walk tall with short, steady steps.',
      avoid: 'Leaning toward or away from the weight. Shoulders stay level.',
    },
  },
  deadbug: {
    id: 'deadbug',
    name: 'Dead bug',
    equipment: 'bodyweight',
    photo: 'Dead_Bug',
    cues: {
      setup:
        'On your back, arms straight up, hips and knees at 90 degrees, lower back pressed into the floor.',
      move: 'Slowly lower one leg and the opposite arm toward the floor, return, switch sides.',
      avoid: 'The lower back lifting off the floor. Shorten the reach if it does.',
    },
  },
  goblet: {
    id: 'goblet',
    name: 'Goblet squat',
    equipment: 'dumbbell',
    photo: 'Goblet_Squat',
    cues: {
      setup: 'Hold one light kettlebell or dumbbell against the chest, elbows down.',
      move: 'Sit down between the knees with the chest tall, pause 3 seconds and let the hips open, stand up.',
      avoid: 'The weight drifting away from the chest, heels lifting.',
    },
  },
  slrdl: {
    id: 'slrdl',
    name: 'Single leg Romanian deadlift',
    equipment: 'dumbbell',
    photo: 'Kettlebell_One-Legged_Deadlift',
    cues: {
      setup: 'Stand on one leg with a soft knee, light weight in the opposite hand.',
      move: 'Push the hips back and let the free leg rise behind you as the weight goes down the shin. Stand back up by squeezing the glute.',
      avoid: 'The hip of the free leg opening to the side, rounding the back to reach lower.',
    },
  },
  deadhang: {
    id: 'deadhang',
    name: 'Dead hang',
    equipment: 'bodyweight',
    photo: 'Pullups',
    photoFrame: 1,
    cues: {
      setup:
        'Grip the bar just outside shoulder width and let the feet leave the floor or the step.',
      move: 'Hang relaxed and breathe slowly. Let the hips and legs go heavy.',
      avoid: 'Dropping off the bar. Step down.',
    },
  },
  hipflexor: {
    id: 'hipflexor',
    name: 'Kneeling hip flexor stretch',
    equipment: 'bodyweight',
    photo: 'Kneeling_Hip_Flexor',
    cues: {
      setup: 'One knee on a mat, other foot well forward, torso tall.',
      move: 'Squeeze the glute of the down leg and ease the hips forward until the front of that hip stretches. Hold.',
      avoid: 'Arching the lower back to get further. The stretch belongs in the hip.',
    },
  },
  figure4: {
    id: 'figure4',
    name: 'Figure four glute stretch',
    equipment: 'bodyweight',
    cues: {
      setup: 'On your back, knees bent. Cross one ankle over the opposite knee.',
      move: 'Pull the uncrossed thigh toward the chest until the glute of the crossed leg stretches. Hold.',
      avoid: 'Lifting the head and shoulders off the floor.',
    },
  },
  hamstring9090: {
    id: 'hamstring9090',
    name: '90/90 hamstring stretch',
    equipment: 'bodyweight',
    photo: '90_90_Hamstring',
    cues: {
      setup:
        'On your back, one leg flat. Hold the other thigh vertical with the knee bent to 90 degrees.',
      move: 'Slowly straighten that knee toward the ceiling, pause 2 seconds, bend it again.',
      avoid: 'The thigh drifting away from vertical, the lower back lifting.',
    },
  },
  openbook: {
    id: 'openbook',
    name: 'Open book',
    equipment: 'bodyweight',
    cues: {
      setup:
        'Lie on your side, knees bent to 90 degrees and stacked, arms straight out in front, palms together.',
      move: 'Lift the top arm up and over to the floor behind you, eyes following the hand. Return slowly.',
      avoid: 'The knees coming apart. They stay stacked so the turn comes from the upper back.',
    },
  },
  childspose: {
    id: 'childspose',
    name: "Child's pose",
    equipment: 'bodyweight',
    photo: 'Childs_Pose',
    cues: {
      setup: 'Kneel, big toes together, knees apart.',
      move: 'Sit back onto the heels and reach the arms long in front, forehead toward the floor. Breathe into the lower back.',
      avoid: 'Forcing the hips down if the knees complain. Put a cushion between heels and hips.',
    },
  },
  catcow: {
    id: 'catcow',
    name: 'Cat-cow',
    equipment: 'bodyweight',
    photo: 'Cat_Stretch',
    cues: {
      setup: 'Hands under shoulders, knees under hips.',
      move: 'Slowly let the back sink and the chest open, then round the whole spine up toward the ceiling.',
      avoid: 'Rushing. Each rep takes about 5 seconds.',
    },
  },
  hip9090: {
    id: 'hip9090',
    name: '90/90 hip switches',
    equipment: 'bodyweight',
    cues: {
      setup: 'Sit on the floor, both knees bent to 90 degrees and dropped to the same side.',
      move: 'Keep the feet planted and rotate both knees over to the other side. Sit tall on each side for a breath.',
      avoid: 'Leaning back on the hands more than you need to.',
    },
  },
  glutebridge: {
    id: 'glutebridge',
    name: 'Glute bridge',
    equipment: 'bodyweight',
    photo: 'Butt_Lift_Bridge',
    cues: {
      setup: 'On your back, knees bent, feet flat and hip width apart.',
      move: 'Push through the heels and lift the hips until shoulder, hip and knee form one line. Squeeze the glutes for 2 seconds.',
      avoid: 'Arching the lower back to get higher.',
    },
  },
  birddog: {
    id: 'birddog',
    name: 'Bird dog',
    equipment: 'bodyweight',
    photoFile: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Girl_doing_bird_dog_yoga_pose.jpg/1280px-Girl_doing_bird_dog_yoga_pose.jpg',
      credit: 'Bird dog: PTPioneer, CC BY 2.0, via Wikimedia Commons',
    },
    cues: {
      setup: 'Hands and knees, back flat like a table.',
      move: 'Reach one arm forward and the opposite leg straight back until both are level with the body. Hold 5 seconds, then switch sides.',
      avoid:
        'The hips tilting or the lower back sagging. Imagine a glass of water on your lower back.',
    },
  },
}

export const warmup: WarmupStep[] = [
  {
    name: 'Easy bike or rower',
    dose: '5 min',
    point: 'Raise body temperature. You can talk the whole time',
  },
  {
    name: 'Cat-cow',
    dose: '8 slow reps',
    point: 'Move the spine segment by segment',
    exerciseId: 'catcow',
  },
  {
    name: '90/90 hip switches',
    dose: '6 per side',
    point: 'Open hip rotation both ways',
    exerciseId: 'hip9090',
  },
  {
    name: 'Open book',
    dose: '6 per side',
    point: 'Upper back turns, lower back stays quiet',
    exerciseId: 'openbook',
  },
  {
    name: 'Glute bridge',
    dose: '2 x 10, 2 s hold',
    point: 'Glutes on before any loaded lift',
    exerciseId: 'glutebridge',
  },
  {
    name: 'Bird dog',
    dose: '2 x 6 per side, 5 s hold',
    point: 'Stable spine while the limbs move',
    exerciseId: 'birddog',
  },
]

const MAIN = { sets: 0, min: 0, max: 0, measure: 'reps' as const, dose: 'Main lift' }

export const sessions: Record<
  SessionType,
  { title: string; subtitle: string; items: SessionItem[] }
> = {
  A: {
    title: 'Session A',
    subtitle: 'Squat, pull, rotate',
    items: [
      {
        ...MAIN,
        exerciseId: 'squat',
        kind: 'main',
        loaded: true,
        restSec: 150,
        note: 'Depth you own with a flat back',
      },
      {
        ...MAIN,
        exerciseId: 'pullup',
        kind: 'main',
        loaded: true,
        restSec: 120,
        note: 'Under 5 strict reps: band assisted or lat pulldown 3 x 8',
      },
      {
        exerciseId: 'backext',
        kind: 'accessory',
        sets: 3,
        measure: 'reps',
        min: 12,
        max: 12,
        loaded: true,
        restSec: 60,
        dose: '3 x 12',
        note: 'Hold a plate at the chest once 3 x 12 is easy',
      },
      {
        exerciseId: 'chop',
        kind: 'accessory',
        sets: 3,
        measure: 'reps',
        min: 10,
        max: 10,
        perSide: true,
        loaded: true,
        restSec: 60,
        dose: '3 x 10 per side',
        note: 'Turn through upper back and hips, not lower back',
      },
      {
        exerciseId: 'pallof',
        kind: 'accessory',
        sets: 3,
        measure: 'reps',
        min: 10,
        max: 10,
        perSide: true,
        loaded: true,
        restSec: 45,
        dose: '3 x 10 per side, 2 s hold',
        note: 'Resist the turn',
      },
      {
        exerciseId: 'sideplank',
        kind: 'accessory',
        sets: 2,
        measure: 'secs',
        min: 30,
        max: 30,
        perSide: true,
        loaded: false,
        hold: true,
        restSec: 30,
        dose: '2 x 30 s per side',
        note: 'Hips high, body in one line',
      },
    ],
  },
  B: {
    title: 'Session B',
    subtitle: 'Hinge, press, carry',
    items: [
      {
        ...MAIN,
        exerciseId: 'deadlift',
        kind: 'main',
        loaded: true,
        restSec: 180,
        note: 'Every rep from a dead stop',
      },
      {
        exerciseId: 'landmine',
        kind: 'accessory',
        sets: 3,
        measure: 'reps',
        min: 8,
        max: 8,
        perSide: true,
        loaded: true,
        restSec: 90,
        dose: '3 x 8 per side',
        note: 'Drive from the back foot, hips lead the arm',
      },
      {
        exerciseId: 'backext',
        kind: 'accessory',
        sets: 2,
        measure: 'reps',
        min: 12,
        max: 12,
        loaded: false,
        restSec: 60,
        dose: '2 x 12',
        note: 'Bodyweight only. The deadlift already loaded the back',
      },
      {
        exerciseId: 'dbrow',
        kind: 'accessory',
        sets: 3,
        measure: 'reps',
        min: 10,
        max: 10,
        perSide: true,
        loaded: true,
        restSec: 60,
        dose: '3 x 10 per side',
        note: 'Hand on bench, flat back',
      },
      {
        exerciseId: 'suitcase',
        kind: 'accessory',
        sets: 3,
        measure: 'metres',
        min: 30,
        max: 30,
        perSide: true,
        loaded: true,
        restSec: 60,
        dose: '3 x 30 m per side',
        note: 'One heavy dumbbell, walk tall, no side lean',
      },
      {
        exerciseId: 'deadbug',
        kind: 'accessory',
        sets: 3,
        measure: 'reps',
        min: 6,
        max: 6,
        perSide: true,
        loaded: false,
        restSec: 45,
        dose: '3 x 6 per side',
        note: 'Lower back stays on the floor',
      },
    ],
  },
  C: {
    title: 'Session C',
    subtitle: 'Mobility and maintenance',
    items: [
      {
        exerciseId: 'backext',
        kind: 'accessory',
        sets: 3,
        measure: 'reps',
        min: 12,
        max: 12,
        loaded: false,
        restSec: 45,
        dose: '3 x 12, 2 s hold at top',
        note: 'Bodyweight, slow',
      },
      {
        exerciseId: 'goblet',
        kind: 'accessory',
        sets: 2,
        measure: 'reps',
        min: 8,
        max: 8,
        loaded: true,
        restSec: 45,
        dose: '2 x 8, 3 s pause at bottom',
        note: 'Light. Use the pause to open the hips',
      },
      {
        exerciseId: 'slrdl',
        kind: 'accessory',
        sets: 2,
        measure: 'reps',
        min: 8,
        max: 8,
        perSide: true,
        loaded: true,
        restSec: 45,
        dose: '2 x 8 per side',
        note: 'Light. Balance and hamstring length',
      },
      {
        exerciseId: 'deadhang',
        kind: 'accessory',
        sets: 3,
        measure: 'secs',
        min: 20,
        max: 30,
        loaded: false,
        hold: true,
        restSec: 45,
        dose: '3 x 20 to 30 s',
        note: 'Relax and let the spine lengthen',
      },
      {
        exerciseId: 'hipflexor',
        kind: 'mobility',
        sets: 2,
        measure: 'secs',
        min: 45,
        max: 45,
        perSide: true,
        loaded: false,
        hold: true,
        restSec: 0,
        dose: '45 s per side',
        note: 'Opens the front of the hip',
      },
      {
        exerciseId: 'figure4',
        kind: 'mobility',
        sets: 2,
        measure: 'secs',
        min: 45,
        max: 45,
        perSide: true,
        loaded: false,
        hold: true,
        restSec: 0,
        dose: '45 s per side',
        note: 'Opens glutes and deep hip rotators',
      },
      {
        exerciseId: 'hamstring9090',
        kind: 'mobility',
        sets: 2,
        measure: 'reps',
        min: 10,
        max: 10,
        perSide: true,
        loaded: false,
        restSec: 0,
        dose: '10 slow reps per side',
        note: 'Hamstrings without rounding the back',
      },
      {
        exerciseId: 'openbook',
        kind: 'mobility',
        sets: 2,
        measure: 'reps',
        min: 8,
        max: 8,
        perSide: true,
        loaded: false,
        restSec: 0,
        dose: '8 per side',
        note: 'Upper back rotation for the swing',
      },
      {
        exerciseId: 'childspose',
        kind: 'mobility',
        sets: 2,
        measure: 'secs',
        min: 60,
        max: 60,
        loaded: false,
        hold: true,
        restSec: 0,
        dose: '60 s',
        note: 'Lower back and lats',
      },
    ],
  },
}

/** Shown at the start of Session C part 2. */
export const mobilityIntro =
  'Mobility flow: 2 rounds, no rest timer. Breathe slowly through the nose and ease further on each exhale. Also your home routine in a two gym week.'

export const phases: Phase[] = [
  {
    n: 1,
    name: 'Learn',
    short: 'Learn',
    start: [10, 1],
    end: [11, 15],
    rir: '3 RIR',
    loadRule: 'Light. Add weight only when all sets look the same',
    main: {
      squat: { sets: 3, min: 8, max: 8 },
      deadlift: { sets: 3, min: 6, max: 6 },
      pullup: { sets: 3, min: 1, max: 1, maxMinus: 2 },
    },
    pullupLoaded: false,
    addHint: '+2.5 kg',
  },
  {
    n: 2,
    name: 'Build',
    short: 'Build',
    start: [11, 16],
    end: [12, 31],
    rir: '2 RIR',
    loadRule: 'Hit the top of the range on all sets, then add 2.5 to 5 kg',
    main: {
      squat: { sets: 4, min: 6, max: 8 },
      deadlift: { sets: 4, min: 6, max: 8 },
      pullup: { sets: 4, min: 6, max: 8 },
    },
    pullupLoaded: true,
    addHint: '+2.5 to 5 kg',
  },
  {
    n: 3,
    name: 'Strength',
    short: 'Strength',
    start: [1, 1],
    end: [2, 28],
    rir: '1 to 2 RIR',
    loadRule: 'Hit the top of the range on all sets, then add 2.5 kg',
    main: {
      squat: { sets: 4, min: 4, max: 6 },
      deadlift: { sets: 4, min: 4, max: 6 },
      pullup: { sets: 4, min: 4, max: 6 },
    },
    pullupLoaded: true,
    addHint: '+2.5 kg',
  },
  {
    n: 4,
    name: 'Power and taper',
    short: 'Taper',
    start: [3, 1],
    end: [3, 31],
    rir: '3 RIR',
    loadRule: 'Drop load about 15 percent, keep bar speed',
    main: {
      squat: { sets: 3, min: 3, max: 5 },
      deadlift: { sets: 3, min: 3, max: 5 },
      pullup: { sets: 3, min: 3, max: 5 },
    },
    pullupLoaded: true,
    addHint: '+2.5 kg',
  },
]

export const backRules = {
  normal:
    'Muscular stiffness in the lower back, hips and glutes that eases as you warm up is the expected starting point.',
  same: 'Stiffness the same or better the next morning: carry on.',
  worse:
    'Stiffness clearly worse the next morning: repeat the same loads next session, do not add.',
  rep: 'A rep where the lower back rounds or takes over from the glutes: the set ends there.',
  redFlags: [
    'Pain that travels down a leg',
    'Numbness or tingling',
    'Sharp pain on bending forward',
  ],
  redFlagAction:
    'Stop loaded hinging and squatting and see a physiotherapist before the next session.',
  badDay: 'On a bad back day, do the warm-up and Session C instead of skipping.',
}

export const photoCredit = 'Photos: Free Exercise DB, public domain'
export const photoBaseUrl =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'
