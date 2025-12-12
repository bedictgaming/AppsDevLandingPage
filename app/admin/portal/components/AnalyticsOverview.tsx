import React from "react";

interface AnalyticsOverviewProps {
  analytics: {
    foundWithPhotos: number;
    lostWithPhotos: number;
    avgItemsPerUser: number;
    itemsWithMessages: number;
    systemHealth: number;
  };
}

export default function AnalyticsOverview({ analytics }: AnalyticsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-orange-500/30 transition-all">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Quick Analytics</h3>
          <div className="text-2xl">📊</div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">System Health</span>
            <span className="text-green-400 font-bold">{analytics.systemHealth}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Items with Photos</span>
            <span className="text-cyan-400 font-bold">{analytics.foundWithPhotos + analytics.lostWithPhotos}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Items per User</span>
            <span className="text-orange-400 font-bold">{analytics.avgItemsPerUser}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
