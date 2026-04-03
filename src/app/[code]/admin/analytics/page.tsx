"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconifyIcon } from "@/components/ui/iconify-icon";

interface OverviewData {
  totalVisits: number;
  uniqueVisitors: number;
  mobileVisits: number;
  desktopVisits: number;
}

interface DailyVisitor {
  date: string;
  totalVisits: number;
  uniqueVisitors: number;
  mobileVisits: number;
  desktopVisits: number;
}

interface EventData {
  eventType: string;
  _sum: { count: number };
}

const EVENT_LABELS: Record<string, string> = {
  share_kakao: "카카오 공유",
  share_copy: "링크 복사",
  video_play: "영상 재생",
  phone_click: "전화 클릭",
  pledge_view: "공약 조회",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function CustomerAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [visitors, setVisitors] = useState<DailyVisitor[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Auth check
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        router.push(`/${code}/admin/login`);
        return;
      }

      const [overviewRes, visitorsRes, eventsRes] = await Promise.all([
        fetch(`/api/analytics/overview?period=month`),
        fetch(`/api/analytics/visitors`),
        fetch(`/api/analytics/events`),
      ]);

      if (overviewRes.ok) {
        const overviewJson = await overviewRes.json();
        setOverview(overviewJson.data || overviewJson);
      }

      if (visitorsRes.ok) {
        const visitorsJson = await visitorsRes.json();
        setVisitors(visitorsJson.data || visitorsJson || []);
      }

      if (eventsRes.ok) {
        const eventsJson = await eventsRes.json();
        setEvents(eventsJson.data || eventsJson || []);
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [code, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalEvents = events.reduce((sum, e) => sum + (e._sum?.count || 0), 0);
  const mobilePercent =
    overview && overview.totalVisits > 0
      ? Math.round((overview.mobileVisits / overview.totalVisits) * 100)
      : 0;
  const desktopPercent = 100 - mobilePercent;
  const maxVisits = Math.max(...visitors.map((d) => d.totalVisits), 1);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
          <p className="text-sm text-zinc-500">분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">방문자 분석</h1>
          <p className="mt-1 text-sm text-zinc-500">최근 30일 방문자 통계</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          <IconifyIcon icon="solar:refresh-bold" width="16" height="16" />
          새로고침
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <SummaryCard
          icon="solar:users-group-rounded-bold"
          label="총 방문자"
          value={overview?.totalVisits ?? 0}
          suffix="명"
          color="emerald"
        />
        <SummaryCard
          icon="solar:user-check-bold"
          label="순 방문자"
          value={overview?.uniqueVisitors ?? 0}
          suffix="명"
          color="blue"
        />
        <SummaryCard
          icon="solar:smartphone-bold"
          label="모바일 비율"
          value={mobilePercent}
          suffix="%"
          color="violet"
        />
        <SummaryCard
          icon="solar:cursor-bold"
          label="주요 이벤트"
          value={totalEvents}
          suffix="건"
          color="amber"
        />
      </div>

      {/* 30-Day Visitor Trend Chart */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/80 p-5">
        <h2 className="mb-4 text-base font-semibold text-zinc-200">
          일별 방문자 추이
        </h2>
        {visitors.length === 0 ? (
          <EmptyState message="방문자 데이터가 없습니다" />
        ) : (
          <div>
            {/* Y-axis hint */}
            <div className="mb-1 flex items-end justify-between text-[10px] text-zinc-600">
              <span>{maxVisits}명</span>
              <span>최근 30일</span>
            </div>
            {/* Bars */}
            <div className="flex items-end gap-[2px] h-48 sm:gap-1">
              {visitors.map((day) => (
                <div key={day.date} className="flex-1 group relative flex flex-col items-center">
                  <div
                    className="w-full rounded-t bg-emerald-500 transition-all hover:bg-emerald-400"
                    style={{
                      height: `${(day.totalVisits / maxVisits) * 100}%`,
                      minHeight: day.totalVisits > 0 ? "2px" : "0",
                    }}
                  />
                  {/* Tooltip */}
                  <div className="pointer-events-none hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 rounded bg-zinc-800 px-2 py-1 text-[11px] text-white shadow-lg whitespace-nowrap">
                    <div className="font-medium">{formatDate(day.date)}</div>
                    <div className="text-zinc-400">
                      방문 {day.totalVisits}명 · 순방문 {day.uniqueVisitors}명
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* X-axis labels */}
            <div className="mt-2 flex">
              {visitors.map((day, i) => (
                <div key={day.date} className="flex-1 text-center">
                  {i % 5 === 0 ? (
                    <span className="text-[10px] text-zinc-600">
                      {formatDate(day.date)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Device Breakdown */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/80 p-5">
          <h2 className="mb-5 text-base font-semibold text-zinc-200">
            기기별 비율
          </h2>
          {!overview || overview.totalVisits === 0 ? (
            <EmptyState message="데이터가 없습니다" />
          ) : (
            <div className="flex items-center gap-8">
              {/* Donut Chart */}
              <div className="relative flex-shrink-0">
                <div
                  className="h-32 w-32 rounded-full"
                  style={{
                    background: `conic-gradient(#10b981 0% ${mobilePercent}%, #3b82f6 ${mobilePercent}% 100%)`,
                  }}
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900 m-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {mobilePercent}%
                      </div>
                      <div className="text-[10px] text-zinc-500">모바일</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <div>
                    <div className="text-sm font-medium text-zinc-300">
                      모바일
                    </div>
                    <div className="text-xs text-zinc-500">
                      {overview.mobileVisits.toLocaleString()}명 ({mobilePercent}%)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-zinc-300">
                      데스크톱
                    </div>
                    <div className="text-xs text-zinc-500">
                      {overview.desktopVisits.toLocaleString()}명 ({desktopPercent}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Statistics */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/80 p-5">
          <h2 className="mb-5 text-base font-semibold text-zinc-200">
            이벤트 통계
          </h2>
          {events.length === 0 ? (
            <EmptyState message="이벤트 데이터가 없습니다" />
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const count = event._sum?.count || 0;
                const percent =
                  totalEvents > 0
                    ? Math.round((count / totalEvents) * 100)
                    : 0;
                return (
                  <div key={event.eventType}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-zinc-300">
                        {EVENT_LABELS[event.eventType] || event.eventType}
                      </span>
                      <span className="text-sm font-medium text-zinc-400">
                        {count.toLocaleString()}건
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500/80 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-sm font-medium text-zinc-400">합계</span>
                <span className="text-sm font-bold text-zinc-200">
                  {totalEvents.toLocaleString()}건
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function SummaryCard({
  icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  suffix: string;
  color: "emerald" | "blue" | "violet" | "amber";
}) {
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    blue: "bg-blue-500/10 text-blue-400",
    violet: "bg-violet-500/10 text-violet-400",
    amber: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/80 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}
        >
          <IconifyIcon icon={icon} width="20" height="20" />
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="text-xl font-bold text-zinc-100">
            {value.toLocaleString()}
            <span className="ml-0.5 text-sm font-normal text-zinc-500">
              {suffix}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
        <IconifyIcon
          icon="solar:chart-2-bold"
          width="24"
          height="24"
          className="text-zinc-600"
        />
      </div>
      <p className="text-sm text-zinc-600">{message}</p>
    </div>
  );
}
