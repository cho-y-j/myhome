"use client";

import { useEffect, useState } from "react";
import type { SiteData } from "@/types/site";

interface Props {
  settings: SiteData["settings"];
  candidateName: string;
  button1Text?: string;
  button1Link?: string;
  button2Text?: string;
  button2Link?: string;
  badgeFontSize?: string;
  electionFontSize?: string;
}

function useDDay(dateStr: string | null) {
  const [dDay, setDDay] = useState<number | null>(null);

  useEffect(() => {
    if (!dateStr) return;
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    function calc() {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diff = Math.ceil(
        (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      setDDay(diff);
    }

    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [dateStr]);

  return dDay;
}

function formatDDay(d: number): string {
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-Day";
  return `D+${Math.abs(d)}`;
}

export default function ElectionHero({
  settings,
  candidateName,
  button1Text,
  button1Link,
  button2Text,
  button2Link,
  badgeFontSize = "text-xs",
  electionFontSize = "text-xs",
}: Props) {
  const dDay = useDDay(settings.electionDate);

  /* ── Badges (당명 + 선거 D-day) ── */
  const badges = (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {settings.partyName && (
        <span
          className={`rounded-full bg-white/90 px-4 py-1.5 ${badgeFontSize} font-bold tracking-wide shadow-sm`}
          style={{ color: "var(--primary)" }}
        >
          {settings.partyName}
        </span>
      )}
      {dDay !== null && settings.electionDate && (
        <span
          className={`rounded-full px-4 py-1.5 ${electionFontSize} font-bold text-white tracking-wide shadow-sm`}
          style={{ backgroundColor: "var(--primary)" }}
        >
          {settings.electionName ? `${settings.electionName} ` : ""}
          {formatDDay(dDay)}
        </span>
      )}
    </div>
  );

  /* ── Slogan area ── */
  const sloganArea = (
    <div className="text-center text-white px-6 py-12 sm:py-16">
      {settings.positionTitle && (
        <p className="text-sm font-medium tracking-widest uppercase opacity-90 mb-3">
          {settings.positionTitle}
        </p>
      )}

      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl mb-4">
        {candidateName}
      </h1>

      {settings.heroSlogan && (
        <p className="text-xl font-semibold sm:text-2xl leading-snug mb-2">
          &ldquo;{settings.heroSlogan}&rdquo;
        </p>
      )}

      {settings.heroSubSlogan && (
        <p className="text-sm opacity-75 leading-relaxed max-w-md mx-auto mb-8">
          {settings.heroSubSlogan}
        </p>
      )}

      <div className="flex items-center justify-center gap-3">
        <a
          href={button1Link || "#pledges"}
          className="rounded-full px-7 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 shadow-lg"
          style={{ backgroundColor: "var(--primary)", filter: "brightness(0.85)" }}
        >
          {button1Text || "공약 보기"}
        </a>
        <a
          href={button2Link || "#about"}
          className="rounded-full border-2 border-white/50 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          {button2Text || "후보 소개"}
        </a>
      </div>
    </div>
  );

  return (
    <section id="hero" className="w-full">
      {settings.heroImageUrl ? (
        <>
          {/* ① 컬러 바 — 이미지 위 별도 영역 */}
          <div
            className="w-full px-4 py-4"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {badges}
          </div>

          {/* ② 히어로 이미지 — 풀 너비, 오버레이 없음 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.heroImageUrl}
            alt={candidateName}
            className="w-full"
          />

          {/* ③ 슬로건 영역 — 이미지 아래 별도 섹션 */}
          <div
            style={{
              background: `linear-gradient(180deg, var(--primary) 0%, #1a1a2e 100%)`,
            }}
          >
            {sloganArea}
          </div>
        </>
      ) : (
        /* 이미지 없으면: 뱃지 + 슬로건 하나의 그라데이션 섹션 */
        <div
          className="w-full"
          style={{
            background: `linear-gradient(180deg, var(--primary) 0%, #1a1a2e 100%)`,
          }}
        >
          <div className="px-4 pt-10 pb-4">
            {badges}
          </div>
          {sloganArea}
        </div>
      )}
    </section>
  );
}
