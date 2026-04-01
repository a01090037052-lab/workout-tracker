import type { Exercise } from '../types';

export const defaultExercises: Omit<Exercise, 'id'>[] = [
  // 가슴
  { name: '벤치프레스', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '바벨', description: '평평한 벤치에 누워 바벨을 밀어올리는 운동', isCustom: false },
  { name: '인클라인 벤치프레스', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '바벨', description: '경사 벤치에서 바벨을 밀어올리는 운동 (윗가슴)', isCustom: false },
  { name: '덤벨 플라이', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '덤벨', description: '벤치에 누워 덤벨을 양옆으로 벌리는 운동', isCustom: false },
  { name: '케이블 크로스오버', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 양쪽에서 교차하며 당기는 운동', isCustom: false },
  { name: '딥스', muscleGroup: '가슴', secondaryMuscle: ['삼두'], equipmentType: '맨몸', description: '평행봉에서 몸을 내렸다 올리는 운동', isCustom: false },
  { name: '덤벨 벤치프레스', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '덤벨', description: '벤치에 누워 덤벨을 밀어올리는 운동', isCustom: false },
  { name: '체스트 프레스 머신', muscleGroup: '가슴', secondaryMuscle: ['삼두'], equipmentType: '머신', description: '머신에서 가슴을 밀어내는 운동', isCustom: false },
  { name: '펙덱 플라이', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 팔을 모으는 가슴 고립 운동', isCustom: false },

  // 등
  { name: '데드리프트', muscleGroup: '등', secondaryMuscle: ['하체', '코어'], equipmentType: '바벨', description: '바닥의 바벨을 허리와 다리로 들어올리는 운동', isCustom: false },
  { name: '풀업', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '맨몸', description: '철봉에 매달려 몸을 끌어올리는 운동', isCustom: false },
  { name: '바벨 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '바벨', description: '상체를 숙이고 바벨을 당기는 운동', isCustom: false },
  { name: '랫풀다운', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '케이블', description: '넓은 그립으로 케이블을 아래로 당기는 운동', isCustom: false },
  { name: '시티드 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '케이블', description: '앉아서 케이블을 몸쪽으로 당기는 운동', isCustom: false },
  { name: '덤벨 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '덤벨', description: '한 팔씩 덤벨을 당기는 운동', isCustom: false },
  { name: '티바 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '바벨', description: 'T자 바에서 당기는 등 운동', isCustom: false },

  // 어깨
  { name: '오버헤드 프레스', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '바벨', description: '바벨을 머리 위로 밀어올리는 운동', isCustom: false },
  { name: '사이드 레터럴 레이즈', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '덤벨', description: '덤벨을 양옆으로 들어올리는 운동 (측면 삼각근)', isCustom: false },
  { name: '페이스 풀', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 얼굴 높이로 당기는 운동 (후면 삼각근)', isCustom: false },
  { name: '프론트 레이즈', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '덤벨', description: '덤벨을 앞으로 들어올리는 운동 (전면 삼각근)', isCustom: false },
  { name: '덤벨 숄더 프레스', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '덤벨', description: '덤벨을 머리 위로 밀어올리는 운동', isCustom: false },
  { name: '숄더 프레스 머신', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '머신', description: '머신에서 어깨를 밀어올리는 운동', isCustom: false },

  // 이두
  { name: '바벨 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '바벨', description: '바벨을 들어올리는 이두 운동', isCustom: false },
  { name: '덤벨 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '덤벨', description: '덤벨을 들어올리는 이두 운동', isCustom: false },
  { name: '해머 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '덤벨', description: '중립 그립으로 덤벨을 들어올리는 운동', isCustom: false },
  { name: '프리처 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '바벨', description: '프리처 벤치에서 이두를 고립하는 운동', isCustom: false },
  { name: '케이블 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '케이블', description: '케이블로 이두를 수축하는 운동', isCustom: false },

  // 삼두
  { name: '트라이셉 푸시다운', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 아래로 밀어내는 삼두 운동', isCustom: false },
  { name: '오버헤드 익스텐션', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '덤벨', description: '머리 뒤로 덤벨을 내렸다 올리는 운동', isCustom: false },
  { name: '스컬크러셔', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '바벨', description: '벤치에 누워 바벨을 이마 쪽으로 내리는 운동', isCustom: false },
  { name: '클로즈그립 벤치프레스', muscleGroup: '삼두', secondaryMuscle: ['가슴'], equipmentType: '바벨', description: '좁은 그립으로 벤치프레스하는 삼두 운동', isCustom: false },
  { name: '케이블 오버헤드 익스텐션', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 머리 위로 펴는 삼두 운동', isCustom: false },

  // 하체
  { name: '스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '바벨', description: '바벨을 어깨에 메고 앉았다 일어나는 운동', isCustom: false },
  { name: '레그프레스', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 다리로 무게를 밀어내는 운동', isCustom: false },
  { name: '레그 익스텐션', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '앉아서 다리를 펴는 전면 허벅지 운동', isCustom: false },
  { name: '레그 컬', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '엎드려서 다리를 구부리는 후면 허벅지 운동', isCustom: false },
  { name: '런지', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '덤벨', description: '한 발 앞으로 내딛으며 앉는 운동', isCustom: false },
  { name: '힙 쓰러스트', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '바벨', description: '등을 벤치에 기대고 엉덩이를 들어올리는 운동', isCustom: false },
  { name: '루마니안 데드리프트', muscleGroup: '하체', secondaryMuscle: ['등'], equipmentType: '바벨', description: '무릎을 약간 구부리고 바벨을 내리는 후면 사슬 운동', isCustom: false },
  { name: '카프 레이즈', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '까치발로 종아리를 수축하는 운동', isCustom: false },

  // 코어
  { name: '플랭크', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '엎드려 팔꿈치로 버티는 코어 운동', isCustom: false },
  { name: '크런치', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 상체를 말아올리는 복근 운동', isCustom: false },
  { name: '레그레이즈', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 다리를 들어올리는 하복부 운동', isCustom: false },
  { name: '행잉 레그레이즈', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '철봉에 매달려 다리를 올리는 운동', isCustom: false },
  { name: '케이블 크런치', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 이용한 복근 운동', isCustom: false },
];
