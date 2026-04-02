export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  type: 'strength' | 'hypertrophy';
  daysPerWeek: number;
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
  daysPerWeek: 4,
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
  daysPerWeek: 3,
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
  daysPerWeek: 6,
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

// StrongLifts 5x5 (주3일, 초보자 스트렝스)
const strongLifts5x5: ProgramTemplate = {
  id: 'sl5x5',
  name: 'StrongLifts 5×5',
  description: '주 3일 A/B 교대. 매 운동마다 +2.5kg 증량. 초보자 스트렝스의 정석',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 12,
  exercises: ['스쿼트', '벤치프레스', '바벨 로우', '오버헤드 프레스', '데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    function calc(exName: string, session: number) {
      const orm = oneRepMaxes[exName] || 0;
      const base = orm > 0 ? roundToPlate(orm * 0.5) : 0;
      const w = base > 0 ? roundToPlate(base + session * 2.5) : 0;
      return { exerciseName: exName, sets: Array.from({ length: exName === ex[4] ? 1 : 5 }, () => ({
        percentage: orm > 0 ? Math.round((w / orm) * 100) : 0, reps: 5, weight: w || undefined,
      }))};
    }
    const s = (week - 1) * 3; // 세션 번호
    const days: DayPlan[] = [
      { label: 'Day A (월)', exercises: [calc(ex[0], s), calc(ex[1], s), calc(ex[2], s)] },
      { label: 'Day B (수)', exercises: [calc(ex[0], s+1), calc(ex[3], s+1), calc(ex[4], s+1)] },
      { label: 'Day A (금)', exercises: [calc(ex[0], s+2), calc(ex[1], s+2), calc(ex[2], s+2)] },
    ];
    return { label: `Week ${week}`, days };
  },
};

// PHUL (주4일, 근비대+스트렝스 혼합)
const phul: ProgramTemplate = {
  id: 'phul',
  name: 'PHUL (Power Hypertrophy)',
  description: '주 4일. 파워 2일 + 근비대 2일. 근력과 근비대를 동시에 추구하는 중급자 프로그램',
  type: 'hypertrophy',
  daysPerWeek: 4,
  durationWeeks: 8,
  exercises: ['벤치프레스', '바벨 로우', '스쿼트', '데드리프트', '덤벨 벤치프레스', '랫풀다운', '레그프레스', '루마니안 데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const powerInt = Math.min(0.80 + (week - 1) * 0.015, 0.90);
    const hyperInt = Math.min(0.65 + (week - 1) * 0.02, 0.75);

    function make(exName: string, intensity: number, numSets: number, reps: number) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * intensity) : 0;
      return { exerciseName: exName, sets: Array.from({ length: numSets }, () => ({
        percentage: Math.round(intensity * 100), reps, weight: w || undefined,
      }))};
    }

    const days: DayPlan[] = [
      { label: '상체 파워 (월)', exercises: [
        make('벤치프레스', powerInt, 4, 5),
        make('바벨 로우', powerInt, 4, 5),
      ]},
      { label: '하체 파워 (화)', exercises: [
        make('스쿼트', powerInt, 4, 5),
        make('데드리프트', powerInt, 3, 5),
      ]},
      { label: '상체 근비대 (목)', exercises: [
        make('덤벨 벤치프레스', hyperInt, 4, 10),
        make('랫풀다운', hyperInt, 4, 10),
      ]},
      { label: '하체 근비대 (금)', exercises: [
        make('레그프레스', hyperInt, 4, 12),
        make('루마니안 데드리프트', hyperInt, 3, 10),
      ]},
    ];
    return { label: `Week ${week} (파워 ${Math.round(powerInt*100)}% / 근비대 ${Math.round(hyperInt*100)}%)`, days };
  },
};

// 상하 분할 (주4일, 근비대)
const upperLower: ProgramTemplate = {
  id: 'upperlower',
  name: '상하 분할 (Upper/Lower)',
  description: '주 4일. 상체/하체 교대. 밸런스 잡힌 근비대 프로그램. 중급자 추천',
  type: 'hypertrophy',
  daysPerWeek: 4,
  durationWeeks: 8,
  exercises: ['벤치프레스', '바벨 로우', '오버헤드 프레스', '랫풀다운', '스쿼트', '루마니안 데드리프트', '레그프레스', '레그 컬'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const int = Math.min(0.65 + (week - 1) * 0.02, 0.80);

    function make(exName: string, numSets: number, reps: number) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * int) : 0;
      return { exerciseName: exName, sets: Array.from({ length: numSets }, () => ({
        percentage: Math.round(int * 100), reps, weight: w || undefined,
      }))};
    }

    const days: DayPlan[] = [
      { label: '상체 A (월)', exercises: [make('벤치프레스', 4, 8), make('바벨 로우', 4, 8)] },
      { label: '하체 A (화)', exercises: [make('스쿼트', 4, 8), make('루마니안 데드리프트', 3, 10)] },
      { label: '상체 B (목)', exercises: [make('오버헤드 프레스', 4, 10), make('랫풀다운', 4, 10)] },
      { label: '하체 B (금)', exercises: [make('레그프레스', 4, 12), make('레그 컬', 3, 12)] },
    ];
    return { label: `Week ${week} (${Math.round(int * 100)}%)`, days };
  },
};

