"use client";

import { useState } from "react";
import type { SiteData } from "@/types/site";

interface Props {
  videos: SiteData["videos"];
  sectionTitle?: string;
}

export default function ElectionVideos({ videos, sectionTitle }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (videos.length === 0) return null;

  const sorted = [...videos].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section id="video" className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-6">
        {/* Section heading */}
        <div className="mb-10 text-center">
          <h2 className="section-heading text-2xl font-bold sm:text-3xl text-gray-900">
            {sectionTitle || "영상"}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((video) => (
            <div key={video.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              {activeId === video.videoId ? (
                <div className="relative aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
                    title={video.title ?? "YouTube video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setActiveId(video.videoId)}
                  className="group relative block w-full"
                >
                  <div className="aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                      alt={video.title ?? ""}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                      }}
                    />
                  </div>

                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-transform group-hover:scale-110"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      <svg className="h-7 w-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              )}

              {/* Title below thumbnail */}
              {video.title && (
                <div className="p-4">
                  <p className="font-semibold text-gray-900 line-clamp-2">
                    {video.title}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
