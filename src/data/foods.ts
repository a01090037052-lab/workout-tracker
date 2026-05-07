import type { Food } from '../types';

/**
 * 기본 식품 영양 정보 (출처: 한국식품영양정보DB / USDA FoodData Central 평균치)
 * 모든 수치는 100g 기준 (음료는 100ml 기준)
 * 사용자가 직접 수정·추가 가능 (Phase 2b)
 */
export const defaultFoods: Omit<Food, 'id'>[] = [
  // ===== 곡류 / 전분 =====
  { name: '흰쌀밥', category: 'grain', kcalPer100g: 130, proteinPer100g: 2.5, carbsPer100g: 28, fatPer100g: 0.3, defaultServing: 210, servingLabel: '1공기 (210g)', isCustom: false },
  { name: '현미밥', category: 'grain', kcalPer100g: 110, proteinPer100g: 2.6, carbsPer100g: 23, fatPer100g: 0.9, defaultServing: 210, servingLabel: '1공기 (210g)', isCustom: false },
  { name: '잡곡밥', category: 'grain', kcalPer100g: 115, proteinPer100g: 3, carbsPer100g: 24, fatPer100g: 0.7, defaultServing: 210, servingLabel: '1공기 (210g)', isCustom: false },
  { name: '흰식빵', category: 'grain', kcalPer100g: 270, proteinPer100g: 8.6, carbsPer100g: 51, fatPer100g: 3.4, defaultServing: 35, servingLabel: '1쪽 (35g)', isCustom: false },
  { name: '통밀빵', category: 'grain', kcalPer100g: 250, proteinPer100g: 11, carbsPer100g: 45, fatPer100g: 3.5, defaultServing: 40, servingLabel: '1쪽 (40g)', isCustom: false },
  { name: '베이글', category: 'grain', kcalPer100g: 280, proteinPer100g: 11, carbsPer100g: 55, fatPer100g: 1.7, defaultServing: 90, servingLabel: '1개 (90g)', isCustom: false },
  { name: '오트밀 (건조)', category: 'grain', kcalPer100g: 380, proteinPer100g: 13, carbsPer100g: 67, fatPer100g: 7, defaultServing: 50, servingLabel: '1회 분량 (50g)', isCustom: false },
  { name: '파스타 (삶은)', category: 'grain', kcalPer100g: 158, proteinPer100g: 5.8, carbsPer100g: 31, fatPer100g: 0.9, defaultServing: 200, servingLabel: '1접시 (200g)', isCustom: false },
  { name: '떡 (가래떡)', category: 'grain', kcalPer100g: 230, proteinPer100g: 4.5, carbsPer100g: 51, fatPer100g: 0.5, defaultServing: 100, isCustom: false },
  { name: '찐고구마', category: 'grain', kcalPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1, defaultServing: 150, servingLabel: '중간 1개 (150g)', isCustom: false },
  { name: '찐감자', category: 'grain', kcalPer100g: 87, proteinPer100g: 1.9, carbsPer100g: 20, fatPer100g: 0.1, defaultServing: 150, servingLabel: '중간 1개 (150g)', isCustom: false },
  { name: '시리얼 (콘플레이크)', category: 'grain', kcalPer100g: 380, proteinPer100g: 7, carbsPer100g: 84, fatPer100g: 0.5, defaultServing: 30, servingLabel: '1회 (30g)', isCustom: false },

  // ===== 단백질 (육류·생선·콩) =====
  { name: '닭가슴살 (생)', category: 'protein', kcalPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, defaultServing: 100, isCustom: false },
  { name: '닭가슴살 (구이)', category: 'protein', kcalPer100g: 200, proteinPer100g: 33, carbsPer100g: 0, fatPer100g: 6, defaultServing: 100, isCustom: false },
  { name: '닭다리살 (껍질포함)', category: 'protein', kcalPer100g: 220, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 14, defaultServing: 100, isCustom: false },
  { name: '돼지 등심', category: 'protein', kcalPer100g: 200, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 12, defaultServing: 100, isCustom: false },
  { name: '돼지 삼겹살', category: 'protein', kcalPer100g: 510, proteinPer100g: 13, carbsPer100g: 0, fatPer100g: 50, defaultServing: 100, isCustom: false },
  { name: '돼지 목살', category: 'protein', kcalPer100g: 230, proteinPer100g: 19, carbsPer100g: 0, fatPer100g: 17, defaultServing: 100, isCustom: false },
  { name: '소 등심', category: 'protein', kcalPer100g: 240, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 15, defaultServing: 100, isCustom: false },
  { name: '소 안심', category: 'protein', kcalPer100g: 160, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 8, defaultServing: 100, isCustom: false },
  { name: '소 갈비', category: 'protein', kcalPer100g: 290, proteinPer100g: 17, carbsPer100g: 0, fatPer100g: 24, defaultServing: 100, isCustom: false },
  { name: '차돌박이', category: 'protein', kcalPer100g: 350, proteinPer100g: 14, carbsPer100g: 0, fatPer100g: 32, defaultServing: 100, isCustom: false },
  { name: '베이컨', category: 'protein', kcalPer100g: 540, proteinPer100g: 37, carbsPer100g: 1.4, fatPer100g: 42, defaultServing: 30, servingLabel: '2조각 (30g)', isCustom: false },
  { name: '햄 (슬라이스)', category: 'protein', kcalPer100g: 145, proteinPer100g: 21, carbsPer100g: 1.5, fatPer100g: 6, defaultServing: 30, isCustom: false },
  { name: '소시지', category: 'protein', kcalPer100g: 300, proteinPer100g: 12, carbsPer100g: 2, fatPer100g: 27, defaultServing: 50, servingLabel: '1개 (50g)', isCustom: false },
  { name: '계란', category: 'protein', kcalPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, defaultServing: 50, servingLabel: '1개 (50g)', isCustom: false },
  { name: '계란 흰자', category: 'protein', kcalPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2, defaultServing: 33, servingLabel: '1개분 (33g)', isCustom: false },
  { name: '두부', category: 'protein', kcalPer100g: 76, proteinPer100g: 8, carbsPer100g: 1.9, fatPer100g: 4.8, defaultServing: 150, servingLabel: '반모 (150g)', isCustom: false },
  { name: '연두부', category: 'protein', kcalPer100g: 55, proteinPer100g: 5, carbsPer100g: 1.5, fatPer100g: 3, defaultServing: 150, isCustom: false },
  { name: '청국장', category: 'protein', kcalPer100g: 120, proteinPer100g: 11, carbsPer100g: 9, fatPer100g: 5, defaultServing: 50, isCustom: false },
  { name: '연어 (생)', category: 'protein', kcalPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, defaultServing: 100, isCustom: false },
  { name: '연어 (구이)', category: 'protein', kcalPer100g: 220, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 14, defaultServing: 100, isCustom: false },
  { name: '참치 (통조림)', category: 'protein', kcalPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 0.8, defaultServing: 100, servingLabel: '1캔 (100g)', isCustom: false },
  { name: '고등어 (구이)', category: 'protein', kcalPer100g: 230, proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 14, defaultServing: 100, isCustom: false },
  { name: '명태', category: 'protein', kcalPer100g: 80, proteinPer100g: 17, carbsPer100g: 0, fatPer100g: 0.7, defaultServing: 100, isCustom: false },
  { name: '새우', category: 'protein', kcalPer100g: 99, proteinPer100g: 24, carbsPer100g: 0.2, fatPer100g: 0.3, defaultServing: 100, isCustom: false },
  { name: '오징어', category: 'protein', kcalPer100g: 92, proteinPer100g: 16, carbsPer100g: 3, fatPer100g: 1.4, defaultServing: 100, isCustom: false },

  // ===== 유제품 =====
  { name: '우유', category: 'dairy', kcalPer100g: 60, proteinPer100g: 3.2, carbsPer100g: 4.7, fatPer100g: 3.3, defaultServing: 200, servingLabel: '1팩 (200ml)', isCustom: false },
  { name: '두유', category: 'dairy', kcalPer100g: 54, proteinPer100g: 3.3, carbsPer100g: 6.3, fatPer100g: 1.8, defaultServing: 200, servingLabel: '1팩 (200ml)', isCustom: false },
  { name: '슬라이스 치즈', category: 'dairy', kcalPer100g: 350, proteinPer100g: 20, carbsPer100g: 5, fatPer100g: 27, defaultServing: 20, servingLabel: '1장 (20g)', isCustom: false },
  { name: '그릭요거트', category: 'dairy', kcalPer100g: 60, proteinPer100g: 10, carbsPer100g: 4, fatPer100g: 0.5, defaultServing: 100, servingLabel: '1컵 (100g)', isCustom: false },
  { name: '일반요거트', category: 'dairy', kcalPer100g: 60, proteinPer100g: 3.5, carbsPer100g: 8, fatPer100g: 1.5, defaultServing: 100, servingLabel: '1컵 (100g)', isCustom: false },

  // ===== 채소 =====
  { name: '양배추', category: 'vegetable', kcalPer100g: 25, proteinPer100g: 1.3, carbsPer100g: 5.8, fatPer100g: 0.1, defaultServing: 100, isCustom: false },
  { name: '브로콜리', category: 'vegetable', kcalPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4, defaultServing: 100, isCustom: false },
  { name: '시금치', category: 'vegetable', kcalPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, defaultServing: 100, isCustom: false },
  { name: '오이', category: 'vegetable', kcalPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, defaultServing: 150, servingLabel: '중간 1개', isCustom: false },
  { name: '토마토', category: 'vegetable', kcalPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, defaultServing: 150, servingLabel: '중간 1개', isCustom: false },
  { name: '당근', category: 'vegetable', kcalPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2, defaultServing: 100, isCustom: false },
  { name: '양파', category: 'vegetable', kcalPer100g: 40, proteinPer100g: 1.1, carbsPer100g: 9.3, fatPer100g: 0.1, defaultServing: 100, isCustom: false },
  { name: '양송이버섯', category: 'vegetable', kcalPer100g: 22, proteinPer100g: 3.1, carbsPer100g: 3.3, fatPer100g: 0.3, defaultServing: 100, isCustom: false },
  { name: '김치', category: 'vegetable', kcalPer100g: 34, proteinPer100g: 2.3, carbsPer100g: 5.2, fatPer100g: 0.8, defaultServing: 50, isCustom: false },
  { name: '콩나물', category: 'vegetable', kcalPer100g: 31, proteinPer100g: 4, carbsPer100g: 3, fatPer100g: 1.4, defaultServing: 100, isCustom: false },
  { name: '미역', category: 'vegetable', kcalPer100g: 45, proteinPer100g: 3, carbsPer100g: 9, fatPer100g: 0.6, defaultServing: 50, isCustom: false },
  { name: '구운 김', category: 'vegetable', kcalPer100g: 350, proteinPer100g: 40, carbsPer100g: 50, fatPer100g: 4, defaultServing: 2, servingLabel: '1봉 (2g)', isCustom: false },

  // ===== 과일 =====
  { name: '사과', category: 'fruit', kcalPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, defaultServing: 200, servingLabel: '중간 1개 (200g)', isCustom: false },
  { name: '바나나', category: 'fruit', kcalPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, defaultServing: 120, servingLabel: '1개 (120g)', isCustom: false },
  { name: '오렌지', category: 'fruit', kcalPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1, defaultServing: 150, servingLabel: '1개 (150g)', isCustom: false },
  { name: '귤', category: 'fruit', kcalPer100g: 53, proteinPer100g: 0.8, carbsPer100g: 13, fatPer100g: 0.3, defaultServing: 80, servingLabel: '1개 (80g)', isCustom: false },
  { name: '포도', category: 'fruit', kcalPer100g: 67, proteinPer100g: 0.6, carbsPer100g: 17, fatPer100g: 0.4, defaultServing: 100, isCustom: false },
  { name: '딸기', category: 'fruit', kcalPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3, defaultServing: 100, isCustom: false },
  { name: '블루베리', category: 'fruit', kcalPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14, fatPer100g: 0.3, defaultServing: 100, isCustom: false },
  { name: '키위', category: 'fruit', kcalPer100g: 61, proteinPer100g: 1.1, carbsPer100g: 15, fatPer100g: 0.5, defaultServing: 100, servingLabel: '1개 (100g)', isCustom: false },
  { name: '수박', category: 'fruit', kcalPer100g: 30, proteinPer100g: 0.6, carbsPer100g: 7.6, fatPer100g: 0.2, defaultServing: 200, servingLabel: '1조각 (200g)', isCustom: false },
  { name: '아보카도', category: 'fruit', kcalPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15, defaultServing: 100, servingLabel: '반 개 (100g)', isCustom: false },

  // ===== 견과 (snack) =====
  { name: '아몬드', category: 'snack', kcalPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50, defaultServing: 30, servingLabel: '1줌 (30g)', isCustom: false },
  { name: '호두', category: 'snack', kcalPer100g: 654, proteinPer100g: 15, carbsPer100g: 14, fatPer100g: 65, defaultServing: 30, isCustom: false },
  { name: '땅콩', category: 'snack', kcalPer100g: 567, proteinPer100g: 26, carbsPer100g: 16, fatPer100g: 49, defaultServing: 30, isCustom: false },

  // ===== 기름 / 소스 =====
  { name: '올리브오일', category: 'sauce', kcalPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, defaultServing: 10, servingLabel: '1스푼 (10g)', isCustom: false },
  { name: '참기름', category: 'sauce', kcalPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, defaultServing: 10, servingLabel: '1스푼 (10g)', isCustom: false },
  { name: '마요네즈', category: 'sauce', kcalPer100g: 680, proteinPer100g: 1, carbsPer100g: 0.6, fatPer100g: 75, defaultServing: 15, servingLabel: '1스푼 (15g)', isCustom: false },
  { name: '케첩', category: 'sauce', kcalPer100g: 100, proteinPer100g: 1.7, carbsPer100g: 27, fatPer100g: 0.3, defaultServing: 15, servingLabel: '1스푼 (15g)', isCustom: false },
  { name: '고추장', category: 'sauce', kcalPer100g: 230, proteinPer100g: 5.5, carbsPer100g: 51, fatPer100g: 1, defaultServing: 15, servingLabel: '1스푼 (15g)', isCustom: false },

  // ===== 음료 =====
  { name: '물', category: 'beverage', kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, defaultServing: 500, servingLabel: '1컵 (500ml)', isCustom: false },
  { name: '보리차', category: 'beverage', kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, defaultServing: 500, isCustom: false },
  { name: '블랙커피', category: 'beverage', kcalPer100g: 2, proteinPer100g: 0.1, carbsPer100g: 0, fatPer100g: 0, defaultServing: 200, servingLabel: '1컵 (200ml)', isCustom: false },
  { name: '콜라', category: 'beverage', kcalPer100g: 42, proteinPer100g: 0, carbsPer100g: 11, fatPer100g: 0, defaultServing: 250, servingLabel: '1캔 (250ml)', isCustom: false },
  { name: '맥주', category: 'beverage', kcalPer100g: 43, proteinPer100g: 0.5, carbsPer100g: 3.6, fatPer100g: 0, defaultServing: 500, servingLabel: '1잔 (500ml)', isCustom: false },
  { name: '소주 (17도)', category: 'beverage', kcalPer100g: 130, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, defaultServing: 50, servingLabel: '1잔 (50ml)', isCustom: false },

  // ===== 가공식품 / 한식 =====
  { name: '라면', category: 'processed', kcalPer100g: 510, proteinPer100g: 11, carbsPer100g: 75, fatPer100g: 19, defaultServing: 120, servingLabel: '1봉 (120g)', isCustom: false },
  { name: '김밥', category: 'processed', kcalPer100g: 210, proteinPer100g: 6, carbsPer100g: 30, fatPer100g: 6, defaultServing: 230, servingLabel: '1줄 (230g)', isCustom: false },
  { name: '떡볶이', category: 'processed', kcalPer100g: 240, proteinPer100g: 4, carbsPer100g: 45, fatPer100g: 4, defaultServing: 200, servingLabel: '1인분 (200g)', isCustom: false },
  { name: '비빔밥', category: 'processed', kcalPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 19, fatPer100g: 2.8, defaultServing: 500, servingLabel: '1그릇 (500g)', isCustom: false },
  { name: '피자 (1조각)', category: 'processed', kcalPer100g: 220, proteinPer100g: 9.2, carbsPer100g: 27, fatPer100g: 7.7, defaultServing: 130, servingLabel: '1조각 (130g)', isCustom: false },
  { name: '햄버거', category: 'processed', kcalPer100g: 270, proteinPer100g: 12.5, carbsPer100g: 22.5, fatPer100g: 14, defaultServing: 200, servingLabel: '1개 (200g)', isCustom: false },
  { name: '치킨 (다리)', category: 'processed', kcalPer100g: 290, proteinPer100g: 24, carbsPer100g: 10, fatPer100g: 17, defaultServing: 100, servingLabel: '1조각 (100g)', isCustom: false },
  { name: '만두', category: 'processed', kcalPer100g: 250, proteinPer100g: 10, carbsPer100g: 30, fatPer100g: 10, defaultServing: 80, servingLabel: '4개 (80g)', isCustom: false },
  { name: '김치찌개', category: 'processed', kcalPer100g: 80, proteinPer100g: 6, carbsPer100g: 4, fatPer100g: 4, defaultServing: 400, servingLabel: '1인분 (400g)', isCustom: false },
  { name: '된장찌개', category: 'processed', kcalPer100g: 65, proteinPer100g: 5, carbsPer100g: 4, fatPer100g: 3, defaultServing: 400, servingLabel: '1인분 (400g)', isCustom: false },

  // ===== 배달·외식 =====
  // 치킨
  { name: '후라이드 치킨', category: 'delivery', kcalPer100g: 290, proteinPer100g: 24, carbsPer100g: 10, fatPer100g: 17, defaultServing: 100, servingLabel: '1조각 (100g)', isCustom: false },
  { name: '양념 치킨', category: 'delivery', kcalPer100g: 305, proteinPer100g: 22, carbsPer100g: 18, fatPer100g: 16, defaultServing: 100, servingLabel: '1조각 (100g)', isCustom: false },
  { name: '간장 치킨', category: 'delivery', kcalPer100g: 280, proteinPer100g: 23, carbsPer100g: 14, fatPer100g: 14, defaultServing: 100, servingLabel: '1조각 (100g)', isCustom: false },
  { name: '허니콤보 치킨', category: 'delivery', kcalPer100g: 320, proteinPer100g: 22, carbsPer100g: 22, fatPer100g: 16, defaultServing: 100, servingLabel: '1조각 (100g)', isCustom: false },
  { name: '순살 치킨', category: 'delivery', kcalPer100g: 250, proteinPer100g: 28, carbsPer100g: 8, fatPer100g: 12, defaultServing: 100, isCustom: false },

  // 피자 (1조각 130g 기준)
  { name: '페퍼로니 피자', category: 'delivery', kcalPer100g: 290, proteinPer100g: 12, carbsPer100g: 36, fatPer100g: 11, defaultServing: 130, servingLabel: '1조각 (130g)', isCustom: false },
  { name: '치즈 피자', category: 'delivery', kcalPer100g: 280, proteinPer100g: 13, carbsPer100g: 35, fatPer100g: 10, defaultServing: 130, servingLabel: '1조각 (130g)', isCustom: false },
  { name: '슈프림 피자', category: 'delivery', kcalPer100g: 300, proteinPer100g: 13, carbsPer100g: 35, fatPer100g: 13, defaultServing: 130, servingLabel: '1조각 (130g)', isCustom: false },
  { name: '콤비네이션 피자', category: 'delivery', kcalPer100g: 295, proteinPer100g: 12, carbsPer100g: 35, fatPer100g: 12, defaultServing: 130, servingLabel: '1조각 (130g)', isCustom: false },

  // 햄버거·패스트푸드
  { name: '빅맥', category: 'delivery', kcalPer100g: 250, proteinPer100g: 12, carbsPer100g: 21, fatPer100g: 13, defaultServing: 215, servingLabel: '1개 (215g)', isCustom: false },
  { name: '와퍼', category: 'delivery', kcalPer100g: 235, proteinPer100g: 10, carbsPer100g: 18, fatPer100g: 13, defaultServing: 280, servingLabel: '1개 (280g)', isCustom: false },
  { name: '치즈버거', category: 'delivery', kcalPer100g: 270, proteinPer100g: 14, carbsPer100g: 27, fatPer100g: 12, defaultServing: 110, servingLabel: '1개 (110g)', isCustom: false },
  { name: '새우버거', category: 'delivery', kcalPer100g: 240, proteinPer100g: 8, carbsPer100g: 25, fatPer100g: 11, defaultServing: 200, servingLabel: '1개 (200g)', isCustom: false },
  { name: '후렌치프라이 (M)', category: 'delivery', kcalPer100g: 270, proteinPer100g: 3.4, carbsPer100g: 35, fatPer100g: 14, defaultServing: 117, servingLabel: 'M사이즈 (117g)', isCustom: false },
  { name: '치킨너겟', category: 'delivery', kcalPer100g: 290, proteinPer100g: 14, carbsPer100g: 17, fatPer100g: 18, defaultServing: 80, servingLabel: '6조각 (80g)', isCustom: false },

  // 중국집
  { name: '짜장면', category: 'delivery', kcalPer100g: 125, proteinPer100g: 3.7, carbsPer100g: 22, fatPer100g: 2.7, defaultServing: 600, servingLabel: '1그릇 (600g)', isCustom: false },
  { name: '짬뽕', category: 'delivery', kcalPer100g: 100, proteinPer100g: 4.2, carbsPer100g: 15, fatPer100g: 2.3, defaultServing: 600, servingLabel: '1그릇 (600g)', isCustom: false },
  { name: '탕수육', category: 'delivery', kcalPer100g: 290, proteinPer100g: 12, carbsPer100g: 30, fatPer100g: 14, defaultServing: 200, servingLabel: '1접시 분량 (200g)', isCustom: false },
  { name: '깐풍기', category: 'delivery', kcalPer100g: 270, proteinPer100g: 18, carbsPer100g: 18, fatPer100g: 14, defaultServing: 200, isCustom: false },
  { name: '볶음밥', category: 'delivery', kcalPer100g: 205, proteinPer100g: 5, carbsPer100g: 28, fatPer100g: 6.3, defaultServing: 350, servingLabel: '1그릇 (350g)', isCustom: false },
  { name: '울면', category: 'delivery', kcalPer100g: 110, proteinPer100g: 4, carbsPer100g: 17, fatPer100g: 3, defaultServing: 600, servingLabel: '1그릇 (600g)', isCustom: false },

  // 한식 배달
  { name: '족발', category: 'delivery', kcalPer100g: 220, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 14, defaultServing: 150, servingLabel: '1인분 (150g)', isCustom: false },
  { name: '보쌈', category: 'delivery', kcalPer100g: 240, proteinPer100g: 23, carbsPer100g: 0, fatPer100g: 16, defaultServing: 150, servingLabel: '1인분 (150g)', isCustom: false },
  { name: '닭갈비', category: 'delivery', kcalPer100g: 145, proteinPer100g: 9.5, carbsPer100g: 7.5, fatPer100g: 7, defaultServing: 400, servingLabel: '1인분 (400g)', isCustom: false },
  { name: '부대찌개', category: 'delivery', kcalPer100g: 76, proteinPer100g: 4.4, carbsPer100g: 5, fatPer100g: 4, defaultServing: 500, servingLabel: '1인분 (500g)', isCustom: false },
  { name: '갈비탕', category: 'delivery', kcalPer100g: 50, proteinPer100g: 4.3, carbsPer100g: 2.6, fatPer100g: 2.6, defaultServing: 700, servingLabel: '1인분 (700g)', isCustom: false },
  { name: '설렁탕', category: 'delivery', kcalPer100g: 54, proteinPer100g: 3.7, carbsPer100g: 3.1, fatPer100g: 2.6, defaultServing: 700, servingLabel: '1인분 (700g)', isCustom: false },
  { name: '김치볶음밥', category: 'delivery', kcalPer100g: 148, proteinPer100g: 4, carbsPer100g: 23, fatPer100g: 4.6, defaultServing: 350, servingLabel: '1인분 (350g)', isCustom: false },
  { name: '제육볶음', category: 'delivery', kcalPer100g: 192, proteinPer100g: 11, carbsPer100g: 7, fatPer100g: 13, defaultServing: 250, servingLabel: '1인분 (250g)', isCustom: false },
  { name: '비빔국수', category: 'delivery', kcalPer100g: 143, proteinPer100g: 4, carbsPer100g: 26, fatPer100g: 2.3, defaultServing: 350, servingLabel: '1인분 (350g)', isCustom: false },
  { name: '콩국수', category: 'delivery', kcalPer100g: 92, proteinPer100g: 4.4, carbsPer100g: 14, fatPer100g: 2, defaultServing: 500, servingLabel: '1인분 (500g)', isCustom: false },
  { name: '냉면', category: 'delivery', kcalPer100g: 90, proteinPer100g: 3.5, carbsPer100g: 17, fatPer100g: 0.8, defaultServing: 600, servingLabel: '1그릇 (600g)', isCustom: false },

  // 분식 배달
  { name: '순대', category: 'delivery', kcalPer100g: 290, proteinPer100g: 11, carbsPer100g: 30, fatPer100g: 14, defaultServing: 100, servingLabel: '1인분 (100g)', isCustom: false },
  { name: '어묵', category: 'delivery', kcalPer100g: 95, proteinPer100g: 11, carbsPer100g: 10, fatPer100g: 1.5, defaultServing: 100, isCustom: false },
  { name: '라볶이', category: 'delivery', kcalPer100g: 154, proteinPer100g: 3.4, carbsPer100g: 26, fatPer100g: 3.4, defaultServing: 350, servingLabel: '1인분 (350g)', isCustom: false },
  { name: '참치김밥', category: 'delivery', kcalPer100g: 167, proteinPer100g: 5.8, carbsPer100g: 25, fatPer100g: 5, defaultServing: 240, servingLabel: '1줄 (240g)', isCustom: false },
  { name: '치즈김밥', category: 'delivery', kcalPer100g: 200, proteinPer100g: 7.5, carbsPer100g: 25, fatPer100g: 7.5, defaultServing: 240, servingLabel: '1줄 (240g)', isCustom: false },

  // 카페·디저트
  { name: '아메리카노', category: 'delivery', kcalPer100g: 2, proteinPer100g: 0.1, carbsPer100g: 0, fatPer100g: 0, defaultServing: 250, servingLabel: '1잔 (250ml)', isCustom: false },
  { name: '카페라떼', category: 'delivery', kcalPer100g: 28, proteinPer100g: 1.7, carbsPer100g: 2.8, fatPer100g: 1.4, defaultServing: 350, servingLabel: '1잔 (350ml)', isCustom: false },
  { name: '카라멜 마키아토', category: 'delivery', kcalPer100g: 57, proteinPer100g: 2, carbsPer100g: 8.5, fatPer100g: 1.7, defaultServing: 350, servingLabel: '1잔 (350ml)', isCustom: false },
  { name: '케이크 한 조각', category: 'delivery', kcalPer100g: 350, proteinPer100g: 5, carbsPer100g: 50, fatPer100g: 14, defaultServing: 100, servingLabel: '1조각 (100g)', isCustom: false },
  { name: '도넛', category: 'delivery', kcalPer100g: 380, proteinPer100g: 5, carbsPer100g: 50, fatPer100g: 18, defaultServing: 60, servingLabel: '1개 (60g)', isCustom: false },

  // ===== 운동 보충제 =====
  { name: 'WPC 단백질 쉐이크', category: 'supplement', kcalPer100g: 410, proteinPer100g: 75, carbsPer100g: 6, fatPer100g: 6, defaultServing: 30, servingLabel: '1스쿱 (30g)', isCustom: false },
  { name: 'WPI 단백질 쉐이크', category: 'supplement', kcalPer100g: 380, proteinPer100g: 88, carbsPer100g: 4, fatPer100g: 1, defaultServing: 30, servingLabel: '1스쿱 (30g)', isCustom: false },
  { name: '게이너 (mass gainer)', category: 'supplement', kcalPer100g: 380, proteinPer100g: 30, carbsPer100g: 50, fatPer100g: 4, defaultServing: 60, servingLabel: '1스쿱 (60g)', isCustom: false },
  { name: '크레아틴 (모노)', category: 'supplement', kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, defaultServing: 5, servingLabel: '1티스푼 (5g)', isCustom: false },
  { name: 'BCAA', category: 'supplement', kcalPer100g: 320, proteinPer100g: 80, carbsPer100g: 0, fatPer100g: 0, defaultServing: 10, servingLabel: '1스쿱 (10g)', isCustom: false },

  // ===== 편의점 =====
  { name: '삼각김밥 (참치)', category: 'processed', kcalPer100g: 175, proteinPer100g: 5, carbsPer100g: 30, fatPer100g: 4, defaultServing: 100, servingLabel: '1개 (100g)', isCustom: false },
  { name: '삼각김밥 (소고기)', category: 'processed', kcalPer100g: 180, proteinPer100g: 6, carbsPer100g: 28, fatPer100g: 5, defaultServing: 100, servingLabel: '1개 (100g)', isCustom: false },
  { name: '컵라면', category: 'processed', kcalPer100g: 510, proteinPer100g: 11, carbsPer100g: 75, fatPer100g: 19, defaultServing: 65, servingLabel: '1컵 (65g)', isCustom: false },
  { name: '편의점 도시락', category: 'processed', kcalPer100g: 150, proteinPer100g: 5, carbsPer100g: 20, fatPer100g: 5, defaultServing: 500, servingLabel: '1팩 (500g)', isCustom: false },
  { name: '햇반 (즉석밥)', category: 'processed', kcalPer100g: 130, proteinPer100g: 2.5, carbsPer100g: 28, fatPer100g: 0.3, defaultServing: 210, servingLabel: '1팩 (210g)', isCustom: false },
  { name: '핫바', category: 'processed', kcalPer100g: 230, proteinPer100g: 12, carbsPer100g: 16, fatPer100g: 14, defaultServing: 50, servingLabel: '1개 (50g)', isCustom: false },
  { name: '닭가슴살 (스팀, 가공)', category: 'protein', kcalPer100g: 110, proteinPer100g: 24, carbsPer100g: 1, fatPer100g: 1, defaultServing: 100, servingLabel: '1팩 (100g)', isCustom: false },
  { name: '단백질바', category: 'snack', kcalPer100g: 380, proteinPer100g: 30, carbsPer100g: 30, fatPer100g: 10, defaultServing: 50, servingLabel: '1개 (50g)', isCustom: false },
  { name: '컵스프', category: 'processed', kcalPer100g: 32, proteinPer100g: 1, carbsPer100g: 5, fatPer100g: 1, defaultServing: 250, servingLabel: '1컵 (250g)', isCustom: false },
  { name: '소세지빵', category: 'processed', kcalPer100g: 280, proteinPer100g: 8, carbsPer100g: 30, fatPer100g: 14, defaultServing: 80, servingLabel: '1개 (80g)', isCustom: false },

  // ===== 국·찌개 =====
  { name: '미역국', category: 'processed', kcalPer100g: 35, proteinPer100g: 3, carbsPer100g: 3, fatPer100g: 1.5, defaultServing: 400, servingLabel: '1인분 (400g)', isCustom: false },
  { name: '콩나물국', category: 'processed', kcalPer100g: 25, proteinPer100g: 1.5, carbsPer100g: 3, fatPer100g: 1, defaultServing: 400, servingLabel: '1인분 (400g)', isCustom: false },
  { name: '사골국', category: 'processed', kcalPer100g: 60, proteinPer100g: 5, carbsPer100g: 2, fatPer100g: 4, defaultServing: 500, servingLabel: '1인분 (500g)', isCustom: false },
  { name: '감자탕', category: 'processed', kcalPer100g: 90, proteinPer100g: 7, carbsPer100g: 8, fatPer100g: 4, defaultServing: 600, servingLabel: '1인분 (600g)', isCustom: false },
  { name: '닭곰탕', category: 'processed', kcalPer100g: 70, proteinPer100g: 8, carbsPer100g: 4, fatPer100g: 3, defaultServing: 600, servingLabel: '1인분 (600g)', isCustom: false },

  // ===== 반찬 =====
  { name: '멸치볶음', category: 'processed', kcalPer100g: 200, proteinPer100g: 16, carbsPer100g: 12, fatPer100g: 10, defaultServing: 30, servingLabel: '1접시 (30g)', isCustom: false },
  { name: '메추리알 장조림', category: 'processed', kcalPer100g: 145, proteinPer100g: 12, carbsPer100g: 5, fatPer100g: 9, defaultServing: 50, isCustom: false },
  { name: '시금치나물', category: 'processed', kcalPer100g: 35, proteinPer100g: 3, carbsPer100g: 4, fatPer100g: 1.5, defaultServing: 50, isCustom: false },
  { name: '콩나물무침', category: 'processed', kcalPer100g: 38, proteinPer100g: 4, carbsPer100g: 4, fatPer100g: 1.5, defaultServing: 50, isCustom: false },
  { name: '어묵볶음', category: 'processed', kcalPer100g: 130, proteinPer100g: 9, carbsPer100g: 12, fatPer100g: 5, defaultServing: 50, isCustom: false },
  { name: '계란말이', category: 'processed', kcalPer100g: 165, proteinPer100g: 12, carbsPer100g: 2, fatPer100g: 12, defaultServing: 100, servingLabel: '1접시 (100g)', isCustom: false },
  { name: '김자반', category: 'processed', kcalPer100g: 280, proteinPer100g: 12, carbsPer100g: 28, fatPer100g: 12, defaultServing: 10, servingLabel: '1숟갈 (10g)', isCustom: false },
  { name: '깻잎 장아찌', category: 'processed', kcalPer100g: 28, proteinPer100g: 1.5, carbsPer100g: 3, fatPer100g: 1, defaultServing: 10, isCustom: false },

  // ===== 과일 추가 =====
  { name: '망고', category: 'fruit', kcalPer100g: 60, proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4, defaultServing: 200, servingLabel: '반 개 (200g)', isCustom: false },
  { name: '파인애플', category: 'fruit', kcalPer100g: 50, proteinPer100g: 0.5, carbsPer100g: 13, fatPer100g: 0.1, defaultServing: 100, isCustom: false },
  { name: '자몽', category: 'fruit', kcalPer100g: 42, proteinPer100g: 0.8, carbsPer100g: 11, fatPer100g: 0.1, defaultServing: 150, servingLabel: '반 개 (150g)', isCustom: false },
  { name: '복숭아', category: 'fruit', kcalPer100g: 39, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.3, defaultServing: 150, servingLabel: '1개 (150g)', isCustom: false },
  { name: '배', category: 'fruit', kcalPer100g: 57, proteinPer100g: 0.4, carbsPer100g: 15, fatPer100g: 0.1, defaultServing: 250, servingLabel: '1개 (250g)', isCustom: false },

  // ===== 채소 추가 =====
  { name: '가지', category: 'vegetable', kcalPer100g: 25, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.2, defaultServing: 100, isCustom: false },
  { name: '애호박', category: 'vegetable', kcalPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3, fatPer100g: 0.3, defaultServing: 100, isCustom: false },
  { name: '배추', category: 'vegetable', kcalPer100g: 13, proteinPer100g: 1.5, carbsPer100g: 2, fatPer100g: 0.2, defaultServing: 100, isCustom: false },
  { name: '깻잎', category: 'vegetable', kcalPer100g: 50, proteinPer100g: 4, carbsPer100g: 7, fatPer100g: 1, defaultServing: 10, servingLabel: '5장 (10g)', isCustom: false },
  { name: '상추', category: 'vegetable', kcalPer100g: 15, proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2, defaultServing: 50, isCustom: false },

  // ===== 곡류 추가 =====
  { name: '떡국떡', category: 'grain', kcalPer100g: 220, proteinPer100g: 5, carbsPer100g: 50, fatPer100g: 0.4, defaultServing: 100, isCustom: false },
  { name: '우동면 (삶은)', category: 'grain', kcalPer100g: 100, proteinPer100g: 3, carbsPer100g: 21, fatPer100g: 0.5, defaultServing: 200, servingLabel: '1인분 (200g)', isCustom: false },
  { name: '쌀국수 (삶은)', category: 'grain', kcalPer100g: 110, proteinPer100g: 2, carbsPer100g: 25, fatPer100g: 0.2, defaultServing: 200, isCustom: false },
  { name: '호밀빵', category: 'grain', kcalPer100g: 260, proteinPer100g: 9, carbsPer100g: 48, fatPer100g: 3, defaultServing: 50, servingLabel: '1쪽 (50g)', isCustom: false },
  { name: '무가당 그래놀라', category: 'grain', kcalPer100g: 450, proteinPer100g: 13, carbsPer100g: 60, fatPer100g: 17, defaultServing: 40, servingLabel: '1회 (40g)', isCustom: false },

  // ===== 음료 추가 =====
  { name: '이온음료 (게토레이)', category: 'beverage', kcalPer100g: 25, proteinPer100g: 0, carbsPer100g: 6, fatPer100g: 0, defaultServing: 500, servingLabel: '1병 (500ml)', isCustom: false },
  { name: '저지방 우유', category: 'dairy', kcalPer100g: 42, proteinPer100g: 3.4, carbsPer100g: 5, fatPer100g: 1, defaultServing: 200, servingLabel: '1팩 (200ml)', isCustom: false },
  { name: '오렌지주스', category: 'beverage', kcalPer100g: 45, proteinPer100g: 0.7, carbsPer100g: 10, fatPer100g: 0.2, defaultServing: 200, servingLabel: '1잔 (200ml)', isCustom: false },
  { name: '와인 (레드)', category: 'beverage', kcalPer100g: 83, proteinPer100g: 0.1, carbsPer100g: 2.6, fatPer100g: 0, defaultServing: 150, servingLabel: '1잔 (150ml)', isCustom: false },
  { name: '카페모카', category: 'beverage', kcalPer100g: 78, proteinPer100g: 3.5, carbsPer100g: 9, fatPer100g: 3.4, defaultServing: 350, servingLabel: '1잔 (350ml)', isCustom: false },

  // ===== 카페·디저트 추가 =====
  { name: '샌드위치 (햄·치즈)', category: 'delivery', kcalPer100g: 250, proteinPer100g: 12, carbsPer100g: 28, fatPer100g: 11, defaultServing: 200, servingLabel: '1개 (200g)', isCustom: false },
  { name: '머핀', category: 'delivery', kcalPer100g: 380, proteinPer100g: 6, carbsPer100g: 50, fatPer100g: 17, defaultServing: 100, servingLabel: '1개 (100g)', isCustom: false },
  { name: '크림빵', category: 'delivery', kcalPer100g: 320, proteinPer100g: 6, carbsPer100g: 50, fatPer100g: 12, defaultServing: 80, servingLabel: '1개 (80g)', isCustom: false },
  { name: '샐러드볼 (드레싱 별도)', category: 'delivery', kcalPer100g: 80, proteinPer100g: 5, carbsPer100g: 8, fatPer100g: 3, defaultServing: 300, servingLabel: '1볼 (300g)', isCustom: false },
  { name: '마카롱', category: 'delivery', kcalPer100g: 400, proteinPer100g: 6, carbsPer100g: 65, fatPer100g: 14, defaultServing: 25, servingLabel: '1개 (25g)', isCustom: false },
];

export const FOOD_CATEGORY_LABELS: Record<Food['category'], string> = {
  grain: '곡류·전분',
  protein: '단백질',
  dairy: '유제품',
  vegetable: '채소',
  fruit: '과일',
  snack: '견과·간식',
  sauce: '기름·소스',
  beverage: '음료',
  processed: '가공식품',
  delivery: '배달·외식',
  supplement: '운동 보충제',
};
