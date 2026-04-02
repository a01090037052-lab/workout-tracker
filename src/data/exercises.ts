import type { Exercise } from '../types';

export const defaultExercises: Omit<Exercise, 'id'>[] = [
  // ===== 가슴 =====
  // 바벨
  { name: '벤치프레스', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '바벨', description: '평평한 벤치에 누워 바벨을 밀어올리는 운동', isCustom: false },
  { name: '인클라인 벤치프레스', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '바벨', description: '경사 벤치에서 바벨을 밀어올리는 운동 (윗가슴)', isCustom: false },
  { name: '디클라인 벤치프레스', muscleGroup: '가슴', secondaryMuscle: ['삼두'], equipmentType: '바벨', description: '하향 경사 벤치에서 바벨을 밀어올리는 운동 (아랫가슴)', isCustom: false },
  // 덤벨
  { name: '덤벨 벤치프레스', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '덤벨', description: '벤치에 누워 덤벨을 밀어올리는 운동', isCustom: false },
  { name: '인클라인 덤벨 프레스', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '덤벨', description: '경사 벤치에서 덤벨을 밀어올리는 운동', isCustom: false },
  { name: '덤벨 플라이', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '덤벨', description: '벤치에 누워 덤벨을 양옆으로 벌리는 운동', isCustom: false },
  { name: '인클라인 덤벨 플라이', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '덤벨', description: '경사 벤치에서 덤벨을 벌리는 운동 (윗가슴)', isCustom: false },
  // 머신
  { name: '체스트 프레스 머신', muscleGroup: '가슴', secondaryMuscle: ['삼두'], equipmentType: '머신', description: '머신에서 가슴을 밀어내는 운동', isCustom: false },
  { name: '인클라인 체스트 프레스 머신', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '머신', description: '경사 머신에서 윗가슴을 밀어내는 운동', isCustom: false },
  { name: '펙덱 플라이', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 팔을 모으는 가슴 고립 운동', isCustom: false },
  // 케이블
  { name: '케이블 크로스오버', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 양쪽에서 교차하며 당기는 운동', isCustom: false },
  { name: '로우 케이블 플라이', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '케이블', description: '아래에서 위로 케이블을 모으는 운동 (윗가슴)', isCustom: false },
  // 맨몸
  { name: '딥스', muscleGroup: '가슴', secondaryMuscle: ['삼두'], equipmentType: '맨몸', description: '평행봉에서 몸을 내렸다 올리는 운동', isCustom: false },
  { name: '푸시업', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '맨몸', description: '엎드려 팔로 밀어올리는 기본 가슴 운동', isCustom: false },
  { name: '인클라인 푸시업', muscleGroup: '가슴', secondaryMuscle: ['삼두'], equipmentType: '맨몸', description: '손을 높은 곳에 올려 하는 쉬운 푸시업 (아랫가슴)', isCustom: false },
  { name: '디클라인 푸시업', muscleGroup: '가슴', secondaryMuscle: ['삼두', '어깨'], equipmentType: '맨몸', description: '발을 높은 곳에 올려 하는 어려운 푸시업 (윗가슴)', isCustom: false },
  { name: '다이아몬드 푸시업', muscleGroup: '가슴', secondaryMuscle: ['삼두'], equipmentType: '맨몸', description: '손을 모아 삼각형 만들고 하는 푸시업 (안쪽 가슴+삼두)', isCustom: false },
  { name: '와이드 푸시업', muscleGroup: '가슴', secondaryMuscle: [], equipmentType: '맨몸', description: '넓은 간격으로 하는 푸시업 (가슴 바깥쪽)', isCustom: false },

  // ===== 등 =====
  // 바벨
  { name: '데드리프트', muscleGroup: '등', secondaryMuscle: ['하체', '코어'], equipmentType: '바벨', description: '바닥의 바벨을 허리와 다리로 들어올리는 운동', isCustom: false },
  { name: '바벨 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '바벨', description: '상체를 숙이고 바벨을 당기는 운동', isCustom: false },
  { name: '펜들레이 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '바벨', description: '바닥에서 바벨을 폭발적으로 당기는 운동', isCustom: false },
  { name: '티바 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '바벨', description: 'T자 바에서 당기는 등 운동', isCustom: false },
  // 덤벨
  { name: '덤벨 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '덤벨', description: '한 팔씩 덤벨을 당기는 운동', isCustom: false },
  { name: '덤벨 풀오버', muscleGroup: '등', secondaryMuscle: ['가슴'], equipmentType: '덤벨', description: '벤치에 누워 덤벨을 머리 뒤로 내리는 운동', isCustom: false },
  // 머신
  { name: '시티드 로우 머신', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '머신', description: '머신에 앉아 등을 당기는 운동', isCustom: false },
  { name: '랫풀다운 머신', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '머신', description: '머신에서 바를 아래로 당기는 등 운동', isCustom: false },
  { name: '어시스트 풀업 머신', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '머신', description: '보조 무게로 풀업을 도와주는 머신', isCustom: false },
  { name: '로우 머신 (해머스트렝스)', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '머신', description: '플레이트 로딩 방식의 로우 머신', isCustom: false },
  // 케이블
  { name: '랫풀다운', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '케이블', description: '넓은 그립으로 케이블을 아래로 당기는 운동', isCustom: false },
  { name: '시티드 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '케이블', description: '앉아서 케이블을 몸쪽으로 당기는 운동', isCustom: false },
  { name: '클로즈그립 랫풀다운', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '케이블', description: '좁은 그립으로 케이블을 당기는 운동', isCustom: false },
  { name: '스트레이트 암 풀다운', muscleGroup: '등', secondaryMuscle: [], equipmentType: '케이블', description: '팔을 펴고 케이블을 내리는 등 고립 운동', isCustom: false },
  // 맨몸
  { name: '풀업', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '맨몸', description: '철봉에 매달려 몸을 끌어올리는 운동', isCustom: false },
  { name: '친업', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '맨몸', description: '언더그립으로 철봉에서 당기는 운동', isCustom: false },
  { name: '인버티드 로우', muscleGroup: '등', secondaryMuscle: ['이두'], equipmentType: '맨몸', description: '바 아래에 누워 몸을 당겨올리는 운동', isCustom: false },
  { name: '슈퍼맨', muscleGroup: '등', secondaryMuscle: ['코어'], equipmentType: '맨몸', description: '엎드려 팔다리를 동시에 들어올리는 등 운동', isCustom: false },

  // ===== 어깨 =====
  // 바벨
  { name: '오버헤드 프레스', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '바벨', description: '바벨을 머리 위로 밀어올리는 운동', isCustom: false },
  { name: '비하인드 넥 프레스', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '바벨', description: '바벨을 목 뒤로 밀어올리는 운동', isCustom: false },
  { name: '바벨 업라이트 로우', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '바벨', description: '바벨을 턱까지 당겨올리는 운동', isCustom: false },
  // 덤벨
  { name: '덤벨 숄더 프레스', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '덤벨', description: '덤벨을 머리 위로 밀어올리는 운동', isCustom: false },
  { name: '사이드 레터럴 레이즈', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '덤벨', description: '덤벨을 양옆으로 들어올리는 운동 (측면 삼각근)', isCustom: false },
  { name: '프론트 레이즈', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '덤벨', description: '덤벨을 앞으로 들어올리는 운동 (전면 삼각근)', isCustom: false },
  { name: '리어 델트 플라이', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '덤벨', description: '상체를 숙이고 덤벨을 벌리는 운동 (후면 삼각근)', isCustom: false },
  { name: '아놀드 프레스', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '덤벨', description: '회전하며 밀어올리는 덤벨 숄더 프레스', isCustom: false },
  // 머신
  { name: '숄더 프레스 머신', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '머신', description: '머신에서 어깨를 밀어올리는 운동', isCustom: false },
  { name: '레터럴 레이즈 머신', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 팔을 옆으로 올리는 운동', isCustom: false },
  { name: '리어 델트 머신', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 후면 삼각근을 수축하는 운동', isCustom: false },
  // 케이블
  { name: '페이스 풀', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 얼굴 높이로 당기는 운동 (후면 삼각근)', isCustom: false },
  { name: '케이블 레터럴 레이즈', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '케이블', description: '케이블로 팔을 옆으로 올리는 운동', isCustom: false },
  { name: '케이블 프론트 레이즈', muscleGroup: '어깨', secondaryMuscle: [], equipmentType: '케이블', description: '케이블로 팔을 앞으로 올리는 운동', isCustom: false },
  // 맨몸
  { name: '파이크 푸시업', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '맨몸', description: '엉덩이를 높이 들고 하는 푸시업 (어깨 집중)', isCustom: false },
  { name: '핸드스탠드 푸시업', muscleGroup: '어깨', secondaryMuscle: ['삼두'], equipmentType: '맨몸', description: '물구나무 서서 밀어올리는 고급 어깨 운동', isCustom: false },

  // ===== 이두 =====
  // 바벨
  { name: '바벨 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '바벨', description: '바벨을 들어올리는 이두 운동', isCustom: false },
  { name: 'EZ바 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '바벨', description: 'EZ바로 손목 부담을 줄인 이두 운동', isCustom: false },
  { name: '프리처 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '바벨', description: '프리처 벤치에서 이두를 고립하는 운동', isCustom: false },
  // 덤벨
  { name: '덤벨 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '덤벨', description: '덤벨을 들어올리는 이두 운동', isCustom: false },
  { name: '해머 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '덤벨', description: '중립 그립으로 덤벨을 들어올리는 운동', isCustom: false },
  { name: '인클라인 덤벨 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '덤벨', description: '경사 벤치에 기대어 이두를 늘려서 컬하는 운동', isCustom: false },
  { name: '컨센트레이션 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '덤벨', description: '무릎에 팔을 고정하고 이두를 집중 수축하는 운동', isCustom: false },
  // 머신
  { name: '바이셉 컬 머신', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 이두를 고립하는 운동', isCustom: false },
  // 케이블
  { name: '케이블 컬', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '케이블', description: '케이블로 이두를 수축하는 운동', isCustom: false },
  { name: '케이블 해머 컬 (로프)', muscleGroup: '이두', secondaryMuscle: [], equipmentType: '케이블', description: '로프 어태치먼트로 해머 컬하는 운동', isCustom: false },

  // ===== 삼두 =====
  // 바벨
  { name: '스컬크러셔', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '바벨', description: '벤치에 누워 바벨을 이마 쪽으로 내리는 운동', isCustom: false },
  { name: '클로즈그립 벤치프레스', muscleGroup: '삼두', secondaryMuscle: ['가슴'], equipmentType: '바벨', description: '좁은 그립으로 벤치프레스하는 삼두 운동', isCustom: false },
  // 덤벨
  { name: '오버헤드 익스텐션', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '덤벨', description: '머리 뒤로 덤벨을 내렸다 올리는 운동', isCustom: false },
  { name: '덤벨 킥백', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '덤벨', description: '상체를 숙이고 팔을 뒤로 펴는 삼두 운동', isCustom: false },
  // 머신
  { name: '트라이셉 딥 머신', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 삼두를 밀어내는 운동', isCustom: false },
  { name: '트라이셉 익스텐션 머신', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 삼두를 펴는 운동', isCustom: false },
  // 케이블
  { name: '트라이셉 푸시다운', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 아래로 밀어내는 삼두 운동', isCustom: false },
  { name: '케이블 오버헤드 익스텐션', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 머리 위로 펴는 삼두 운동', isCustom: false },
  { name: '로프 푸시다운', muscleGroup: '삼두', secondaryMuscle: [], equipmentType: '케이블', description: '로프 어태치먼트로 삼두를 밀어내는 운동', isCustom: false },
  // 맨몸
  { name: '벤치 딥스', muscleGroup: '삼두', secondaryMuscle: ['가슴'], equipmentType: '맨몸', description: '벤치에 손을 짚고 몸을 내렸다 올리는 삼두 운동', isCustom: false },

  // ===== 하체 =====
  // 바벨
  { name: '스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '바벨', description: '바벨을 어깨에 메고 앉았다 일어나는 운동', isCustom: false },
  { name: '프론트 스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '바벨', description: '바벨을 앞쪽에 올리고 스쿼트하는 운동', isCustom: false },
  { name: '루마니안 데드리프트', muscleGroup: '하체', secondaryMuscle: ['등'], equipmentType: '바벨', description: '무릎을 약간 구부리고 바벨을 내리는 후면 사슬 운동', isCustom: false },
  { name: '힙 쓰러스트', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '바벨', description: '등을 벤치에 기대고 엉덩이를 들어올리는 운동', isCustom: false },
  { name: '바벨 런지', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '바벨', description: '바벨을 메고 한 발씩 내딛는 운동', isCustom: false },
  // 덤벨
  { name: '덤벨 런지', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '덤벨', description: '덤벨을 들고 한 발 앞으로 내딛으며 앉는 운동', isCustom: false },
  { name: '덤벨 스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '덤벨', description: '덤벨을 들고 스쿼트하는 운동', isCustom: false },
  { name: '고블릿 스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '덤벨', description: '덤벨을 가슴 앞에 안고 스쿼트하는 운동', isCustom: false },
  { name: '불가리안 스플릿 스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '덤벨', description: '뒤 발을 벤치에 올리고 한 다리로 스쿼트', isCustom: false },
  { name: '덤벨 루마니안 데드리프트', muscleGroup: '하체', secondaryMuscle: ['등'], equipmentType: '덤벨', description: '덤벨로 하는 루마니안 데드리프트', isCustom: false },
  // 머신
  { name: '레그프레스', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 다리로 무게를 밀어내는 운동', isCustom: false },
  { name: '해크 스쿼트 머신', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 등을 기대고 스쿼트하는 운동', isCustom: false },
  { name: '레그 익스텐션', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '앉아서 다리를 펴는 전면 허벅지 운동', isCustom: false },
  { name: '레그 컬', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '엎드려서 다리를 구부리는 후면 허벅지 운동', isCustom: false },
  { name: '시티드 레그 컬', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '앉아서 다리를 구부리는 후면 허벅지 운동', isCustom: false },
  { name: '카프 레이즈 머신', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 종아리를 수축하는 운동', isCustom: false },
  { name: '힙 어브덕션 머신', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 다리를 바깥으로 벌리는 운동 (외전근)', isCustom: false },
  { name: '힙 어덕션 머신', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 다리를 안쪽으로 모으는 운동 (내전근)', isCustom: false },
  { name: '글루트 킥백 머신', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 다리를 뒤로 차는 엉덩이 운동', isCustom: false },
  { name: '스미스 머신 스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '머신', description: '스미스 머신에서 가이드 레일 따라 스쿼트', isCustom: false },
  // 케이블
  { name: '케이블 킥백', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '케이블', description: '케이블로 다리를 뒤로 차는 엉덩이 운동', isCustom: false },
  // 맨몸
  { name: '맨몸 스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '맨몸', description: '무게 없이 앉았다 일어나는 기본 스쿼트', isCustom: false },
  { name: '점프 스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '맨몸', description: '스쿼트 후 점프하는 폭발적 운동', isCustom: false },
  { name: '피스톨 스쿼트', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '맨몸', description: '한 다리로 앉았다 일어나는 고급 맨몸 운동', isCustom: false },
  { name: '맨몸 런지', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '맨몸', description: '무게 없이 한 발씩 내딛는 운동', isCustom: false },
  { name: '글루트 브릿지', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 엉덩이를 들어올리는 운동', isCustom: false },
  { name: '스텝업', muscleGroup: '하체', secondaryMuscle: ['코어'], equipmentType: '맨몸', description: '높은 곳에 한 발씩 올라서는 운동', isCustom: false },
  { name: '월 싯', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '맨몸', description: '벽에 등을 대고 앉은 자세로 버티는 운동', isCustom: false },
  { name: '카프 레이즈 (맨몸)', muscleGroup: '하체', secondaryMuscle: [], equipmentType: '맨몸', description: '맨몸으로 까치발 들기', isCustom: false },

  // ===== 코어 =====
  // 맨몸
  { name: '플랭크', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '엎드려 팔꿈치로 버티는 코어 운동', isCustom: false },
  { name: '사이드 플랭크', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '옆으로 누워 한쪽 팔꿈치로 버티는 운동', isCustom: false },
  { name: '크런치', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 상체를 말아올리는 복근 운동', isCustom: false },
  { name: '바이시클 크런치', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 자전거 페달 동작으로 복근을 수축하는 운동', isCustom: false },
  { name: '레그레이즈', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 다리를 들어올리는 하복부 운동', isCustom: false },
  { name: '행잉 레그레이즈', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '철봉에 매달려 다리를 올리는 운동', isCustom: false },
  { name: '마운틴 클라이머', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '플랭크 자세에서 무릎을 교대로 당기는 운동', isCustom: false },
  { name: 'V업', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 상체와 다리를 동시에 올리는 운동', isCustom: false },
  { name: '러시안 트위스트', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '앉아서 상체를 좌우로 비트는 복사근 운동', isCustom: false },
  { name: '데드 버그', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 반대쪽 팔다리를 교대로 뻗는 코어 안정화 운동', isCustom: false },
  { name: '버드독', muscleGroup: '코어', secondaryMuscle: ['등'], equipmentType: '맨몸', description: '네 발 자세에서 반대쪽 팔다리를 뻗는 코어 운동', isCustom: false },
  { name: '할로우 바디 홀드', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '맨몸', description: '누워서 팔다리를 떠서 버티는 전신 코어 운동', isCustom: false },
  { name: '버피', muscleGroup: '코어', secondaryMuscle: ['가슴', '하체'], equipmentType: '맨몸', description: '전신 복합 운동. 스쿼트+푸시업+점프', isCustom: false },
  // 케이블
  { name: '케이블 크런치', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 이용한 복근 운동', isCustom: false },
  { name: '케이블 우드챱', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '케이블', description: '케이블을 대각선으로 당기는 복사근 운동', isCustom: false },
  // 머신
  { name: '복근 머신 (크런치)', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 상체를 말아내리는 복근 운동', isCustom: false },
  { name: '로터리 토르소 머신', muscleGroup: '코어', secondaryMuscle: [], equipmentType: '머신', description: '머신에서 상체를 비트는 복사근 운동', isCustom: false },
];
