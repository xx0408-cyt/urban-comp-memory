import React from 'react';

const TechEffects: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      {/* HUD 边框 */}
      <div className="absolute inset-0">
        {/* 左上角 */}
        <div className="absolute top-4 left-4 w-24 h-24">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400/80 to-transparent" />
          <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-cyan-400/80 to-transparent" />
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 animate-pulse" />
        </div>

        {/* 右上角 */}
        <div className="absolute top-4 right-4 w-24 h-24">
          <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-cyan-400/80 to-transparent" />
          <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-cyan-400/80 to-transparent" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400 animate-pulse" />
        </div>

        {/* 左下角 */}
        <div className="absolute bottom-4 left-4 w-24 h-24">
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400/80 to-transparent" />
          <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-cyan-400/80 to-transparent" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 animate-pulse" />
        </div>

        {/* 右下角 */}
        <div className="absolute bottom-4 right-4 w-24 h-24">
          <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-cyan-400/80 to-transparent" />
          <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-cyan-400/80 to-transparent" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400 animate-pulse" />
        </div>

        {/* HUD 文字指示器 */}
        <div className="absolute top-6 left-32 text-cyan-400/80 font-mono text-[12px] tracking-widest animate-pulse">
          SYSTEM: ONLINE
        </div>
        <div className="absolute top-6 right-32 text-cyan-400/80 font-mono text-[12px] tracking-widest animate-pulse">
          DATA: SYNCHRONIZED
        </div>
        
        {/* 底部数据流装饰 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-cyan-500/40 font-mono text-[10px] tracking-[0.5em]">
          010101 URBAN COMP MEMORY 101010
        </div>
      </div>

      {/* 网格背景效果 - 增强科幻感 */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          backgroundPosition: 'center center',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
        }}
      />

      {/* 扫描线效果 */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.2)_50%)] bg-[length:100%_4px]" />

      {/* 粒子效果（精简版本，更柔和高级） */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${2 + Math.random() * 2}px`,
              height: `${2 + Math.random() * 2}px`,
              background: i % 3 === 0
                ? 'radial-gradient(circle, rgba(0, 255, 255, 0.4) 0%, transparent 70%)' // Cyan
                : i % 3 === 1
                ? 'radial-gradient(circle, rgba(157, 0, 255, 0.4) 0%, transparent 70%)' // Purple
                : 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)', // White
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 12}s`,
            }}
          />
        ))}
      </div>

      {/* 边缘渐变晕影 */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/40" />
    </div>
  );
};

export default TechEffects;
