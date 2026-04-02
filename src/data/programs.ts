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
          const weekWeight = baseWeight > 0 ? Math.min(roundToPlate(baseWeight + (week - 1) * 2.5), roundToPlate(orm * 0.95)) : 0;
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
          const weekWeight = baseWeight > 0 ? Math.min(roundToPlate(baseWeight + (week - 1) * 2.5), roundToPlate(orm * 0.95)) : 0;
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
      const w = base > 0 ? Math.min(roundToPlate(base + session * 2.5), roundToPlate(orm * 0.95)) : 0;
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
      return { exerciseName: `${exName} (보조)`, sets: Array.from({ length: 8 }, (_, i) => {
        const pct = 0.50 + i * 0.025;
        return {
          percentage: Math.round(pct * 100),
          reps: i < 5 ? 5 : 8,
          weight: tm > 0 ? roundToPlate(tm * pct) : undefined,
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

// Starting Strength (Mark Rippetoe, 주3일, 초보 스트렝스)
const startingStrength: ProgramTemplate = {
  id: 'ss',
  name: 'Starting Strength',
  description: '주 3일 A/B 교대. Mark Rippetoe의 초보자 스트렝스 프로그램. 매 세션 +2.5kg',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 12,
  exercises: ['스쿼트', '벤치프레스', '데드리프트', '오버헤드 프레스', '바벨 로우'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    function calc(exName: string, session: number, sets: number, reps: number) {
      const orm = oneRepMaxes[exName] || 0;
      const base = orm > 0 ? roundToPlate(orm * 0.55) : 0;
      const w = base > 0 ? Math.min(roundToPlate(base + session * 2.5), roundToPlate(orm * 0.95)) : 0;
      return { exerciseName: exName, sets: Array.from({ length: sets }, () => ({
        percentage: orm > 0 ? Math.round((w / orm) * 100) : 0, reps, weight: w || undefined,
      }))};
    }
    const s = (week - 1) * 3;
    const isOdd = week % 2 === 1;
    const days: DayPlan[] = [
      { label: isOdd ? 'Day A (월)' : 'Day B (월)', exercises: isOdd
        ? [calc(ex[0], s, 3, 5), calc(ex[1], s, 3, 5), calc(ex[2], s, 1, 5)]
        : [calc(ex[0], s, 3, 5), calc(ex[3], s, 3, 5), calc(ex[2], s, 1, 5)]
      },
      { label: isOdd ? 'Day B (수)' : 'Day A (수)', exercises: isOdd
        ? [calc(ex[0], s+1, 3, 5), calc(ex[3], s+1, 3, 5), calc(ex[4], s+1, 3, 5)]
        : [calc(ex[0], s+1, 3, 5), calc(ex[1], s+1, 3, 5), calc(ex[4], s+1, 3, 5)]
      },
      { label: isOdd ? 'Day A (금)' : 'Day B (금)', exercises: isOdd
        ? [calc(ex[0], s+2, 3, 5), calc(ex[1], s+2, 3, 5), calc(ex[2], s+2, 1, 5)]
        : [calc(ex[0], s+2, 3, 5), calc(ex[3], s+2, 3, 5), calc(ex[2], s+2, 1, 5)]
      },
    ];
    return { label: `Week ${week}`, days };
  },
};

// Greyskull LP (John Sheaffer, 주3일, 초보 스트렝스+근비대)
const greyskulllp: ProgramTemplate = {
  id: 'gslp',
  name: 'Greyskull LP',
  description: '주 3일. Starting Strength 개선판. 마지막 세트 AMRAP으로 자연적 과부하. 초보자 추천',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 12,
  exercises: ['벤치프레스', '오버헤드 프레스', '스쿼트', '데드리프트', '친업'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    function calc(exName: string, session: number, sets: number, reps: number, amrap: boolean = false) {
      const orm = oneRepMaxes[exName] || 0;
      const base = orm > 0 ? roundToPlate(orm * 0.6) : 0;
      const w = base > 0 ? Math.min(roundToPlate(base + session * 2.5), roundToPlate(orm * 0.95)) : 0;
      return { exerciseName: exName + (amrap ? ' (AMRAP)' : ''), sets: Array.from({ length: sets }, (_, i) => ({
        percentage: orm > 0 ? Math.round((w / orm) * 100) : 0,
        reps: (amrap && i === sets - 1) ? reps : reps, // 마지막 세트 AMRAP 표시
        weight: w || undefined,
      }))};
    }
    const s = (week - 1) * 3;
    const isOdd = week % 2 === 1;
    const days: DayPlan[] = [
      { label: isOdd ? 'Day A (월)' : 'Day B (월)', exercises: isOdd
        ? [calc(ex[0], s, 3, 5, true), calc(ex[2], s, 3, 5, true)]
        : [calc(ex[1], s, 3, 5, true), calc(ex[2], s, 3, 5, true)]
      },
      { label: isOdd ? 'Day B (수)' : 'Day A (수)', exercises: isOdd
        ? [calc(ex[1], s+1, 3, 5, true), calc(ex[3], s+1, 1, 5, true)]
        : [calc(ex[0], s+1, 3, 5, true), calc(ex[3], s+1, 1, 5, true)]
      },
      { label: isOdd ? 'Day A (금)' : 'Day B (금)', exercises: isOdd
        ? [calc(ex[0], s+2, 3, 5, true), calc(ex[2], s+2, 3, 5, true)]
        : [calc(ex[1], s+2, 3, 5, true), calc(ex[2], s+2, 3, 5, true)]
      },
    ];
    return { label: `Week ${week} (마지막 세트 AMRAP)`, days };
  },
};

// Texas Method (Rippetoe/Pendlay, 주3일, 중급 스트렝스)
const texasMethod: ProgramTemplate = {
  id: 'texas',
  name: 'Texas Method',
  description: '주 3일. 볼륨→회복→강도 주기. Starting Strength 이후 중급자를 위한 프로그램',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 8,
  exercises: ['스쿼트', '벤치프레스', '오버헤드 프레스', '데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    const isOdd = week % 2 === 1;
    const pressEx = isOdd ? ex[1] : ex[2];
    const baseIncrease = (week - 1) * 2.5;

    function make(exName: string, pct: number, sets: number, reps: number) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? Math.min(roundToPlate(orm * pct + baseIncrease), roundToPlate(orm * 0.98)) : 0;
      return { exerciseName: exName, sets: Array.from({ length: sets }, () => ({
        percentage: orm > 0 ? Math.round((w / orm) * 100) : 0, reps, weight: w || undefined,
      }))};
    }

    const days: DayPlan[] = [
      { label: '볼륨 Day (월)', exercises: [
        make(ex[0], 0.77, 5, 5),
        make(pressEx, 0.77, 5, 5),
      ]},
      { label: '회복 Day (수)', exercises: [
        make(ex[0], 0.62, 2, 5),
        make(isOdd ? ex[2] : ex[1], 0.70, 3, 5),
      ]},
      { label: '강도 Day (금)', exercises: [
        make(ex[0], 0.85, 1, 5),
        make(pressEx, 0.85, 1, 5),
        make(ex[3], 0.85, 1, 5),
      ]},
    ];
    return { label: `Week ${week} (${isOdd ? '벤치' : 'OHP'} 주)`, days };
  },
};

// Juggernaut Method (Chad Wesley Smith, 주4일, 중상급 스트렝스+근비대)
const juggernaut: ProgramTemplate = {
  id: 'juggernaut',
  name: 'Juggernaut Method',
  description: '주 4일. 16주 4파동(10s→8s→5s→3s). 근비대와 스트렝스를 동시에. 중급~상급자',
  type: 'strength',
  daysPerWeek: 4,
  durationWeeks: 16,
  exercises: ['스쿼트', '벤치프레스', '데드리프트', '오버헤드 프레스'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    // 4개 파동: 10s(1-4주), 8s(5-8주), 5s(9-12주), 3s(13-16주)
    const waves = [
      { label: '10s Wave', reps: 10, pcts: [0.60, 0.60, 0.60, 0.60] }, // 주차별: 축적/강화/실현/디로드
      { label: '8s Wave', reps: 8, pcts: [0.65, 0.65, 0.65, 0.65] },
      { label: '5s Wave', reps: 5, pcts: [0.725, 0.725, 0.725, 0.725] },
      { label: '3s Wave', reps: 3, pcts: [0.80, 0.80, 0.80, 0.80] },
    ];
    const waveIdx = Math.min(Math.floor((week - 1) / 4), 3);
    const weekInWave = ((week - 1) % 4) + 1;
    const wave = waves[waveIdx];

    // 주차별 세트/반복 조정
    const isDeload = weekInWave === 4;
    const sets = isDeload ? 2 : (weekInWave === 3 ? 3 : 4);
    const reps = isDeload ? 5 : wave.reps;
    const pct = isDeload ? wave.pcts[0] * 0.7 : wave.pcts[0] + (weekInWave - 1) * 0.025;

    function make(exName: string) {
      const orm = oneRepMaxes[exName] || 0;
      const tm = orm * 0.9;
      const w = orm > 0 ? roundToPlate(tm * pct) : 0;
      return { exerciseName: exName + (weekInWave === 3 ? ' (AMRAP)' : ''), sets: Array.from({ length: sets }, () => ({
        percentage: Math.round(pct * 100), reps, weight: w || undefined,
      }))};
    }

    const days: DayPlan[] = ex.map((exName) => ({
      label: exName,
      exercises: [make(exName)],
    }));

    return { label: `${wave.label} - Week ${weekInWave}${isDeload ? ' (디로드)' : ''}`, days };
  },
};

// Candito 6-Week (Jonnie Candito, 주4일, 중상급 스트렝스 피킹)
const candito6week: ProgramTemplate = {
  id: 'candito',
  name: 'Candito 6-Week',
  description: '주 3~4일. 6주 블록 주기화. 근비대→스트렝스→피킹→1RM 테스트. Jonnie Candito',
  type: 'strength',
  daysPerWeek: 4,
  durationWeeks: 6,
  exercises: ['스쿼트', '벤치프레스', '데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    // 6주 단계별 강도/반복
    const phases: { label: string; pct: number; reps: number; sets: number }[] = [
      { label: '근비대 (1주)', pct: 0.70, reps: 10, sets: 4 },
      { label: '근비대 (2주)', pct: 0.73, reps: 8, sets: 4 },
      { label: '선형 Max OT (3주)', pct: 0.82, reps: 5, sets: 4 },
      { label: '강도 전환 (4주)', pct: 0.87, reps: 3, sets: 3 },
      { label: '고부하 적응 (5주)', pct: 0.92, reps: 2, sets: 3 },
      { label: '1RM 테스트 (6주)', pct: 0.95, reps: 1, sets: 2 },
    ];
    const phase = phases[Math.min(week - 1, 5)];

    function make(exName: string) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * phase.pct) : 0;
      return { exerciseName: exName, sets: Array.from({ length: phase.sets }, () => ({
        percentage: Math.round(phase.pct * 100), reps: phase.reps, weight: w || undefined,
      }))};
    }

    const days: DayPlan[] = [
      { label: '상체 (월)', exercises: [make(ex[1])] },
      { label: '하체 (화)', exercises: [make(ex[0]), make(ex[2])] },
      { label: '상체 (목)', exercises: [make(ex[1])] },
      { label: '하체 (금)', exercises: [make(ex[0])] },
    ];
    return { label: phase.label, days };
  },
};

// Arnold Split (Arnold Schwarzenegger, 주6일, 클래식 근비대)
const arnoldSplit: ProgramTemplate = {
  id: 'arnold',
  name: 'Arnold Split',
  description: '주 6일. 가슴+등 / 어깨+팔 / 하체 3분할×2. Arnold Schwarzenegger의 클래식 보디빌딩',
  type: 'hypertrophy',
  daysPerWeek: 6,
  durationWeeks: 8,
  exercises: ['벤치프레스', '바벨 로우', '딥스', '친업', '오버헤드 프레스', '사이드 레터럴 레이즈', '바벨 컬', '스컬크러셔', '스쿼트', '레그프레스', '레그 컬', '카프 레이즈 머신'],
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
      { label: '가슴+등 (월)', exercises: [make(ex[0], 4, 10), make(ex[1], 4, 10), make(ex[2], 3, 10), make(ex[3], 3, 8)] },
      { label: '어깨+팔 (화)', exercises: [make(ex[4], 4, 10), make(ex[5], 3, 12), make(ex[6], 3, 10), make(ex[7], 3, 10)] },
      { label: '하체 (수)', exercises: [make(ex[8], 4, 10), make(ex[9], 3, 12), make(ex[10], 3, 12), make(ex[11], 4, 15)] },
      { label: '가슴+등 (목)', exercises: [make(ex[0], 4, 10), make(ex[1], 4, 10), make(ex[2], 3, 10), make(ex[3], 3, 8)] },
      { label: '어깨+팔 (금)', exercises: [make(ex[4], 4, 10), make(ex[5], 3, 12), make(ex[6], 3, 10), make(ex[7], 3, 10)] },
      { label: '하체 (토)', exercises: [make(ex[8], 4, 10), make(ex[9], 3, 12), make(ex[10], 3, 12), make(ex[11], 4, 15)] },
    ];
    return { label: `Week ${week} (${Math.round(int * 100)}%)`, days };
  },
};

export const programTemplates: ProgramTemplate[] = [
  // 주 3일
  startingStrength,
  strongLifts5x5,
  greyskulllp,
  gzclp,
  linearProgression,
  texasMethod,
  fullBody3Day,
  calisthenics,
  // 주 4일
  phul,
  upperLower,
  nsuns,
  wendler531,
  juggernaut,
  candito6week,
  // 주 5~6일
  phat,
  arnoldSplit,
  pplHypertrophy,
];
