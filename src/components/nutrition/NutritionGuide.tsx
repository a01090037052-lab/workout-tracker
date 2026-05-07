/**
 * 매크로(macronutrients) 교육 콘텐츠.
 * 영양 → 계산기 → "📚 매크로 가이드"에서 펼쳐 볼 수 있다.
 */
export default function NutritionGuide() {
  return (
    <div className="mt-4 space-y-4 text-sm leading-relaxed">
      {/* 1. 매크로란? */}
      <section>
        <h4 className="font-semibold mb-2">1. 매크로(Macros)란?</h4>
        <p className="text-text-secondary text-xs mb-2">
          Macronutrient(거대영양소)의 줄임말. 몸이 에너지원으로 쓰는 3가지 영양소입니다.
        </p>
        <div className="bg-surface-light rounded-lg p-3 space-y-2">
          <MacroRow color="text-red-400" label="단백질 (Protein)" kcalPerG={4} role="근육·효소·면역" />
          <MacroRow color="text-yellow-400" label="탄수화물 (Carbs)" kcalPerG={4} role="즉시 에너지·글리코겐" />
          <MacroRow color="text-blue-400" label="지방 (Fat)" kcalPerG={9} role="호르몬·세포막·장기 보호" />
        </div>
        <p className="text-[11px] text-text-secondary mt-2">
          총 칼로리 = 단백질×4 + 탄수×4 + 지방×9
        </p>
      </section>

      {/* 2. 목적별 권장 */}
      <section>
        <h4 className="font-semibold mb-2">2. 목적별 매크로 (정통 권장)</h4>
        <p className="text-text-secondary text-xs mb-2">
          숫자는 체중 1kg당 그램 (g/kg). 예) 체중 70kg + 다이어트 → 단백질 70×2.2 = 154g/일
        </p>
        <div className="bg-surface-light rounded-lg overflow-hidden text-xs">
          <div className="flex bg-surface px-2 py-1.5 text-[10px] text-text-secondary font-medium">
            <span className="flex-1">목적</span>
            <span className="w-14 text-center">단백질</span>
            <span className="w-12 text-center">지방</span>
            <span className="w-14 text-center">탄수</span>
          </div>
          <GoalRow goal="공격 다이어트" pct="−25%" p="2.4" f="0.8" c="나머지" />
          <GoalRow goal="다이어트" pct="−20%" p="2.2" f="0.8" c="나머지" />
          <GoalRow goal="유지" pct="" p="1.8" f="1.0" c="나머지" />
          <GoalRow goal="린벌크" pct="+10%" p="1.8" f="1.0" c="나머지" />
          <GoalRow goal="벌크" pct="+20%" p="1.6" f="1.2" c="나머지" />
        </div>
        <p className="text-[11px] text-primary-light mt-2">
          이 공식은 위 계산기가 자동으로 적용합니다.
        </p>
      </section>

      {/* 3. 왜 단백질 우선? */}
      <section>
        <h4 className="font-semibold mb-2">3. 왜 단백질을 가장 우선하나?</h4>
        <ul className="text-xs text-text-secondary space-y-1.5 pl-4 list-disc">
          <li><b>포만감 1위</b> — 같은 칼로리에서 가장 배부름 (다이어트 핵심)</li>
          <li><b>TEF 30%</b> — 소화에 칼로리의 30% 소모 (탄수 5~10%, 지방 0~3%)</li>
          <li><b>근손실 방어</b> — 다이어트 중 근육 보존</li>
          <li><b>회복</b> — 운동 후 근섬유 재합성</li>
        </ul>
        <p className="text-[11px] text-text-secondary mt-2">
          → 다이어트일수록 단백질 비율 ↑ (2.2~2.4 g/kg)이 정통.
        </p>
      </section>

      {/* 4. 지방 최소량 */}
      <section>
        <h4 className="font-semibold mb-2">4. 지방을 너무 줄이면 안 되는 이유</h4>
        <ul className="text-xs text-text-secondary space-y-1.5 pl-4 list-disc">
          <li><b>호르몬</b> — 테스토스테론·에스트로겐 합성에 필수. 0.5 g/kg 미만 장기 시 호르몬 저하</li>
          <li><b>지용성 비타민</b> (A·D·E·K) 흡수</li>
          <li><b>세포막·장기 보호</b></li>
        </ul>
        <p className="text-[11px] text-text-secondary mt-2">
          → 다이어트라도 <b>최소 0.8 g/kg</b> 유지 권장 (앱 자동 적용)
        </p>
      </section>

      {/* 5. 탄수 = 남는 칼로리 */}
      <section>
        <h4 className="font-semibold mb-2">5. 탄수화물 = "남는 칼로리"</h4>
        <p className="text-xs text-text-secondary">
          단백질·지방 최소량을 먼저 채운 뒤, 목표 칼로리에서 남은 만큼이 탄수입니다.
          탄수는 운동 강도와 직접 연관 — 적으면 글리코겐 부족으로 강도 ↓ → 근손실 가속.
        </p>
        <p className="text-[11px] text-text-secondary mt-2">
          → 다이어트 시 단백질·지방은 유지하고 <b>탄수만 점진 감소</b>가 정통.
        </p>
      </section>

      {/* 6. 진행률 우선순위 */}
      <section>
        <h4 className="font-semibold mb-2">6. 매일 진행률 우선순위</h4>
        <ol className="text-xs text-text-secondary space-y-1 pl-4 list-decimal">
          <li><b className="text-red-400">단백질 목표 100%</b> — 가장 중요</li>
          <li><b>칼로리 ±10% 이내</b></li>
          <li><b className="text-blue-400">지방 80% 이상</b></li>
          <li><b className="text-yellow-400">탄수는 80~120% 범위</b> — 조절 여유</li>
        </ol>
      </section>

      {/* 7. 실전 팁 */}
      <section>
        <h4 className="font-semibold mb-2">7. 실전 팁</h4>
        <ul className="text-xs text-text-secondary space-y-1.5 pl-4 list-disc">
          <li>다이어트는 단백질 풍부 식품 (닭가슴살·소안심·계란·두부·그릭요거트) 위주</li>
          <li>벌크는 클린 탄수 (현미밥·고구마·오트밀)로 양 늘리기</li>
          <li>지방은 견과·아보카도·올리브오일·연어 같은 양질의 지방 우선</li>
          <li>가공식품·튀김은 주 1~2회로 제한 (특히 다이어트)</li>
          <li>물 1일 2L 이상 (단백질 대사·포만감)</li>
        </ul>
      </section>

      {/* 8. 단백질 식품 추천 */}
      <section>
        <h4 className="font-semibold mb-2">8. 단백질 식품 추천 (효율 순)</h4>
        <p className="text-text-secondary text-xs mb-2">
          단백질 효율 = (단백질 g) / (칼로리). 다이어트일수록 효율 높은 식품 우선.
        </p>
        <div className="bg-surface-light rounded-lg p-3 space-y-2 text-xs">
          <div>
            <div className="text-red-400 font-medium mb-1">최우선 (효율 ★★★)</div>
            <p className="text-text-secondary text-[11px]">
              닭가슴살 (100g: 165kcal·P31), 흰살 생선 (명태·대구), 계란 흰자, 단백질 쉐이크, 무지방 그릭요거트
            </p>
          </div>
          <div>
            <div className="text-red-400 font-medium mb-1">권장 (효율 ★★)</div>
            <p className="text-text-secondary text-[11px]">
              계란 (전체), 소안심, 돼지등심, 두부, 콩나물, 참치(통조림)·연어, 새우·오징어
            </p>
          </div>
          <div>
            <div className="text-red-400 font-medium mb-1">제한 (효율 ★)</div>
            <p className="text-text-secondary text-[11px]">
              삼겹살 (지방 50g/100g), 차돌박이, 베이컨, 소시지 — 단백질 단위당 칼로리 너무 높음
            </p>
          </div>
        </div>
        <p className="text-[11px] text-text-secondary mt-2">
          → 매끼 단백질 30~40g씩 4~5회 분산 섭취가 근합성 최적 (Phillips et al., 2014)
        </p>
      </section>

      {/* 9. 다이어트 식단 짜기 (실전) */}
      <section>
        <h4 className="font-semibold mb-2">9. 다이어트 식단 짜기 (체중 70kg 예시)</h4>
        <p className="text-text-secondary text-xs mb-2">
          목표: 1900 kcal · 단백질 154g · 탄수 200g · 지방 56g
        </p>
        <div className="bg-surface-light rounded-lg p-3 space-y-2 text-[11px] font-mono">
          <MealRow time="아침" food="그릭요거트 100g + 바나나 1개 + 오트밀 50g" k={300} p={14} c={50} f={6} />
          <MealRow time="점심" food="현미밥 1공기 + 닭가슴살 200g + 김치 50g" k={570} p={65} c={50} f={9} />
          <MealRow time="간식" food="아몬드 30g + 사과 1개" k={270} p={6} c={21} f={15} />
          <MealRow time="저녁" food="고구마 200g + 소안심 150g + 브로콜리 100g" k={500} p={35} c={50} f={12} />
          <div className="pt-1.5 border-t border-border flex justify-between">
            <span className="text-text-secondary">합계</span>
            <span><b>1640 kcal</b> · P 120 · C 171 · F 42</span>
          </div>
        </div>
        <p className="text-[11px] text-text-secondary mt-2">
          → 단백질 154g 미달 → 닭가슴살 +50g 또는 두부 100g 또는 단백질 쉐이크 1스쿱 추가로 보충.
          남는 칼로리 260kcal는 운동 전 탄수(현미밥 +반공기) 또는 견과로.
        </p>
      </section>

      {/* 10. 벌크 시 탄수 증량 */}
      <section>
        <h4 className="font-semibold mb-2">10. 벌크 시 탄수화물 증량 (점진)</h4>
        <div className="text-xs text-text-secondary space-y-2">
          <p>
            <b className="text-text">왜 탄수가 핵심?</b><br />
            벌크는 잉여 칼로리가 필요. 단백질·지방은 호르몬·근합성 임계점에서 큰 추가 효과 X.
            남는 칼로리는 <b className="text-yellow-400">탄수에 배분</b>해 글리코겐 충전 → 운동 강도 ↑ → 근비대 ↑.
          </p>
          <div className="bg-surface-light rounded-lg p-3">
            <div className="font-medium text-text mb-1">증량 가이드</div>
            <ul className="space-y-1 pl-4 list-disc text-[11px]">
              <li>시작: 유지 칼로리 + 200~300 kcal (탄수 50~75g 추가)</li>
              <li>매 2주마다 체중 변화 확인:
                <ul className="pl-4 mt-0.5 list-disc">
                  <li>+0.25~0.5 kg/주 → 유지 (적정)</li>
                  <li>+0.1 kg 미만 → 탄수 +25g 추가</li>
                  <li>+0.7 kg 초과 → 탄수 −25g 줄임 (지방 증가 ↑)</li>
                </ul>
              </li>
              <li>장기 클린 벌크: 8~12주 후 1~2주 유지·조정 (지방 누적 막음)</li>
            </ul>
          </div>
          <div className="bg-surface-light rounded-lg p-3">
            <div className="font-medium text-text mb-1">클린 탄수 우선순위</div>
            <ol className="pl-4 list-decimal space-y-0.5 text-[11px]">
              <li>현미밥, 잡곡밥, 고구마, 통밀빵, 오트밀</li>
              <li>감자, 쌀밥, 파스타</li>
              <li>(제한) 흰빵, 가공시리얼, 디저트</li>
            </ol>
          </div>
        </div>
      </section>

      {/* 11. 영양 타이밍 (운동 전후) */}
      <section>
        <h4 className="font-semibold mb-2">11. 영양 타이밍 — 운동 전후</h4>
        <div className="bg-surface-light rounded-lg p-3 text-xs space-y-2">
          <div>
            <div className="text-yellow-400 font-medium mb-1">운동 1~2시간 전</div>
            <p className="text-text-secondary text-[11px]">
              탄수 30~60g + 단백질 20~30g (예: 바나나 1개 + 그릭요거트 100g, 또는 현미밥 반공기 + 닭가슴살 100g)<br />
              → 글리코겐 충전. 너무 가까우면 소화 부담.
            </p>
          </div>
          <div>
            <div className="text-red-400 font-medium mb-1">운동 직후 (30~60분 내)</div>
            <p className="text-text-secondary text-[11px]">
              단백질 20~40g (쉐이크 1스쿱 또는 닭가슴살 100g) + 탄수 30~50g<br />
              → "anabolic window"는 신화에 가깝지만 회복 속도엔 도움.
            </p>
          </div>
          <div>
            <div className="text-blue-400 font-medium mb-1">자기 전</div>
            <p className="text-text-secondary text-[11px]">
              카제인 단백질 또는 그릭요거트 (천천히 흡수) → 수면 중 근손실 최소화. 다이어트 시 효과 ↑.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-text-secondary mt-2">
          → 단, <b>전체 일일 매크로가 더 중요</b>. 타이밍은 5~10% 추가 효과.
        </p>
      </section>
    </div>
  );
}

