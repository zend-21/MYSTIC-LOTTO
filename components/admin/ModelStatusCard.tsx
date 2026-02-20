import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ModelStatus } from '../../types';

const ModelStatusCard: React.FC = () => {
  const [status, setStatus] = useState<ModelStatus | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'modelStatus'), (snap) => {
      if (snap.exists()) setStatus(snap.data() as ModelStatus);
    });
    return unsub;
  }, []);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">AI 모델 현황</h3>

      {!status ? (
        <p className="text-slate-500 text-sm italic">
          데이터 없음 — checkModelDeprecation 스케줄 함수 미실행
        </p>
      ) : (
        <div className="space-y-3">
          <ModelRow label="Flash 계열 (1,000 L)" info={status.flash} />
          <ModelRow label="Pro 계열 (50,000 L)" info={status.pro} />
          <p className="text-[10px] text-slate-600 pt-1">
            마지막 점검: {formatDate(status.checkedAt)}
          </p>
          {status.hasWarning && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-xs text-red-400 font-bold">
              ⚠️ 종료 임박 모델이 있습니다. Firebase Console에서 수동으로 대체 모델로 교체하세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ModelRow: React.FC<{ label: string; info: ModelStatus['flash'] }> = ({ label, info }) => (
  <div className={`rounded-2xl p-4 border ${info.warning ? 'border-red-500/40 bg-red-500/10' : 'border-white/5 bg-white/[0.02]'}`}>
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{label}</p>
        <p className="text-white font-bold text-sm mt-0.5 truncate">{info.model}</p>
      </div>
      {info.warning && (
        <span className="shrink-0 text-[10px] font-black text-red-400 uppercase tracking-wider bg-red-500/20 px-2 py-1 rounded-lg">
          경고
        </span>
      )}
    </div>
    {info.deprecationDate ? (
      <p className={`mt-2 text-xs font-bold ${info.warning ? 'text-red-400' : 'text-slate-500'}`}>
        {info.warning
          ? `⚠️ ${info.daysLeft}일 후 종료 예정 (${info.deprecationDate})`
          : `종료일: ${info.deprecationDate} (${info.daysLeft}일 남음)`}
      </p>
    ) : (
      <p className="text-[10px] text-slate-600 mt-1">종료 예정일 미발표</p>
    )}
  </div>
);

export default ModelStatusCard;