// nSuns 5/3/1 LP (주4일, 중급 스트렝스)
const nsuns: ProgramTemplate = {
  id: 'nsuns',
  name: 'nSuns 5/3/1 LP',
  description: '주 4일. 웬들러 5/3/1 변형. 매주 증량하는 공격적인 중급자 스트렝스 프로그램',
  type: 'strength',
  daysPerWeek: 4,
  durationWeeks: 6,
  exercises: ['벤치프레스', '오버헤드 프레스', '스쿼트', '데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    // nSuns T1: 메인 리프트 8~9세트, 주차별 TM 증가
    function t1Sets(exName: string, weekNum: number) {
      const orm = oneRepMaxes[exName] || 0;
      const tm = orm > 0 ? roundToPlate(orm * 0.9 + (weekNum - 1) * 2.5) : 0;
      const scheme = [
        { pct: 0.75, reps: 5 }, { pct: 0.85, reps: 3 }, { pct: 0.95, reps: 1 },
        { pct: 0.90, reps: 3 }, { pct: 0.85, reps: 3 }, { pct: 0.80, reps: 3 },
        { pct: 0.75, reps: 5 }, { pct: 0.70, reps: 5 }, { pct: 0.65, reps: 5 },
      ];
      return { exerciseName: exName, sets: scheme.map((s) => ({
        percentage: Math.round(s.pct * 100),
        reps: s.reps,
        weight: tm > 0 ? roundToPlate(tm * s.pct) : undefined,
      }))};
    }
    // T2: 보조 리프트 8세트
    function t2Sets(exName: string, weekNum: number) {
      const orm = oneRepMaxes[exName] || 0;
      const tm = orm > 0 ? roundToPlate(orm * 0.9 + (weekNum - 1) * 2.5) : 0;
      const base = tm * 0.5;
      return { exerciseName: `${exName} (보조)`, sets: Array.from({ length: 8 }, (_, i) => {
        const pct = 0.50 + i * 0.025;
        return {
          percentage: Math.round(pct * 100),
          reps: i < 5 ? 5 : 8,
          weight: base > 0 ? roundToPlate(tm * pct) : undefined,
        };
      })};
    }

    const days: DayPlan[] = [
      { label: '벤치 + 보조 OHP (월)', exercises: [t1Sets(ex[0], week), t2Sets(ex[1], week)] },
      { label: '스쿼트 + 보조 데드 (화)', exercises: [t1Sets(ex[2], week), t2Sets(ex[3], week)] },
      { label: 'OHP + 보조 벤치 (목)', exercises: [t1Sets(ex[1], week), t2Sets(ex[0], week)] },
      { label: '데드 + 보조 스쿼트 (금)', exercises: [t1Sets(ex[3], week), t2Sets(ex[2], week)] },
    ];
    return { label: `Week ${week} (TM +${(week-1)*2.5}kg)`, days };
  },
};

// GZCLP (주3일, 초중급 스트렝스)
const gzclp: ProgramTemplate = {
  id: 'gzclp',
  name: 'GZCLP',
  description: '주 3~4일. 3단계 피라미드(T1/T2/T3). 체계적인 초중급 스트렝스 프로그램',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 8,
  exercises: ['스쿼트', '벤치프레스', '데드리프트', '오버헤드 프레스'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    // T1: 5x3+ (고중량, 저반복) → 매주 +2.5kg
    function t1(exName: string) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * 0.85 + (week - 1) * 2.5) : 0;
      return { exerciseName: `${exName} (T1)`, sets: Array.from({ length: 5 }, () => ({
        percentage: orm > 0 ? Math.round((w / orm) * 100) : 0, reps: 3, weight: w || undefined,
      }))};
    }
    // T2: 3x10 (중중량, 중반복) → 매주 +2.5kg
    function t2(exName: string) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * 0.65 + (week - 1) * 2.5) : 0;
      return { exerciseName: `${exName} (T2)`, sets: Array.from({ length: 3 }, () => ({
        percentage: orm > 0 ? Math.round((w / orm) * 100) : 0, reps: 10, weight: w || undefined,
      }))};
    }

    const days: DayPlan[] = [
      { label: 'Day 1 (월)', exercises: [t1(ex[0]), t2(ex[1])] },
      { label: 'Day 2 (수)', exercises: [t1(ex[3]), t2(ex[2])] },
      { label: 'Day 3 (금)', exercises: [t1(ex[1]), t2(ex[0])] },
    ];
    return { label: `Week ${week}`, days };
  },
};

