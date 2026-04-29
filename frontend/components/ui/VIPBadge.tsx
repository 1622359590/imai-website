'use client';

// 科技动画 VIP 徽章组件
export default function VIPBadge({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold relative overflow-hidden ${sizeClasses[size]}`}
      style={{
        background: 'linear-gradient(135deg, #00d4ff22 0%, #a855f722 50%, #00d4ff22 100%)',
        border: '1px solid rgba(0,212,255,0.3)',
        color: '#00d4ff',
        animation: 'vipPulse 2s ease-in-out infinite',
      }}
    >
      {/* 扫描线动画 */}
      <span
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.15) 50%, transparent 100%)',
          animation: 'vipScan 2s ease-in-out infinite',
        }}
      />
      {/* 星形图标 */}
      <svg className={`${iconSize[size]} relative z-10`} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.6))' }}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="url(#vipGradient)" stroke="#00d4ff" strokeWidth="0.5"/>
        <defs>
          <linearGradient id="vipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      {/* VIP 文字 */}
      <span className="relative z-10 tracking-wider" style={{
        background: 'linear-gradient(90deg, #00d4ff, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        VIP
      </span>

      <style>{`
        @keyframes vipPulse {
          0%, 100% { box-shadow: 0 0 5px rgba(0,212,255,0.3), 0 0 10px rgba(168,85,247,0.1); }
          50% { box-shadow: 0 0 10px rgba(0,212,255,0.5), 0 0 20px rgba(168,85,247,0.2); }
        }
        @keyframes vipScan {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </span>
  );
}
