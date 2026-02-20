import React from 'react';
import ModelStatusCard from './admin/ModelStatusCard';
import SystemStatsCard from './admin/SystemStatsCard';
import SubAdminManager from './admin/SubAdminManager';
import ReportInbox from './admin/ReportInbox';

interface AdminSanctumProps {
  subAdminConfig: Record<string, number>;
  onSubAdminConfigChange: (cfg: Record<string, number>) => void;
  onToast: (msg: string) => void;
}

const AdminSanctum: React.FC<AdminSanctumProps> = ({
  subAdminConfig,
  onSubAdminConfigChange,
  onToast,
}) => {
  return (
    <section className="animate-in fade-in duration-700 max-w-2xl mx-auto space-y-6 pb-8">
      <div className="text-center space-y-1 mb-8">
        <h2 className="text-3xl font-mystic font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 tracking-widest uppercase">
          Admin Sanctum
        </h2>
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.5em] font-black">최고관리자 전용 구역</p>
      </div>

      <ModelStatusCard />
      <SystemStatsCard />
      <SubAdminManager
        subAdminConfig={subAdminConfig}
        onSubAdminConfigChange={onSubAdminConfigChange}
        onToast={onToast}
      />
      <ReportInbox />
    </section>
  );
};

export default AdminSanctum;
