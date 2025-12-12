import React from "react";

interface StatsGridProps {
  stats: {
    totalReports: number;
    lostItems: number;
    foundItems: number;
    activeUsers: number;
  };
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all">
        <p className="text-sm text-gray-400 uppercase tracking-wide">Total Reports</p>
        <p className="text-3xl font-bold text-white mt-2">{stats.totalReports}</p>
        <div className="text-2xl mt-2">📋</div>
      </div>
      <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-red-500/30 transition-all">
        <p className="text-sm text-gray-400 uppercase tracking-wide">Lost Items</p>
        <p className="text-3xl font-bold text-white mt-2">{stats.lostItems}</p>
        <div className="text-2xl mt-2">🔴</div>
      </div>
      <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-green-500/30 transition-all">
        <p className="text-sm text-gray-400 uppercase tracking-wide">Found Items Posted</p>
        <p className="text-3xl font-bold text-white mt-2">{stats.foundItems}</p>
        <div className="text-2xl mt-2">✅</div>
      </div>
      <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all">
        <p className="text-sm text-gray-400 uppercase tracking-wide">Active Users</p>
        <p className="text-3xl font-bold text-white mt-2">{stats.activeUsers}</p>
        <div className="text-2xl mt-2">👥</div>
      </div>
    </div>
  );
}