// 근비대 전신 3일 (초보~중급)
const fullBody3Day: ProgramTemplate = {
  id: 'fullbody3',
  name: '전신 운동 (Full Body)',
  description: '주 3일. 매일 전신을 골고루 훈련. 초보자의 근비대에 가장 효율적',
  type: 'hypertrophy',
  daysPerWeek: 3,
  durationWeeks: 8,
  exercises: ['스쿼트', '벤치프레스', '바벨 로우', '오버헤드 프레스', '루마니안 데드리프트', '랫풀다운'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const int = Math.min(0.65 + (week - 1) * 0.02, 0.78);
    function make(exName: string, sets: number, reps: number) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * int) : 0;
      return { exerciseName: exName, sets: Array.from({ length: sets }, () => ({
        percentage: Math.round(int * 100), reps, weight: w || undefined,
      }))};
    }
    const ex = this.exercises;
    const days: DayPlan[] = [
      { label: 'Day A (월)', exercises: [make(ex[0], 3, 10), make(ex[1], 3, 10), make(ex[5], 3, 10)] },
      { label: 'Day B (수)', exercises: [make(ex[4], 3, 10), make(ex[3], 3, 10), make(ex[2], 3, 10)] },
      { label: 'Day C (금)', exercises: [make(ex[0], 3, 10), make(ex[1], 3, 10), make(ex[2], 3, 10)] },
    ];
    return { label: `Week ${week} (${Math.round(int * 100)}%)`, days };
  },
};

// 맨몸 운동 프로그램 (주3일, 기능성)
const calisthenics: ProgramTemplate = {
  id: 'calisthenics',
  name: '맨몸 운동 (Calisthenics)',
  description: '주 3일. 장비 없이 전신 훈련. 근력+기능성+유연성 동시 향상',
  type: 'hypertrophy',
  daysPerWeek: 3,
  durationWeeks: 8,
  exercises: ['푸시업', '풀업', '딥스', '맨몸 스쿼트', '플랭크', '레그레이즈'],
  getWeekPlan(week: number, _oneRepMaxes: Record<string, number>): WeekPlan {
    // 맨몸은 1RM 없이 횟수/세트 증가로 과부하
    const baseReps = 8 + Math.min(week - 1, 6) * 2; // 8→20
    const sets = Math.min(3 + Math.floor((week - 1) / 2), 5); // 3→5
    function make(exName: string, reps?: number) {
      const r = reps || baseReps;
      return { exerciseName: exName, sets: Array.from({ length: sets }, () => ({
        percentage: 0, reps: r, weight: undefined,
      }))};
    }
    const ex = this.exercises;
    const days: DayPlan[] = [
      { label: 'Push Day (월)', exercises: [make(ex[0]), make(ex[2]), make(ex[4], 30 + week * 5)] },
      { label: 'Pull Day (수)', exercises: [make(ex[1]), make(ex[5]), make(ex[4], 30 + week * 5)] },
      { label: 'Legs+Core (금)', exercises: [make(ex[3], baseReps + 5), make(ex[5]), make(ex[0])] },
    ];
    return { label: `Week ${week} (${sets}세트 × ${baseReps}회)`, days };
  },
};

// PHAT (주5일, 고급 근비대)
const phat: ProgramTemplate = {
  id: 'phat',
  name: 'PHAT (Layne Norton)',
  description: '주 5일. 파워 2일 + 근비대 3일. Layne Norton의 과학 기반 고급 프로그램',
  type: 'hypertrophy',
  daysPerWeek: 5,
  durationWeeks: 8,
  exercises: ['벤치프레스', '바벨 로우', '스쿼트', '오버헤드 프레스', '데드리프트', '덤벨 벤치프레스', '랫풀다운', '레그프레스'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const powerInt = Math.min(0.82 + (week - 1) * 0.015, 0.92);
    const hyperInt = Math.min(0.62 + (week - 1) * 0.02, 0.75);
    function make(exName: string, intensity: number, sets: number, reps: number) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * intensity) : 0;
      return { exerciseName: exName, sets: Array.from({ length: sets }, () => ({
        percentage: Math.round(intensity * 100), reps, weight: w || undefined,
      }))};
    }
    const days: DayPlan[] = [
      { label: '상체 파워 (월)', exercises: [make('벤치프레스', powerInt, 4, 5), make('바벨 로우', powerInt, 4, 5)] },
      { label: '하체 파워 (화)', exercises: [make('스쿼트', powerInt, 4, 5), make('데드리프트', powerInt, 3, 5)] },
      { label: '등+어깨 근비대 (목)', exercises: [make('랫풀다운', hyperInt, 4, 12), make('오버헤드 프레스', hyperInt, 3, 12)] },
      { label: '하체 근비대 (금)', exercises: [make('레그프레스', hyperInt, 4, 15), make('스쿼트', hyperInt, 3, 12)] },
      { label: '가슴+팔 근비대 (토)', exercises: [make('덤벨 벤치프레스', hyperInt, 4, 12), make('벤치프레스', hyperInt, 3, 12)] },
    ];
    return { label: `Week ${week} (P:${Math.round(powerInt*100)}% H:${Math.round(hyperInt*100)}%)`, days };
  },
};

export const programTemplates: ProgramTemplate[] = [
  // 주 3일
  strongLifts5x5,
  gzclp,
  linearProgression,
  fullBody3Day,
  calisthenics,
  // 주 4일
  phul,
  upperLower,
  nsuns,
  wendler531,
  // 주 5~6일
  phat,
  pplHypertrophy,
];
