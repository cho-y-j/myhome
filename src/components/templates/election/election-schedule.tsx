import type { SiteData } from "@/types/site";

interface Props {
  schedules: SiteData["schedules"];
  sectionTitle?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[d.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

function isPast(dateStr: string): boolean {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

export default function ElectionSchedule({ schedules, sectionTitle }: Props) {
  if (schedules.length === 0) return null;

  const sorted = [...schedules].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <section id="schedule" className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      {/* Section heading */}
      <div className="mb-10 text-center">
        <h2 className="section-heading text-2xl font-bold sm:text-3xl text-gray-900">
          {sectionTitle || "일정"}
        </h2>
      </div>

      <div className="space-y-3">
        {sorted.map((item) => {
          const past = isPast(item.date);
          const d = new Date(item.date);
          return (
            <div
              key={item.id}
              className={`flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                past ? "opacity-50" : ""
              }`}
            >
              {/* Date badge */}
              <div
                className="flex flex-shrink-0 flex-col items-center rounded-xl px-3 py-2 min-w-[52px] text-white"
                style={{ backgroundColor: past ? "#9ca3af" : "var(--primary)" }}
              >
                <span className="text-2xl font-bold leading-tight">
                  {d.getDate()}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {d.getMonth() + 1}월
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-900">{item.title}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                  <span>{formatDate(item.date)}</span>
                  {item.time && <span>{item.time}</span>}
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {item.location}
                    </span>
                  )}
                </div>
              </div>

              {past && (
                <span className="flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                  종료
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
