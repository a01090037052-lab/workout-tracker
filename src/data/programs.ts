export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  type: 'strength' | 'hypertrophy';
  durationWeeks: number;
  exercises: string[]; // 대표 운동명 (사용자가 매핑)
  getWeekPlan: (week: number, oneRepMaxes: Record<string, number>) => WeekPlan;
}

export interface WeekPlan {
  label: string;
  days: DayPlan[];
}

export interface DayPlan {
  label: string;
  exercises: ExercisePlan[];
}

export interface ExercisePlan {
  exerciseName: string;
  sets: { percentage: number; reps: number; weight?: number }[];
}

function roundToPlate(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}

// 5/3/1 (웬들러)
const wendler531: ProgramTemplate = {
  id: '531',
  name: '5/3/1 (웬들러)',
  description: '4주 주기. 주요 복합운동의 점진적 과부하 프로그램. TM(Training Max) = 1RM의 90%',
  type: 'strength',
  durationWeeks: 4,
  exercises: ['스쿼트', '벤치프레스', '데드리프트', '오버헤드 프레스'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const exercises = this.exercises;
    const weekSchemes: { label: string; sets: { pct: number; reps: number }[] }[] = [
      { label: 'Week 1 (5/5/5+)', sets: [{ pct: 0.65, reps: 5 }, { pct: 0.75, reps: 5 }, { pct: 0.85, reps: 5 }] },
      { label: 'Week 2 (3/3/3+)', sets: [{ pct: 0.70, reps: 3 }, { pct: 0.80, reps: 3 }, { pct: 0.90, reps: 3 }] },
      { label: 'Week 3 (5/3/1+)', sets: [{ pct: 0.75, reps: 5 }, { pct: 0.85, reps: 3 }, { pct: 0.95, reps: 1 }] },
      { label: 'Week 4 (디로드)', sets: [{ pct: 0.40, reps: 5 }, { pct: 0.50, reps: 5 }, { pct: 0.60, reps: 5 }] },
    ];

    const scheme = weekSchemes[(week - 1) % 4];

    const days: DayPlan[] = exercises.map((exName) => {
      const orm = oneRepMaxes[exName] || 0;
      const tm = orm * 0.9; // Training Max
      return {
        label: exName,
        exercises: [{
          exerciseName: exName,
          sets: scheme.sets.map((s) => ({
            percentage: Math.round(s.pct * 100),
            reps: s.reps,
            weight: orm > 0 ? roundToPlate(tm * s.pct) : undefined,
          })),
        }],
      };
    });

    return { label: scheme.label, days };
  },
};

// 리니어 프로그레션 (초보자용)
const linearProgression: ProgramTemplate = {
  id: 'linear',
  name: '리니어 프로그레션',
  description: '매주 2.5kg씩 증량. 초보자에게 가장 효과적인 프로그램',
  type: 'strength',
  durationWeeks: 12,
  exercises: ['스쿼트', '벤치프레스', '데드리프트', '오버헤드 프레스', '바벨 로우'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const exercises = this.exercises;
    const days: DayPlan[] = [
      {
        label: 'Day A',
        exercises: [exercises[0], exercises[1], exercises[4]].map((exName) => {
          const orm = oneRepMaxes[exName] || 0;
          const baseWeight = orm > 0 ? roundToPlate(orm * 0.7) : 0;
          const weekWeight = baseWeight > 0 ? roundToPlate(baseWeight + (week - 1) * 2.5) : 0;
          return {
            exerciseName: exName,
            sets: Array.from({ length: 5 }, () => ({
              percentage: orm > 0 ? Math.round((weekWeight / orm) * 100) : 0,
              reps: 5,
              weight: weekWeight || undefined,
            })),
          };
        }),
      },
      {
        label: 'Day B',
        exercises: [exercises[0], exercises[3], exercises[2]].map((exName) => {
          const orm = oneRepMaxes[exName] || 0;
          const baseWeight = orm > 0 ? roundToPlate(orm * 0.7) : 0;
          const weekWeight = baseWeight > 0 ? roundToPlate(baseWeight + (week - 1) * 2.5) : 0;
          return {
            exerciseName: exName,
            sets: Array.from({ length: exName === exercises[2] ? 1 : 5 }, () => ({
              percentage: orm > 0 ? Math.round((weekWeight / orm) * 100) : 0,
              reps: 5,
              weight: weekWeight || undefined,
            })),
          };
        }),
      },
    ];

    return { label: `Week ${week}`, days };
  },
};

// 근비대 PPL
const pplHypertrophy: ProgramTemplate = {
  id: 'ppl',
  name: 'PPL (Push/Pull/Legs)',
  description: '밀기·당기기·하체 3분할. 주 6일 근비대 프로그램',
  type: 'hypertrophy',
  durationWeeks: 8,
  exercises: ['벤치프레스', '오버헤드 프레스', '바벨 로우', '풀업', '스쿼트', '루마니안 데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const intensity = Math.min(0.65 + (week - 1) * 0.02, 0.80); // 65% → 80%

    function makeSets(exName: string, numSets: number, reps: number) {
      const orm = oneRepMaxes[exName] || 0;
      const weight = orm > 0 ? roundToPlate(orm * intensity) : 0;
      return {
        exerciseName: exName,
        sets: Array.from({ length: numSets }, () => ({
          percentage: Math.round(intensity * 100),
          reps,
          weight: weight || undefined,
        })),
      };
    }

    const days: DayPlan[] = [
      {
        label: 'Push (가슴·어깨·삼두)',
        exercises: [
          makeSets('벤치프레스', 4, 10),
          makeSets('오버헤드 프레스', 3, 10),
        ],
      },
      {
        label: 'Pull (등·이두)',
        exercises: [
          makeSets('바벨 로우', 4, 10),
          makeSets('풀업', 3, 8),
        ],
      },
      {
        label: 'Legs (하체)',
        exercises: [
          makeSets('스쿼트', 4, 10),
          makeSets('루마니안 데드리프트', 3, 10),
        ],
      },
    ];

    return { label: `Week ${week} (${Math.round(intensity * 100)}%)`, days };
  },
};

export const programTemplates: ProgramTemplate[] = [wendler531, linearProgression, pplHypertrophy];