function MealRow({ time, food, k, p, c, f }: { time: string; food: string; k: number; p: number; c: number; f: number }) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <span className="text-primary-light">{time}</span>
        <span className="text-text-secondary">{k} kcal · P{p} C{c} F{f}</span>
      </div>
      <p className="text-text-secondary text-[10px] mt-0.5">{food}</p>
    </div>
  );
}

function MacroRow({ color, label, kcalPerG, role }: { color: string; label: string; kcalPerG: number; role: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className={`font-medium ${color} w-24`}>{label}</span>
      <span className="font-mono text-text-secondary w-14 text-right">{kcalPerG} kcal/g</span>
      <span className="text-text-secondary flex-1 text-right">{role}</span>
    </div>
  );
}

function GoalRow({ goal, pct, p, f, c }: { goal: string; pct: string; p: string; f: string; c: string }) {
  return (
    <div className="flex px-2 py-1.5 text-xs border-t border-border first:border-t-0">
      <span className="flex-1 font-medium">
        {goal}
        {pct && <span className="text-[10px] text-text-secondary ml-1">{pct}</span>}
      </span>
      <span className="w-14 text-center font-mono text-red-400">{p}</span>
      <span className="w-12 text-center font-mono text-blue-400">{f}</span>
      <span className="w-14 text-center font-mono text-yellow-400 text-[10px]">{c}</span>
    </div>
  );
}
