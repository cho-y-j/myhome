"use client";

import { useEffect, useState } from "react";
import type { SiteData } from "@/types/site";

interface Props {
  settings: SiteData["settings"];
  candidateName: string;
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

export default function ElectionHero({ settings, candidateName }: Props) {
  const dDay = useDDay(settings.electionDate);

  return (
    <section
      id="hero"
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background with hero image and gradient overlay */}
      {settings.heroImageUrl ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.heroImageUrl}
            alt={candidateName}
            className="h-full w-full object-cover object-top"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, var(--primary) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.85) 100%)`,
            }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, var(--primary) 0%, #1a1a2e 100%)`,
          }}
        />
      )}

      {/* Top badges */}
      <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-center gap-3 px-6">
        {settings.partyName && (
          <span className="rounded-full bg-white px-4 py-1.5 text-xs font-bold tracking-wide"
            style={{ color: "var(--primary)" }}
          >
            {settings.partyName}
          </span>
        )}
        {dDay !== null && settings.electionDate && (
          <span
            className="rounded-full px-4 py-1.5 text-xs font-bold text-white tracking-wide"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {settings.electionName ? `${settings.electionName} ` : ""}
            {formatDDay(dDay)}
          </span>
        )}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center text-white mt-16">
        {/* Position title */}
        {settings.positionTitle && (
          <p className="text-sm font-medium tracking-widest uppercase opacity-90">
            {settings.positionTitle}
          </p>
        )}

        {/* Candidate name */}
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          {candidateName}
        </h1>

        {/* Slogan */}
        {settings.heroSlogan && (
          <p className="mt-2 max-w-lg text-2xl font-semibold sm:text-3xl leading-snug">
            {settings.heroSlogan}
          </p>
        )}

        {/* Sub-slogan */}
        {settings.heroSubSlogan && (
          <p className="max-w-md text-lg opacity-75 leading-relaxed">
            {settings.heroSubSlogan}
          </p>
        )}

        {/* CTA buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#pledges"
            className="rounded-full px-7 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            공약 보기
          </a>
          <a
            href="#about"
            className="rounded-full border-2 border-white/60 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            후보 소개
          </a>
        </div>
      </div>

      {/* Scroll down arrow */}
      <div className="absolute bottom-8 z-10 flex flex-col items-center gap-1 animate-bounce">
        <span className="text-xs text-white/50 tracking-wider">SCROLL</span>
        <svg
          className="h-5 w-5 text-white/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </section>
  );
}
