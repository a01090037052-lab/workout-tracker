import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateWeeklyReport, type WeeklyReport } from '../lib/coach';
import { storage } from '../lib/storage';

export default function WeeklyReportPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile] = useState(() => storage.nutritionProfile.get());

  useEffect(() => {
    setLoading(true);
    generateWeeklyReport(profile?.goal || null)
      .then((r) => { setReport(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profile?.goal]);

  return (
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate(-1)} aria-label="뒤로" className="-ml-2 px-2 h-11 flex items-center text-text-secondary text-sm active:text-text active:bg-surface-light rounded-lg">← 뒤로</button>
        <h1 className="text-xl font-bold">📊 주간 리포트</h1>
        <div className="w-10" />
      </div>

      {loading && (
        <div className="bg-surface rounded-xl p-8 text-center text-text-secondary text-sm">분석 중…</div>
      )}

      {!loading && report && (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary text-center">{report.weekLabel}</p>

          {/* 종합 평가 */}
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-xl p-4">
            <div className="text-xs text-primary-light mb-1.5 font-semibold">코치 한 줄 평가</div>
            <p className="text-sm leading-relaxed">{report.summary}</p>
          </div>

          {/* 운동 */}
          <Section title="💪 운동">
            <Grid3>
              <Stat label="운동 일수" value={`${report.workout.days}일`} />
              <Stat label="총 볼륨" value={`${(report.workout.volume / 1000).toFixed(1)}t`} />
              <Stat
                label="볼륨 변화"
                value={`${report.workout.volumeDelta > 0 ? '+' : ''}${report.workout.volumeDelta}%`}
                tone={report.workout.volumeDelta > 5 ? 'success' : report.workout.volumeDelta < -10 ? 'warning' : 'neutral'}
              />
            </Grid3>
            {report.workout.prCount > 0 && (
              <div className="mt-2 text-xs text-success bg-success/10 rounded-lg px-2 py-1.5 text-center">
                🏆 이번 주 신기록 {report.workout.prCount}건
              </div>
            )}
          </Section>

          {/* 영양 */}
          <Section title="🍽️ 영양">
            <Grid3>
              <Stat label="평균 칼로리" value={`${report.nutrition.avgKcal}`} />
              <Stat label="평균 단백질" value={`${report.nutrition.avgProtein}g`} />
              <Stat
                label="기록 일수"
                value={`${report.nutrition.daysLogged}/7일`}
                tone={report.nutrition.daysLogged >= 5 ? 'success' : 'warning'}
              />
            </Grid3>
          </Section>

          {/* 체성분 */}
          <Section title="📐 체성분">
            <Grid3>
              <Stat
                label="체중"
                value={report.body.weightDelta === 0 ? '변화 없음' : `${report.body.weightDelta > 0 ? '+' : ''}${report.body.weightDelta}kg`}
              />
              <Stat
                label="체지방률"
                value={report.body.bfDelta === null ? '—' : `${report.body.bfDelta > 0 ? '+' : ''}${report.body.bfDelta}%p`}
                tone={report.body.bfDelta !== null ? (report.body.bfDelta < 0 ? 'success' : report.body.bfDelta > 0.5 ? 'warning' : 'neutral') : 'neutral'}
              />
              <Stat
                label="골격근량"
                value={report.body.mmDelta === null ? '—' : `${report.body.mmDelta > 0 ? '+' : ''}${report.body.mmDelta}kg`}
                tone={report.body.mmDelta !== null ? (report.body.mmDelta > 0 ? 'success' : 'warning') : 'neutral'}
              />
            </Grid3>
          </Section>

          {/* 회복 */}
          <Section title="😴 회복">
            <Grid3>
              <Stat
                label="평균 수면"
                value={report.recovery.avgSleep === null ? '—' : `${report.recovery.avgSleep}h`}
                tone={report.recovery.avgSleep !== null ? (report.recovery.avgSleep >= 7 ? 'success' : report.recovery.avgSleep < 6 ? 'warning' : 'neutral') : 'neutral'}
              />
              <Stat
                label="근육통 일수"
                value={`${report.recovery.soreDays}/7일`}
                tone={report.recovery.soreDays >= 5 ? 'warning' : 'neutral'}
              />
              <div />
            </Grid3>
          </Section>

          {/* 다음 주 핵심 행동 */}
          <Section title="🎯 다음 주 핵심 행동">
            <ol className="space-y-2">
              {report.nextWeekActions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary-light font-bold">{i + 1}.</span>
                  <span className="flex-1 leading-relaxed">{a}</span>
                </li>
              ))}
            </ol>
          </Section>

          <p className="text-[10px] text-text-secondary text-center pt-2">
            ※ 룰 기반 분석 — 데이터가 적으면 정확도 낮음. 매일 기록하면 더 정확해짐.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' | 'neutral' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text';
  return (
    <div className="bg-surface-light rounded-lg p-2 text-center">
      <div className="text-[10px] text-text-secondary">{label}</div>
      <div className={`text-sm font-mono font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
