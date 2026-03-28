"use client";

import { IconifyIcon } from "@/components/ui/iconify-icon";

export default function CustomerAnalyticsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">방문자 분석</h1>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-zinc-900/50 py-24">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
          <IconifyIcon icon="solar:chart-2-bold" width="32" height="32" />
        </div>
        <p className="text-lg font-medium text-zinc-300">
          방문자 분석 대시보드는 준비 중입니다
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          방문자 통계, 유입 경로, 지역별 분석 등이 곧 추가될 예정입니다
        </p>
      </div>
    </div>
  );
}
