export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  guide: string;       // 상세 설명 및 운동 진행법
  type: 'strength' | 'hypertrophy';
  daysPerWeek: number;
  durationWeeks: number;
  exercises: string[];
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
  return Math.round(weight / 5) * 5; // 바벨 최소 증량 5kg (5kg 원판 × 양쪽)
}

// 5/3/1 (웬들러)
const wendler531: ProgramTemplate = {
  id: '531',
  name: '5/3/1 (웬들러)',
  description: '4주 주기. 주요 복합운동의 점진적 과부하 프로그램. TM(Training Max) = 1RM의 90%',
  guide: '【원리】 Training Max(TM = 1RM의 90%)를 기준으로 매주 다른 반복 구성으로 훈련합니다.\n【진행법】 Week1: 5/5/5+ | Week2: 3/3/3+ | Week3: 5/3/1+ | Week4: 디로드(40~60%)\n마지막 세트(+)는 가능한 많이 반복(AMRAP)합니다.\n【증량】 4주 사이클 완료 후 상체 +5kg, 하체 +5kg으로 TM을 올립니다.\n【주의】 TM은 실제 1RM이 아닌 90%입니다. 욕심내서 올리면 프로그램이 무너집니다.',
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
  description: '매주 5kg씩 증량. 초보자에게 가장 효과적인 프로그램',
  guide: '【원리】 매주 일정하게 무게를 올리는 선형 진행(Linear Progression) 방식입니다.\n【진행법】 Day A(스쿼트/벤치/로우)와 Day B(스쿼트/OHP/데드)를 번갈아 수행합니다.\n모든 종목 5×5 (데드리프트만 1×5). 주 3일 격일 훈련.\n【증량】 매주 모든 종목에 +5kg. 실패 시 10% 디로드 후 재시작.\n【대상】 운동 경력 0~6개월 초보자. 근력 기초를 다지는 데 최적.',
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
          const weekWeight = baseWeight > 0 ? Math.min(roundToPlate(baseWeight + (week - 1) * 5), roundToPlate(orm * 0.95)) : 0;
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
          const weekWeight = baseWeight > 0 ? Math.min(roundToPlate(baseWeight + (week - 1) * 5), roundToPlate(orm * 0.95)) : 0;
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
  guide: '【원리】 Push(가슴/어깨/삼두), Pull(등/이두), Legs(하체)로 나눠 각 부위를 주 2회 훈련합니다.\n【진행법】 Push→Pull→Legs를 2회 반복 (주 6일). 주차별로 강도가 65%→80%까지 증가합니다.\n【증량】 모든 세트에서 목표 횟수 달성 시 다음 주에 자동 강도 증가.\n【대상】 중급자. 충분한 회복 능력이 있어야 주 6일 소화 가능.',
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
  description: '주 3일 A/B 교대. 매 운동마다 +5kg 증량. 초보자 스트렝스의 정석',
  guide: '【원리】 Mehdi의 미니멀 프로그램. A/B 두 루틴을 격일 교대로 수행합니다.\n【진행법】 A: 스쿼트/벤치/로우 5×5 | B: 스쿼트/OHP/데드 5×5(데드 1×5)\n스쿼트는 매 세션 실시. 매 세션 성공 시 +5kg.\n【핵심】 5회 5세트를 전부 성공해야 다음에 증량. 실패 시 같은 무게 재시도.\n3회 연속 실패 시 10% 디로드.\n【대상】 완전 초보자. 3~6개월 간 빠른 근력 성장 가능.',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 12,
  exercises: ['스쿼트', '벤치프레스', '바벨 로우', '오버헤드 프레스', '데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    function calc(exName: string, session: number) {
      const orm = oneRepMaxes[exName] || 0;
      const base = orm > 0 ? roundToPlate(orm * 0.5) : 0;
      const w = base > 0 ? Math.min(roundToPlate(base + session * 5), roundToPlate(orm * 0.95)) : 0;
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
  guide: '【원리】 Power(고중량 저반복)와 Hypertrophy(중중량 고반복)를 한 주에 모두 수행합니다.\n【진행법】 월: 상체 파워(5회) | 화: 하체 파워(5회) | 목: 상체 근비대(10~12회) | 금: 하체 근비대(10~12회)\n【증량】 파워 Day에서 목표 반복 달성 시 +5kg. 근비대 Day는 주차별 자동 강도 증가.\n【대상】 근력+근비대 둘 다 원하는 중급자. 최소 6개월 이상 경력 권장.',
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
  guide: '【원리】 상체와 하체를 번갈아 훈련하여 각 부위에 충분한 회복 시간을 줍니다.\n【진행법】 월: 상체A(프레스 중심) | 화: 하체A(스쿼트 중심) | 목: 상체B(풀 중심) | 금: 하체B(머신 중심)\n8~12회 범위에서 주차별 강도가 자동 증가합니다.\n【대상】 PPL은 주 6일이 부담스러운 중급자에게 추천. 주 4일로 균형 잡힌 근비대.',
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
  guide: '【원리】 5/3/1을 기반으로 T1(메인 9세트)과 T2(보조 8세트)로 높은 볼륨을 소화합니다.\n【진행법】 월: 벤치+OHP보조 | 화: 스쿼트+데드보조 | 목: OHP+벤치보조 | 금: 데드+스쿼트보조\nT1은 75→95%까지 올렸다가 내려오는 역피라미드. T2는 50~65%로 볼륨 채우기.\n【증량】 매주 TM +5kg (매우 공격적). 실패 시 TM 5% 하향.\n【대상】 5/3/1이 너무 느린 중급자. 빠른 근력 향상을 원하는 사람.',
  type: 'strength',
  daysPerWeek: 4,
  durationWeeks: 6,
  exercises: ['벤치프레스', '오버헤드 프레스', '스쿼트', '데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    // nSuns T1: 메인 리프트 8~9세트, 주차별 TM 증가
    function t1Sets(exName: string, weekNum: number) {
      const orm = oneRepMaxes[exName] || 0;
      const tm = orm > 0 ? roundToPlate(orm * 0.9 + (weekNum - 1) * 5) : 0;
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
      const tm = orm > 0 ? roundToPlate(orm * 0.9 + (weekNum - 1) * 5) : 0;
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
    return { label: `Week ${week} (TM +${(week-1)*5}kg)`, days };
  },
};

// GZCLP (주3일, 초중급 스트렝스)
const gzclp: ProgramTemplate = {
  id: 'gzclp',
  name: 'GZCLP',
  description: '주 3~4일. 3단계 피라미드(T1/T2/T3). 체계적인 초중급 스트렝스 프로그램',
  guide: '【원리】 Cody Lefever의 3단계 시스템. T1(고중량 3회), T2(중중량 10회), T3(저중량 고반복 보조).\n【진행법】 Day1: 스쿼트T1+벤치T2 | Day2: OHPT1+데드T2 | Day3: 벤치T1+스쿼트T2\nT1은 5×3(마지막 AMRAP), T2는 3×10. 매주 +5kg.\n【실패 시】 T1 실패: 6×2로 전환 → 10×1로 전환 → 리셋. T2도 유사.\n【대상】 StrongLifts/SS 이후 초중급자. 명확한 진행 규칙이 장점.',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 8,
  exercises: ['스쿼트', '벤치프레스', '데드리프트', '오버헤드 프레스'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    // T1: 5x3+ (고중량, 저반복) → 매주 +5kg
    function t1(exName: string) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * 0.85 + (week - 1) * 5) : 0;
      return { exerciseName: `${exName} (T1)`, sets: Array.from({ length: 5 }, () => ({
        percentage: orm > 0 ? Math.round((w / orm) * 100) : 0, reps: 3, weight: w || undefined,
      }))};
    }
    // T2: 3x10 (중중량, 중반복) → 매주 +5kg
    function t2(exName: string) {
      const orm = oneRepMaxes[exName] || 0;
      const w = orm > 0 ? roundToPlate(orm * 0.65 + (week - 1) * 5) : 0;
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
  guide: '【원리】 매일 상체+하체를 함께 훈련하여 각 근육을 주 3회 자극합니다. 빈도가 높아 초보자 근비대에 최적.\n【진행법】 A: 스쿼트/벤치/랫풀다운 | B: RDL/OHP/로우 | C: 스쿼트/벤치/로우\n모든 종목 3×10. 주차별 강도 65%→78% 자동 증가.\n【대상】 운동 초보~중급. 분할 훈련이 익숙하지 않은 사람에게 추천.',
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
  guide: '【원리】 맨몸 운동만으로 전신을 훈련합니다. 무게 대신 횟수와 세트를 점진적으로 늘립니다.\n【진행법】 Push Day: 푸시업/딥스/플랭크 | Pull Day: 풀업/레그레이즈/플랭크 | Legs+Core: 스쿼트/레그레이즈/푸시업\n주차별로 반복수 8→20, 세트 3→5로 증가.\n【장점】 장비 없이 어디서든 가능. 관절에 부담이 적음.\n【대상】 헬스장 없이 운동하고 싶은 사람, 여행 중, 홈트레이닝.',
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
  guide: '【원리】 Layne Norton 박사의 과학 기반 프로그램. 주 초에 파워(5회), 주 후반에 근비대(12~15회).\n【진행법】 월: 상체 파워 | 화: 하체 파워 | 목: 등+어깨 근비대 | 금: 하체 근비대 | 토: 가슴+팔 근비대\n파워 Day: 1RM의 82~92%, 근비대 Day: 62~75%.\n【대상】 상급자(1년+ 경력). 주 5일 훈련 + 충분한 영양/수면이 필수.',
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
  description: '주 3일 A/B 교대. Mark Rippetoe의 초보자 스트렝스 프로그램. 매 세션 +5kg',
  guide: '【원리】 Mark Rippetoe의 바이블. 스쿼트/벤치/데드/OHP/로우 5가지 복합운동에만 집중합니다.\n【진행법】 A: 스쿼트3×5/벤치3×5/데드1×5 | B: 스쿼트3×5/OHP3×5/로우3×5\nA-B-A / B-A-B 교대. 스쿼트는 매 세션 실시.\n【증량】 매 세션 성공 시 +5kg. 데드리프트는 +5kg 가능.\n【핵심】 보조 운동 없이 복합 운동만. "강해지려면 무거운 걸 들어라"가 철학.\n【대상】 완전 초보자. 빈 바부터 시작해도 3개월 후 눈에 띄는 변화.',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 12,
  exercises: ['스쿼트', '벤치프레스', '데드리프트', '오버헤드 프레스', '바벨 로우'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    function calc(exName: string, session: number, sets: number, reps: number) {
      const orm = oneRepMaxes[exName] || 0;
      const base = orm > 0 ? roundToPlate(orm * 0.55) : 0;
      const w = base > 0 ? Math.min(roundToPlate(base + session * 5), roundToPlate(orm * 0.95)) : 0;
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
  guide: '【원리】 SS를 개선한 프로그램. 핵심 차이점: 마지막 세트를 AMRAP(최대 반복)으로 실시합니다.\n【진행법】 A: 벤치2×5+1×5+(AMRAP)/스쿼트2×5+1×5+ | B: OHP2×5+1×5+/데드1×5+\nA-B-A / B-A-B 교대.\n【증량】 벤치/OHP: +5kg/세션. 스쿼트/데드: +5kg/세션.\nAMRAP에서 10회 이상 달성 시 2배 증량 가능!\n【장점】 SS보다 유연하고, AMRAP이 자연스러운 오토레귤레이션 역할.\n【대상】 초보자. SS보다 약간 더 재미있고 유연한 프로그램을 원할 때.',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 12,
  exercises: ['벤치프레스', '오버헤드 프레스', '스쿼트', '데드리프트', '친업'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    function calc(exName: string, session: number, sets: number, reps: number, amrap: boolean = false) {
      const orm = oneRepMaxes[exName] || 0;
      const base = orm > 0 ? roundToPlate(orm * 0.6) : 0;
      const w = base > 0 ? Math.min(roundToPlate(base + session * 5), roundToPlate(orm * 0.95)) : 0;
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
  guide: '【원리】 한 주를 볼륨(축적)→회복→강도(PR 도전) 3일로 나눕니다. 주간 주기화의 원조.\n【진행법】 월(볼륨): 5×5 @ 5RM의 90% | 수(회복): 2×5 @ 볼륨의 80% | 금(강도): 1×5 새 PR 도전\n벤치/OHP를 격주로 교대.\n【증량】 금요일에 새 5RM을 달성하면 다음 주 볼륨 Day 무게도 올림.\n【대상】 SS/SL에서 선형 진행이 멈춘 중급자. 주 3일만으로 계속 강해지고 싶을 때.',
  type: 'strength',
  daysPerWeek: 3,
  durationWeeks: 8,
  exercises: ['스쿼트', '벤치프레스', '오버헤드 프레스', '데드리프트'],
  getWeekPlan(week: number, oneRepMaxes: Record<string, number>): WeekPlan {
    const ex = this.exercises;
    const isOdd = week % 2 === 1;
    const pressEx = isOdd ? ex[1] : ex[2];
    const baseIncrease = (week - 1) * 5;

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
  guide: '【원리】 Chad Wesley Smith의 4파동 시스템. 10회→8회→5회→3회로 반복수가 줄고 강도가 올라갑니다.\n【진행법】 4주×4파동=16주. 각 파동 내: 축적→강화→실현→디로드\n각 Day마다 1종목에 집중 (스쿼트/벤치/데드/OHP).\n3주차 마지막 세트는 AMRAP으로 다음 파동 무게를 결정합니다.\n【핵심】 자동조절(Autoregulation) — AMRAP 결과에 따라 무게가 조정되어 과훈련 방지.\n【대상】 중급~상급자. 장기적이고 체계적인 성장을 원하는 사람.',
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
  guide: '【원리】 Jonnie Candito의 6주 블록 주기화. 근비대에서 시작해 점차 강도를 올려 6주차에 1RM을 테스트합니다.\n【진행법】 1~2주: 근비대(8~10회 70~73%) | 3주: 선형 Max OT(5회 82%) | 4주: 강도 전환(3회 87%) | 5주: 고부하(2회 92%) | 6주: 1RM 테스트(1회 95%+)\n상체/하체 교대로 주 4일.\n【핵심】 6주마다 1RM을 측정하여 진행 상황을 객관적으로 확인.\n【대상】 대회 준비 또는 정기적으로 최대 근력을 테스트하고 싶은 중상급자.',
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
  guide: '【원리】 아놀드 슈워제네거의 실제 훈련 방식. 길항근(가슴+등)을 같은 날 훈련하여 슈퍼셋을 활용합니다.\n【진행법】 월/목: 가슴+등 (벤치/로우/딥스/친업) | 화/금: 어깨+팔 (OHP/레이즈/컬/스컬크러셔) | 수/토: 하체 (스쿼트/레그프레스/레그컬/카프)\n모든 종목 8~12회 3~4세트. 주차별 강도 65%→78%.\n【핵심】 볼륨이 매우 높음(주 6일). 충분한 영양과 수면이 필수.\n【대상】 클래식 보디빌딩 스타일을 원하는 중상급자. 최소 1년 경력 권장.',
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
