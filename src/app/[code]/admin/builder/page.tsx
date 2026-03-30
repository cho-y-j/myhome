/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

/* ─── Types ─── */
interface Block {
  id: number;
  type: string;
  title: string | null;
  content: unknown;
  visible: boolean;
  sortOrder: number;
}

interface ProfileItem {
  id?: number;
  type: string;
  title: string;
  isCurrent: boolean;
  sortOrder?: number;
}

interface PledgeItem {
  id?: number;
  icon: string;
  title: string;
  description: string | null;
  details: string[];
  sortOrder?: number;
}

interface GalleryItem {
  id?: number;
  url: string;
  altText: string | null;
  category: string;
  sortOrder?: number;
}

interface ScheduleItem {
  id?: number;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
}

interface NewsItem {
  id?: number;
  title: string;
  source: string | null;
  url: string | null;
  imageUrl?: string | null;
  publishedDate: string | null;
}

interface VideoItem {
  id?: number;
  videoId: string;
  title: string | null;
  sortOrder?: number;
}

interface ContactItem {
  id?: number;
  type: string;
  label: string | null;
  value: string;
  url: string | null;
  sortOrder?: number;
}

interface LinkItem {
  title: string;
  url: string;
  description: string;
}

interface SiteSettings {
  heroImageUrl?: string;
  profileImageUrl?: string;
  heroSlogan?: string;
  heroSubSlogan?: string;
  introText?: string;
  subtitle?: string;
  partyName?: string;
  positionTitle?: string;
  primaryColor?: string;
  accentColor?: string;
  electionDate?: string;
  electionName?: string;
  kakaoAppKey?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
}

/* ─── Constants ─── */
const BLOCK_TYPES: Record<string, { label: string; icon: string; defaultTitle: string }> = {
  hero: { label: "메인 배너", icon: "🖼", defaultTitle: "" },
  intro: { label: "후보 소개", icon: "📝", defaultTitle: "후보 소개" },
  career: { label: "학력/경력", icon: "📋", defaultTitle: "학력·경력" },
  goals: { label: "핵심 공약", icon: "🎯", defaultTitle: "핵심 공약" },
  gallery: { label: "활동 사진", icon: "📸", defaultTitle: "활동 사진" },
  schedule: { label: "선거 일정", icon: "📅", defaultTitle: "선거 일정" },
  news: { label: "보도자료", icon: "📰", defaultTitle: "보도자료" },
  videos: { label: "홍보 영상", icon: "🎬", defaultTitle: "홍보 영상" },
  contacts: { label: "후원/연락", icon: "📞", defaultTitle: "후원·연락처" },
  links: { label: "관련 링크", icon: "🔗", defaultTitle: "관련 링크" },
};

const BLOCK_TYPE_KEYS = Object.keys(BLOCK_TYPES);

/* ─── Shared editor styles ─── */
const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 placeholder:text-zinc-600";
const labelClass =
  "mb-1 block text-xs font-medium text-zinc-400 uppercase tracking-wider";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50";
const btnSecondary =
  "rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700";

/* ─── Helper: API fetch with JSON ─── */
async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  return res.json();
}

/* ─── Date helpers ─── */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[d.getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

function formatNewsDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function isPast(dateStr: string): boolean {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

function formatDDay(d: number): string {
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-Day";
  return `D+${Math.abs(d)}`;
}

function calcDDay(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/* ═══════════════════════════════════════════════
   Main Builder Page
   ═══════════════════════════════════════════════ */
export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  /* ─── State ─── */
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [pledges, setPledges] = useState<PledgeItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [siteName, setSiteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingBlockType, setEditingBlockType] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showSiteInfo, setShowSiteInfo] = useState(false);

  /* ─── Auth check ─── */
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          router.push(`/${code}/admin/login`);
        } else {
          setSiteName(data.data?.user?.name || code);
        }
      })
      .catch(() => router.push(`/${code}/admin/login`));
  }, [code, router]);

  /* ─── Load all data ─── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [bRes, sRes, pRes, plRes, gRes, scRes, nRes, vRes, cRes] =
      await Promise.all([
        apiFetch<Block[]>("/api/site/blocks"),
        apiFetch<SiteSettings>("/api/site/settings"),
        apiFetch<ProfileItem[]>("/api/site/profiles"),
        apiFetch<PledgeItem[]>("/api/site/pledges"),
        apiFetch<GalleryItem[]>("/api/site/gallery"),
        apiFetch<ScheduleItem[]>("/api/site/schedules"),
        apiFetch<NewsItem[]>("/api/site/news"),
        apiFetch<VideoItem[]>("/api/site/videos"),
        apiFetch<ContactItem[]>("/api/site/contacts"),
      ]);
    if (bRes.success && bRes.data) setBlocks(bRes.data);
    if (sRes.success && sRes.data) setSettings(sRes.data);
    if (pRes.success && pRes.data) setProfiles(pRes.data);
    if (plRes.success && plRes.data) setPledges(plRes.data);
    if (gRes.success && gRes.data) setGallery(gRes.data);
    if (scRes.success && scRes.data) setSchedules(scRes.data);
    if (nRes.success && nRes.data) setNews(nRes.data);
    if (vRes.success && vRes.data) setVideos(vRes.data);
    if (cRes.success && cRes.data) setContacts(cRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ─── Reload a single section ─── */
  async function reloadSection(type: string) {
    switch (type) {
      case "hero":
      case "intro": {
        const r = await apiFetch<SiteSettings>("/api/site/settings");
        if (r.success && r.data) setSettings(r.data);
        break;
      }
      case "career": {
        const r = await apiFetch<ProfileItem[]>("/api/site/profiles");
        if (r.success && r.data) setProfiles(r.data);
        break;
      }
      case "goals": {
        const r = await apiFetch<PledgeItem[]>("/api/site/pledges");
        if (r.success && r.data) setPledges(r.data);
        break;
      }
      case "gallery": {
        const r = await apiFetch<GalleryItem[]>("/api/site/gallery");
        if (r.success && r.data) setGallery(r.data);
        break;
      }
      case "schedule": {
        const r = await apiFetch<ScheduleItem[]>("/api/site/schedules");
        if (r.success && r.data) setSchedules(r.data);
        break;
      }
      case "news": {
        const r = await apiFetch<NewsItem[]>("/api/site/news");
        if (r.success && r.data) setNews(r.data);
        break;
      }
      case "videos": {
        const r = await apiFetch<VideoItem[]>("/api/site/videos");
        if (r.success && r.data) setVideos(r.data);
        break;
      }
      case "contacts": {
        const r = await apiFetch<ContactItem[]>("/api/site/contacts");
        if (r.success && r.data) setContacts(r.data);
        break;
      }
      case "links": {
        const r = await apiFetch<Block[]>("/api/site/blocks");
        if (r.success && r.data) setBlocks(r.data);
        break;
      }
    }
  }

  /* ─── Flash save message ─── */
  function flashSave(msg: string) {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 2000);
  }

  /* ─── Add block with example content ─── */
  async function addBlock(type: string, insertIndex: number) {
    const sortOrder = insertIndex >= 0 ? insertIndex + 1 : 0;
    const res = await apiFetch<Block>("/api/site/blocks", {
      method: "POST",
      body: JSON.stringify({ type, sortOrder }),
    });
    if (res.success) {
      // 예시 콘텐츠 자동 생성
      await seedExampleContent(type);
      const bRes = await apiFetch<Block[]>("/api/site/blocks");
      if (bRes.success && bRes.data) setBlocks(bRes.data);
      // 관련 데이터 리로드
      await reloadSection(type);
    }
    setShowAddMenu(null);
  }

  /* ─── Seed example content for new blocks ─── */
  async function seedExampleContent(type: string) {
    switch (type) {
      case "career": {
        const examples = [
          { type: "education", title: "○○대학교 행정학과 졸업", isCurrent: false },
          { type: "career", title: "제○대 ○○구 구의회 의원", isCurrent: false },
          { type: "career", title: "○○당 ○○시당 부위원장 (현)", isCurrent: true },
        ];
        for (const item of examples) {
          await apiFetch("/api/site/profiles", { method: "POST", body: JSON.stringify(item) });
        }
        break;
      }
      case "goals": {
        const examples = [
          { icon: "fas fa-road", title: "교통 인프라 확충", description: "출퇴근 시간 단축을 위한 교통 개선", details: ["버스 노선 신설", "주차장 확충"] },
          { icon: "fas fa-baby", title: "보육·교육 강화", description: "아이 키우기 좋은 지역 만들기", details: ["공립 어린이집 확대", "방과후 프로그램 지원"] },
        ];
        for (const item of examples) {
          await apiFetch("/api/site/pledges", { method: "POST", body: JSON.stringify(item) });
        }
        break;
      }
      case "schedule": {
        const today = new Date();
        const d1 = new Date(today); d1.setDate(d1.getDate() + 3);
        const d2 = new Date(today); d2.setDate(d2.getDate() + 7);
        const examples = [
          { title: "거리 유세", date: d1.toISOString().slice(0, 10), time: "10:00", location: "○○역 앞" },
          { title: "주민 간담회", date: d2.toISOString().slice(0, 10), time: "14:00", location: "○○동 주민센터" },
        ];
        for (const item of examples) {
          await apiFetch("/api/site/schedules", { method: "POST", body: JSON.stringify(item) });
        }
        break;
      }
      case "contacts": {
        const examples = [
          { type: "phone", value: "02-000-0000", label: "선거사무소" },
          { type: "email", value: "example@email.com", label: "이메일" },
        ];
        for (const item of examples) {
          await apiFetch("/api/site/contacts", { method: "POST", body: JSON.stringify(item) });
        }
        break;
      }
      case "intro": {
        await apiFetch("/api/site/settings", {
          method: "PUT",
          body: JSON.stringify({
            introText: "주민 여러분의 목소리에 귀 기울이겠습니다.\n지역 발전과 주민 복지를 위해 최선을 다하겠습니다.",
          }),
        });
        break;
      }
    }
  }

  /* ─── Toggle visibility ─── */
  async function toggleVisibility(block: Block) {
    const res = await apiFetch<Block>(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ visible: !block.visible }),
    });
    if (res.success && res.data) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === res.data!.id ? res.data! : b))
      );
    }
  }

  /* ─── Delete block ─── */
  async function deleteBlock(block: Block) {
    if (!confirm(`"${BLOCK_TYPES[block.type]?.label || block.type}" 블록을 삭제하시겠습니까?`)) return;
    const res = await apiFetch(`/api/site/blocks/${block.id}`, { method: "DELETE" });
    if (res.success) {
      setBlocks((prev) => prev.filter((b) => b.id !== block.id));
      if (editingBlockType === block.type) setEditingBlockType(null);
    }
  }

  /* ─── Drag and drop ─── */
  function handleDragStart(index: number) {
    setDragIndex(index);
  }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }
  function handleDragLeave() {
    setDragOverIndex(null);
  }
  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(targetIndex, 0, moved);
    setBlocks(newBlocks);
    setDragIndex(null);
    setDragOverIndex(null);
    await apiFetch("/api/site/blocks/reorder", {
      method: "PUT",
      body: JSON.stringify({ ids: newBlocks.map((b) => b.id) }),
    });
  }
  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  const primaryColor = settings.primaryColor || "#C9151E";
  const accentColor = settings.accentColor || "#1A56DB";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-500">페이지 빌더 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white text-gray-900"
      style={
        {
          "--primary": primaryColor,
          "--accent": accentColor,
        } as React.CSSProperties
      }
    >
      {/* ── Admin Top Bar ── */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex h-12 items-center justify-between bg-zinc-900/95 px-4 backdrop-blur-sm border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${code}/admin`)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span>&#8592;</span>
            <span>관리자</span>
          </button>
          <div className="h-4 w-px bg-white/20" />
          <span className="text-sm font-semibold text-white">{siteName}</span>
          <span className="rounded bg-blue-600/20 px-2 py-0.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
            빌더
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSiteInfo(!showSiteInfo)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              showSiteInfo
                ? "bg-blue-600 text-white"
                : "bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white"
            }`}
          >
            &#9881; 사이트 정보
          </button>
          <a
            href={`/${code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/20 hover:text-white"
          >
            사이트 보기
            <span className="text-xs">&#8599;</span>
          </a>
        </div>
      </div>

      {/* ── Site Info Panel ── */}
      {showSiteInfo && (
        <SiteInfoPanel
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSiteInfo(false)}
        />
      )}

      {/* ── Spacer for fixed top bar ── */}
      <div className="h-12" />

      {/* ── Split layout: preview left + edit panel right ── */}
      <div className="flex min-h-[calc(100vh-3rem)]">
        {/* Left: Live Preview */}
        <div className={`flex-1 transition-all duration-300 ${editingBlockType ? "lg:mr-[420px]" : ""}`}>
          {/* Add block at top */}
          <AddBlockButton
            index={-1}
            showAddMenu={showAddMenu}
            setShowAddMenu={setShowAddMenu}
            onAdd={addBlock}
            existingTypes={blocks.map((b) => b.type)}
          />

          {/* Empty state */}
          {blocks.length === 0 && (
            <div className="mx-auto max-w-2xl px-6 py-20 text-center">
              <div className="text-5xl mb-4">&#128230;</div>
              <p className="text-lg font-semibold text-gray-400">
                아직 블록이 없습니다
              </p>
              <p className="mt-2 text-sm text-gray-400">
                위의 + 버튼을 눌러 섹션을 추가하세요
              </p>
            </div>
          )}

          {/* Render blocks as live preview sections */}
          {blocks.map((block, index) => (
            <div key={block.id}>
              <SectionWrapper
                block={block}
                index={index}
                isEditing={editingBlockType === block.type}
                isHovered={hoveredBlock === block.type}
                isDragOver={dragOverIndex === index}
                isDragging={dragIndex === index}
                onHover={(h) => setHoveredBlock(h ? block.type : null)}
                onEdit={() =>
                  setEditingBlockType(
                    editingBlockType === block.type ? null : block.type
                  )
                }
                onToggleVisibility={() => toggleVisibility(block)}
                onDelete={() => deleteBlock(block)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
              >
                <SectionPreview
                  block={block}
                  settings={settings}
                  siteName={siteName}
                  profiles={profiles}
                  pledges={pledges}
                  gallery={gallery}
                  schedules={schedules}
                  news={news}
                  videos={videos}
                  contacts={contacts}
                />
              </SectionWrapper>

              <AddBlockButton
                index={index}
                showAddMenu={showAddMenu}
                setShowAddMenu={setShowAddMenu}
                onAdd={addBlock}
                existingTypes={blocks.map((b) => b.type)}
              />
            </div>
          ))}
        </div>

        {/* Right: Edit Panel (desktop) / Bottom Sheet (mobile) */}
        {editingBlockType && (() => {
          const editBlock = blocks.find((b) => b.type === editingBlockType);
          if (!editBlock) return null;
          return (
            <>
              {/* Desktop: fixed right panel */}
              <div className="hidden lg:block fixed top-12 right-0 w-[420px] h-[calc(100vh-3rem)] bg-zinc-900 border-l border-white/10 shadow-2xl z-40 animate-in overflow-y-auto">
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{BLOCK_TYPES[editBlock.type]?.icon}</span>
                      {BLOCK_TYPES[editBlock.type]?.label || editBlock.type} 편집
                    </h3>
                    <button
                      onClick={() => setEditingBlockType(null)}
                      className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <BlockTitleEditor
                    block={editBlock}
                    onTitleSaved={(updatedBlock) => {
                      setBlocks((prev) =>
                        prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
                      );
                    }}
                  />
                  <SectionEditor
                    block={editBlock}
                    settings={settings}
                    setSettings={setSettings}
                    profiles={profiles}
                    pledges={pledges}
                    gallery={gallery}
                    schedules={schedules}
                    news={news}
                    videos={videos}
                    contacts={contacts}
                    onSaving={() => setSaving(true)}
                    onSaved={async () => {
                      setSaving(false);
                      await reloadSection(editBlock.type);
                      const bRes = await apiFetch<Block[]>("/api/site/blocks");
                      if (bRes.success && bRes.data) setBlocks(bRes.data);
                      flashSave("저장되었습니다");
                    }}
                    onCancel={() => setEditingBlockType(null)}
                  />
                </div>
              </div>

              {/* Mobile: bottom sheet */}
              <div className="lg:hidden fixed inset-x-0 bottom-0 z-40">
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-black/40"
                  onClick={() => setEditingBlockType(null)}
                />
                {/* Sheet */}
                <div className="relative bg-zinc-900 rounded-t-2xl border-t border-white/10 shadow-2xl max-h-[70vh] overflow-y-auto animate-in">
                  {/* Handle */}
                  <div className="sticky top-0 bg-zinc-900 pt-2 pb-1 flex justify-center rounded-t-2xl z-10">
                    <div className="w-10 h-1 rounded-full bg-zinc-600" />
                  </div>
                  <div className="px-5 pb-8">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{BLOCK_TYPES[editBlock.type]?.icon}</span>
                        {BLOCK_TYPES[editBlock.type]?.label || editBlock.type} 편집
                      </h3>
                      <button
                        onClick={() => setEditingBlockType(null)}
                        className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <BlockTitleEditor
                      block={editBlock}
                      onTitleSaved={(updatedBlock) => {
                        setBlocks((prev) =>
                          prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
                        );
                      }}
                    />
                    <SectionEditor
                      block={editBlock}
                      settings={settings}
                      setSettings={setSettings}
                      profiles={profiles}
                      pledges={pledges}
                      gallery={gallery}
                      schedules={schedules}
                      news={news}
                      videos={videos}
                      contacts={contacts}
                      onSaving={() => setSaving(true)}
                      onSaved={async () => {
                        setSaving(false);
                        await reloadSection(editBlock.type);
                        const bRes = await apiFetch<Block[]>("/api/site/blocks");
                        if (bRes.success && bRes.data) setBlocks(bRes.data);
                        flashSave("저장되었습니다");
                      }}
                      onCancel={() => setEditingBlockType(null)}
                    />
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* ── Save toast ── */}
      {(saving || saveMessage) && (
        <div className="fixed bottom-6 right-6 z-[110] rounded-xl bg-zinc-900 px-5 py-3 text-sm text-white shadow-2xl border border-white/10 flex items-center gap-2">
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              저장 중...
            </>
          ) : (
            <>
              <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {saveMessage}
            </>
          )}
        </div>
      )}

      {/* ── Animation style ── */}
      <style jsx global>{`
        .animate-in {
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Section Wrapper — hover overlay + toolbar
   ═══════════════════════════════════════════════ */
function SectionWrapper({
  block,
  index,
  isEditing,
  isHovered,
  isDragOver,
  isDragging,
  onHover,
  onEdit,
  onToggleVisibility,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  children,
}: {
  block: Block;
  index: number;
  isEditing: boolean;
  isHovered: boolean;
  isDragOver: boolean;
  isDragging: boolean;
  onHover: (h: boolean) => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}) {
  const info = BLOCK_TYPES[block.type];

  return (
    <div
      className={`relative transition-all duration-200 ${
        isDragging ? "opacity-40" : ""
      } ${isDragOver ? "ring-2 ring-blue-500/50 ring-inset" : ""} ${
        !block.visible ? "opacity-40" : ""
      }`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Hover toolbar */}
      <div
        className={`absolute top-2 right-2 z-50 flex items-center gap-1 rounded-lg bg-zinc-900/90 px-2 py-1 shadow-lg backdrop-blur-sm border border-white/10 transition-opacity duration-150 ${
          isHovered || isEditing ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Drag handle */}
        <span
          className="cursor-grab text-zinc-500 hover:text-white text-sm px-1 active:cursor-grabbing"
          title="드래그하여 순서 변경"
        >
          &#9776;
        </span>
        <div className="w-px h-4 bg-white/10" />
        {/* Section name */}
        <span className="text-xs font-medium text-zinc-400 px-1">
          {info?.icon} {info?.label || block.type}
        </span>
        <div className="w-px h-4 bg-white/10" />
        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className={`rounded p-1 text-xs transition-colors ${
            block.visible
              ? "text-zinc-400 hover:text-white hover:bg-white/10"
              : "text-red-400 hover:text-red-300 hover:bg-white/10"
          }`}
          title={block.visible ? "섹션 숨기기" : "섹션 보이기"}
        >
          {block.visible ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
        {/* Edit button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={`rounded p-1 text-xs transition-colors ${
            isEditing
              ? "text-blue-400 bg-blue-500/20"
              : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
          title="편집"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="삭제"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Hidden badge */}
      {!block.visible && (
        <div className="absolute top-2 left-2 z-50 rounded bg-red-500/80 px-2 py-0.5 text-[10px] font-bold text-white">
          숨김
        </div>
      )}

      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Section Live Preview — renders actual content
   ═══════════════════════════════════════════════ */
function SectionPreview({
  block,
  settings,
  siteName,
  profiles,
  pledges,
  gallery,
  schedules,
  news,
  videos,
  contacts,
}: {
  block: Block;
  settings: SiteSettings;
  siteName: string;
  profiles: ProfileItem[];
  pledges: PledgeItem[];
  gallery: GalleryItem[];
  schedules: ScheduleItem[];
  news: NewsItem[];
  videos: VideoItem[];
  contacts: ContactItem[];
}) {
  switch (block.type) {
    case "hero":
      return <HeroPreview block={block} settings={settings} candidateName={siteName} />;
    case "intro":
      return (
        <IntroPreview
          block={block}
          settings={settings}
          profiles={profiles}
          candidateName={siteName}
        />
      );
    case "career":
      return (
        <CareerPreview
          block={block}
          profiles={profiles}
          candidateName={siteName}
          settings={settings}
        />
      );
    case "goals":
      return <GoalsPreview block={block} pledges={pledges} />;
    case "gallery":
      return <GalleryPreview block={block} gallery={gallery} />;
    case "schedule":
      return <SchedulePreview block={block} schedules={schedules} />;
    case "news":
      return <NewsPreview block={block} news={news} />;
    case "videos":
      return <VideosPreview block={block} videos={videos} />;
    case "contacts":
      return <ContactsPreview block={block} contacts={contacts} />;
    case "links":
      return <LinksPreview block={block} />;
    default:
      return (
        <div className="py-12 text-center text-gray-400">
          알 수 없는 블록: {block.type}
        </div>
      );
  }
}

/* ─── Empty State Helper ─── */
function EmptySection({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 text-center">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 px-6">
        <span className="text-3xl">{icon}</span>
        <p className="mt-3 text-sm font-medium text-gray-400">
          {label} 데이터가 없습니다
        </p>
        <p className="mt-1 text-xs text-gray-300">
          편집 버튼을 클릭하여 추가하세요
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HERO Preview
   ═══════════════════════════════════════════════ */
function HeroPreview({
  block,
  settings,
  candidateName,
}: {
  block: Block;
  settings: SiteSettings;
  candidateName: string;
}) {
  const dDay = calcDDay(settings.electionDate);
  const heroContent = block.content as {
    button1Text?: string;
    button1Link?: string;
    button2Text?: string;
    button2Link?: string;
  } | null;
  const button1Text = heroContent?.button1Text || "공약 보기";
  const button2Text = heroContent?.button2Text || "후보 소개";

  const badges = (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {settings.partyName && (
        <span
          className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold tracking-wide shadow-sm"
          style={{ color: "var(--primary)" }}
        >
          {settings.partyName}
        </span>
      )}
      {dDay !== null && settings.electionDate && (
        <span
          className="rounded-full px-4 py-1.5 text-xs font-bold text-white tracking-wide shadow-sm"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {settings.electionName ? `${settings.electionName} ` : ""}
          {formatDDay(dDay)}
        </span>
      )}
    </div>
  );

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
        <span
          className="rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg cursor-default"
          style={{
            backgroundColor: "var(--primary)",
            filter: "brightness(0.85)",
          }}
        >
          {button1Text}
        </span>
        <span className="rounded-full border-2 border-white/50 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur-sm cursor-default">
          {button2Text}
        </span>
      </div>
    </div>
  );

  return (
    <section className="w-full">
      {settings.heroImageUrl ? (
        <>
          <div
            className="w-full px-4 py-4"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {badges}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.heroImageUrl}
            alt={candidateName}
            className="w-full"
          />
          <div
            style={{
              background: `linear-gradient(180deg, var(--primary) 0%, #1a1a2e 100%)`,
            }}
          >
            {sloganArea}
          </div>
        </>
      ) : (
        <div
          className="w-full"
          style={{
            background: `linear-gradient(180deg, var(--primary) 0%, #1a1a2e 100%)`,
          }}
        >
          <div className="px-4 pt-10 pb-4">{badges}</div>
          {sloganArea}
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════
   INTRO / Keywords Preview
   ═══════════════════════════════════════════════ */
function IntroPreview({
  block,
  settings,
  profiles,
  candidateName,
}: {
  block: Block;
  settings: SiteSettings;
  profiles: ProfileItem[];
  candidateName: string;
}) {
  if (!settings.introText && profiles.length === 0) {
    return <EmptySection label="소개" icon="📝" />;
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">
          {block.title || BLOCK_TYPES.intro.defaultTitle}
        </h2>
      </div>
      {settings.introText && (
        <div className="mx-auto mb-12 max-w-2xl text-center text-gray-600 leading-relaxed text-base sm:text-lg">
          {settings.introText.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-3" : ""}>
              {line}
            </p>
          ))}
        </div>
      )}
      {settings.profileImageUrl && (
        <div className="mx-auto mb-12 flex flex-col items-center">
          <div className="relative h-40 w-40 sm:h-48 sm:w-48 overflow-hidden rounded-full shadow-lg border-4 border-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.profileImageUrl}
              alt={candidateName}
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-xl font-bold text-gray-900">{candidateName}</p>
            {settings.partyName && (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--primary)" }}
              >
                {settings.partyName}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════
   CAREER Preview
   ═══════════════════════════════════════════════ */
function CareerPreview({
  block,
  profiles,
  candidateName,
  settings,
}: {
  block: Block;
  profiles: ProfileItem[];
  candidateName: string;
  settings: SiteSettings;
}) {
  const education = profiles
    .filter((p) => p.type === "education")
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const career = profiles
    .filter((p) => p.type === "career")
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (education.length === 0 && career.length === 0) {
    return <EmptySection label="이력" icon="📋" />;
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">
          {block.title || BLOCK_TYPES.career.defaultTitle}
        </h2>
      </div>
      <div className="grid gap-10 sm:grid-cols-2">
        {education.length > 0 && (
          <div className="rounded-2xl bg-gray-50 p-6">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
              <svg
                className="h-5 w-5"
                style={{ color: "var(--primary)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
                />
              </svg>
              학력
            </h3>
            <ul className="relative">
              {education.map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))}
            </ul>
          </div>
        )}
        {career.length > 0 && (
          <div className="rounded-2xl bg-gray-50 p-6">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
              <svg
                className="h-5 w-5"
                style={{ color: "var(--primary)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              주요 경력
            </h3>
            <ul className="relative">
              {career.map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function TimelineItem({ item }: { item: ProfileItem }) {
  return (
    <li className="relative pl-7 pb-5 last:pb-0">
      <span className="absolute left-[5px] top-0 h-full w-0.5 bg-gray-200" />
      <span
        className="absolute left-0 top-1 h-3 w-3 rounded-full border-2 z-10"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: item.isCurrent ? "var(--primary)" : "white",
        }}
      />
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-gray-800 sm:text-base leading-snug">
          {item.title}
        </p>
        {item.isCurrent && (
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            현재
          </span>
        )}
      </div>
    </li>
  );
}

/* ═══════════════════════════════════════════════
   GOALS Preview
   ═══════════════════════════════════════════════ */
function GoalsPreview({ block, pledges }: { block: Block; pledges: PledgeItem[] }) {
  if (pledges.length === 0) {
    return <EmptySection label="핵심 목표" icon="🎯" />;
  }

  const sorted = [...pledges].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">
            {block.title || BLOCK_TYPES.goals.defaultTitle}
          </h2>
        </div>
        <p className="mb-10 text-center text-sm text-gray-500">
          지역 발전과 주민 행복을 위한 핵심 공약입니다
        </p>
        <div className="space-y-4">
          {sorted.map((pledge, idx) => {
            const number = String(idx + 1).padStart(2, "0");
            return (
              <div
                key={pledge.id || idx}
                className="rounded-2xl bg-white p-6 shadow-sm border-l-4"
                style={{ borderLeftColor: "var(--primary)" }}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex-shrink-0 text-3xl font-extrabold leading-none"
                    style={{ color: "var(--primary)" }}
                  >
                    {number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-gray-900 leading-snug">
                      {pledge.title}
                    </h3>
                    {pledge.description && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {pledge.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   GALLERY Preview
   ═══════════════════════════════════════════════ */
function GalleryPreview({ block, gallery }: { block: Block; gallery: GalleryItem[] }) {
  if (gallery.length === 0) {
    return <EmptySection label="사진첩" icon="📸" />;
  }

  const sorted = [...gallery].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">
          {block.title || BLOCK_TYPES.gallery.defaultTitle}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((img) => (
          <div
            key={img.id}
            className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.altText ?? ""}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   SCHEDULE Preview
   ═══════════════════════════════════════════════ */
function SchedulePreview({ block, schedules }: { block: Block; schedules: ScheduleItem[] }) {
  if (schedules.length === 0) {
    return <EmptySection label="일정" icon="📅" />;
  }

  const sorted = [...schedules].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">{block.title || BLOCK_TYPES.schedule.defaultTitle}</h2>
      </div>
      <div className="space-y-3">
        {sorted.map((item) => {
          const past = isPast(item.date);
          const d = new Date(item.date);
          return (
            <div
              key={item.id}
              className={`flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${
                past ? "opacity-50" : ""
              }`}
            >
              <div
                className="flex flex-shrink-0 flex-col items-center rounded-xl px-3 py-2 min-w-[52px] text-white"
                style={{
                  backgroundColor: past ? "#9ca3af" : "var(--primary)",
                }}
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
                  {item.location && <span>{item.location}</span>}
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

/* ═══════════════════════════════════════════════
   NEWS Preview
   ═══════════════════════════════════════════════ */
function NewsPreview({ block, news }: { block: Block; news: NewsItem[] }) {
  if (news.length === 0) {
    return <EmptySection label="관련기사" icon="📰" />;
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">
          {block.title || BLOCK_TYPES.news.defaultTitle}
        </h2>
      </div>
      <div className="space-y-3">
        {news.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5"
          >
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 font-bold text-gray-900">
                {item.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                {item.source && (
                  <span className="font-medium text-gray-500">
                    {item.source}
                  </span>
                )}
                {item.publishedDate && (
                  <span>{formatNewsDate(item.publishedDate)}</span>
                )}
              </div>
            </div>
            {item.url && (
              <svg
                className="h-5 w-5 flex-shrink-0 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   VIDEOS Preview
   ═══════════════════════════════════════════════ */
function VideosPreview({ block, videos }: { block: Block; videos: VideoItem[] }) {
  if (videos.length === 0) {
    return <EmptySection label="영상" icon="🎬" />;
  }

  const sorted = [...videos].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">
            {block.title || BLOCK_TYPES.videos.defaultTitle}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map((video) => (
            <div
              key={video.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <div className="relative aspect-video overflow-hidden bg-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                  alt={video.title ?? ""}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    <svg
                      className="h-6 w-6 ml-0.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
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

/* ═══════════════════════════════════════════════
   CONTACTS Preview
   ═══════════════════════════════════════════════ */
function ContactsPreview({ block, contacts }: { block: Block; contacts: ContactItem[] }) {
  if (contacts.length === 0) {
    return <EmptySection label="연락처" icon="📞" />;
  }

  const sorted = [...contacts].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
  );

  const typeLabels: Record<string, string> = {
    phone: "전화",
    email: "이메일",
    instagram: "인스타그램",
    facebook: "페이스북",
    youtube: "유튜브",
    blog: "블로그",
    threads: "Threads",
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">
          {block.title || BLOCK_TYPES.contacts.defaultTitle}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white text-lg"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {contact.type === "phone"
                ? "📞"
                : contact.type === "email"
                  ? "✉️"
                  : "🔗"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {contact.label ??
                  typeLabels[contact.type] ??
                  contact.type}
              </p>
              <p className="truncate font-bold text-gray-900 mt-0.5">
                {contact.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   LINKS Preview
   ═══════════════════════════════════════════════ */
function LinksPreview({ block }: { block: Block }) {
  const content = block.content as { links?: LinkItem[] } | null;
  const links = content?.links || [];

  if (links.length === 0) {
    return <EmptySection label="링크" icon="🔗" />;
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl text-gray-900">{block.title || BLOCK_TYPES.links.defaultTitle}</h2>
      </div>
      <div className="space-y-3">
        {links.map((link, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900">{link.title}</h3>
              {link.description && (
                <p className="mt-1 text-sm text-gray-500">{link.description}</p>
              )}
              {link.url && (
                <p className="mt-1 text-xs text-blue-500 truncate">
                  {link.url}
                </p>
              )}
            </div>
            <svg
              className="h-5 w-5 flex-shrink-0 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   Add Block Button
   ═══════════════════════════════════════════════ */
function AddBlockButton({
  index,
  showAddMenu,
  setShowAddMenu,
  onAdd,
  existingTypes,
}: {
  index: number;
  showAddMenu: number | null;
  setShowAddMenu: (v: number | null) => void;
  onAdd: (type: string, insertIndex: number) => void;
  existingTypes: string[];
}) {
  const isOpen = showAddMenu === index;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAddMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, setShowAddMenu]);

  return (
    <div className="relative flex items-center justify-center py-1" ref={menuRef}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-gray-100" />
      <button
        onClick={() => setShowAddMenu(isOpen ? null : index)}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
          isOpen
            ? "bg-blue-600 text-white shadow-lg"
            : "bg-white text-gray-400 hover:text-gray-600 border border-gray-200 shadow-sm hover:shadow"
        }`}
      >
        <span className="text-sm leading-none">{isOpen ? "×" : "+"}</span>
        블록 추가
      </button>

      {isOpen && (
        <div className="absolute top-full z-[60] mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          <p className="mb-2 px-2 text-xs font-medium text-gray-400">
            블록 유형 선택
          </p>
          <div className="grid grid-cols-2 gap-1">
            {BLOCK_TYPE_KEYS.map((type) => {
              const info = BLOCK_TYPES[type];
              const alreadyExists =
                (type === "hero" || type === "intro") &&
                existingTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => onAdd(type, index)}
                  disabled={alreadyExists}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    alreadyExists
                      ? "cursor-not-allowed text-gray-300"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  title={
                    alreadyExists
                      ? "이미 존재하는 블록입니다"
                      : `${info.label} 블록 추가`
                  }
                >
                  <span className="text-base">{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Block Title Editor — common title field for all blocks
   ═══════════════════════════════════════════════ */
function BlockTitleEditor({
  block,
  onTitleSaved,
}: {
  block: Block;
  onTitleSaved: (updated: Block) => void;
}) {
  const defaultTitle = BLOCK_TYPES[block.type]?.defaultTitle || "";
  const [title, setTitle] = useState(block.title || "");
  const [saved, setSaved] = useState(false);

  async function saveTitle() {
    const res = await apiFetch<Block>(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ title: title || null }),
    });
    if (res.success && res.data) {
      onTitleSaved(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  if (block.type === "hero") return null;

  return (
    <div className="mb-4 pb-4 border-b border-white/10">
      <label className={labelClass}>섹션 제목</label>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={defaultTitle || "섹션 제목"}
        />
        <button onClick={saveTitle} className={btnSecondary}>
          {saved ? "저장됨" : "적용"}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        비워두면 기본값 &ldquo;{defaultTitle}&rdquo;이 사용됩니다
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Section Editor — dispatches to type-specific editors
   ═══════════════════════════════════════════════ */
function SectionEditor({
  block,
  settings,
  setSettings,
  profiles,
  pledges,
  gallery,
  schedules,
  news,
  videos,
  contacts,
  onSaving,
  onSaved,
  onCancel,
}: {
  block: Block;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  profiles: ProfileItem[];
  pledges: PledgeItem[];
  gallery: GalleryItem[];
  schedules: ScheduleItem[];
  news: NewsItem[];
  videos: VideoItem[];
  contacts: ContactItem[];
  onSaving: () => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  switch (block.type) {
    case "hero":
      return (
        <HeroEditor
          block={block}
          settings={settings}
          setSettings={setSettings}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "intro":
      return (
        <IntroEditor
          block={block}
          settings={settings}
          setSettings={setSettings}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "career":
      return (
        <CareerEditor
          block={block}
          items={profiles}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "goals":
      return (
        <GoalsEditor
          block={block}
          items={pledges}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "gallery":
      return (
        <GalleryEditor
          block={block}
          items={gallery}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "schedule":
      return (
        <ScheduleEditor
          block={block}
          items={schedules}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "news":
      return (
        <NewsEditor
          block={block}
          items={news}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "videos":
      return (
        <VideosEditor
          block={block}
          items={videos}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "contacts":
      return (
        <ContactsEditor
          block={block}
          items={contacts}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    case "links":
      return (
        <LinksEditor
          block={block}
          onSaving={onSaving}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      );
    default:
      return (
        <p className="text-sm text-zinc-500">알 수 없는 블록 유형입니다.</p>
      );
  }
}

/* ═══════════════════════════════════════════════
   Site Info Panel — OG 태그, 선거일 설정
   ═══════════════════════════════════════════════ */
function SiteInfoPanel({
  settings,
  setSettings,
  onClose,
}: {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    ogTitle: settings.ogTitle || "",
    ogDescription: settings.ogDescription || "",
    ogImageUrl: settings.ogImageUrl || "",
    electionDate: settings.electionDate ? String(settings.electionDate).slice(0, 10) : "",
    electionName: settings.electionName || "",
  });
  const [ogUploading, setOgUploading] = useState(false);
  const [ogPreviewUrl, setOgPreviewUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const ogFileRef = useRef<HTMLInputElement>(null);

  async function save() {
    const res = await apiFetch("/api/site/settings", {
      method: "PUT",
      body: JSON.stringify(form),
    });
    if (res.success) {
      setSettings((prev) => ({ ...prev, ...form }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="fixed top-12 left-0 right-0 z-[90] bg-zinc-900 border-b border-white/10 shadow-2xl animate-in">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            &#9881; 사이트 정보 &amp; 공유 설정
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={save} className={btnPrimary}>
              {saved ? "저장됨 ✓" : "저장"}
            </button>
            <button onClick={onClose} className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 공유 썸네일 */}
          <div className="rounded-lg border border-white/10 bg-zinc-800/50 p-3 space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">공유 썸네일 (SNS 미리보기)</p>
            <input
              ref={ogFileRef}
              type="file"
              accept="image/*"
              className="absolute w-0 h-0 opacity-0 overflow-hidden"
              disabled={ogUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const previewUrl = URL.createObjectURL(file);
                setOgPreviewUrl(previewUrl);
                setOgUploading(true);
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch("/api/upload/og", { method: "POST", body: fd });
                const json = await res.json();
                setOgUploading(false);
                if (json.success) {
                  setForm((prev) => ({ ...prev, ogImageUrl: json.data.url }));
                }
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className={`${btnSecondary} w-full`}
              disabled={ogUploading}
              onClick={() => ogFileRef.current?.click()}
            >
              {ogUploading ? "업로드 중..." : "📷 이미지 선택"}
            </button>
            {(ogPreviewUrl || form.ogImageUrl) && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ogPreviewUrl || form.ogImageUrl} alt="OG preview" className="h-28 w-full object-cover rounded-lg" />
                <button
                  className="absolute top-1 right-1 rounded-full bg-red-500/80 p-0.5 text-white"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, ogImageUrl: "" }));
                    setOgPreviewUrl(null);
                  }}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <p className="text-[10px] text-zinc-600">카카오톡, 페이스북 등에 공유 시 표시되는 이미지</p>
          </div>

          {/* OG 제목/설명 */}
          <div className="rounded-lg border border-white/10 bg-zinc-800/50 p-3 space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">공유 제목 / 설명</p>
            <div>
              <label className={labelClass}>제목</label>
              <input
                className={inputClass}
                value={form.ogTitle}
                onChange={(e) => setForm({ ...form, ogTitle: e.target.value })}
                placeholder="예: 홍길동 후보 홈페이지"
              />
            </div>
            <div>
              <label className={labelClass}>설명</label>
              <textarea
                className={`${inputClass} min-h-[60px] resize-y`}
                value={form.ogDescription}
                onChange={(e) => setForm({ ...form, ogDescription: e.target.value })}
                placeholder="예: 우리 지역을 바꾸겠습니다"
              />
            </div>
          </div>

          {/* 선거 정보 */}
          <div className="rounded-lg border border-white/10 bg-zinc-800/50 p-3 space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">선거 정보</p>
            <div>
              <label className={labelClass}>선거명</label>
              <input
                className={inputClass}
                value={form.electionName}
                onChange={(e) => setForm({ ...form, electionName: e.target.value })}
                placeholder="예: 제22대 국회의원 선거"
              />
            </div>
            <div>
              <label className={labelClass}>선거일</label>
              <input
                type="date"
                className={inputClass}
                value={form.electionDate}
                onChange={(e) => setForm({ ...form, electionDate: e.target.value })}
              />
            </div>
            {form.electionDate && (
              <p className="text-xs text-zinc-400">
                {(() => {
                  const d = calcDDay(form.electionDate);
                  return d !== null ? `선거까지 ${formatDDay(d)}` : "";
                })()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Editor Props
   ═══════════════════════════════════════════════ */
interface EditorBaseProps {
  block: Block;
  onSaving: () => void;
  onSaved: () => void;
  onCancel: () => void;
}

/* ── Editor Action Buttons ── */
function EditorActions({
  onSave,
  onCancel,
  saving,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
      <button onClick={onCancel} className={btnSecondary}>
        취소
      </button>
      <button onClick={onSave} className={btnPrimary} disabled={saving}>
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Hero Editor
   ═══════════════════════════════════════════════ */
function HeroEditor({
  block,
  settings: initialSettings,
  setSettings,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { settings: SiteSettings; setSettings: React.Dispatch<React.SetStateAction<SiteSettings>> }) {
  const heroContent = block.content as {
    button1Text?: string;
    button1Link?: string;
    button2Text?: string;
    button2Link?: string;
  } | null;

  const [form, setForm] = useState({
    heroImageUrl: initialSettings.heroImageUrl || "",
    heroSlogan: initialSettings.heroSlogan || "",
    heroSubSlogan: initialSettings.heroSubSlogan || "",
    partyName: initialSettings.partyName || "",
    positionTitle: initialSettings.positionTitle || "",
    primaryColor: initialSettings.primaryColor || "#C9151E",
    accentColor: initialSettings.accentColor || "#1A56DB",
  });

  const [heroUploading, setHeroUploading] = useState(false);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  // Update both local form and parent settings for live preview
  const updateField = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    setSettings((prev: SiteSettings) => ({ ...prev, [field]: value }));
  };

  const [buttonForm, setButtonForm] = useState({
    button1Text: heroContent?.button1Text || "공약 보기",
    button1Link: heroContent?.button1Link || "#pledges",
    button2Text: heroContent?.button2Text || "후보 소개",
    button2Link: heroContent?.button2Link || "#about",
  });

  // Update CSS custom properties in real-time when colors change
  function handleColorChange(field: "primaryColor" | "accentColor", value: string) {
    updateField(field, value);
  }

  async function save() {
    onSaving();
    await apiFetch("/api/site/settings", {
      method: "PUT",
      body: JSON.stringify({
        heroImageUrl: form.heroImageUrl,
        heroSlogan: form.heroSlogan,
        heroSubSlogan: form.heroSubSlogan,
        partyName: form.partyName,
        positionTitle: form.positionTitle,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
      }),
    });
    await apiFetch(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({
        content: {
          heroImageUrl: form.heroImageUrl,
          heroSlogan: form.heroSlogan,
          heroSubSlogan: form.heroSubSlogan,
          button1Text: buttonForm.button1Text,
          button1Link: buttonForm.button1Link,
          button2Text: buttonForm.button2Text,
          button2Link: buttonForm.button2Link,
        },
      }),
    });
    onSaved();
  }

  return (
    <div className="space-y-3">
      {/* Color customization */}
      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">색상 설정</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>메인 색상</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
              />
              <input
                className={`${inputClass} flex-1`}
                value={form.primaryColor}
                onChange={(e) => handleColorChange("primaryColor", e.target.value)}
                placeholder="#C9151E"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>강조 색상</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => handleColorChange("accentColor", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
              />
              <input
                className={`${inputClass} flex-1`}
                value={form.accentColor}
                onChange={(e) => handleColorChange("accentColor", e.target.value)}
                placeholder="#1A56DB"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>히어로 이미지</label>
        <div className="flex gap-2 items-center">
          <input
            ref={heroFileRef}
            type="file"
            accept="image/*"
            className="absolute w-0 h-0 opacity-0 overflow-hidden"
            disabled={heroUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const previewUrl = URL.createObjectURL(file);
              setHeroPreviewUrl(previewUrl);
              setHeroUploading(true);
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/upload/hero", { method: "POST", body: fd });
              const json = await res.json();
              setHeroUploading(false);
              if (json.success) {
                updateField("heroImageUrl", json.data.url);
                // objectURL 유지 — 서버 URL 접근 불가 시에도 미리보기 유지
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={`${btnSecondary} inline-flex items-center gap-1`}
            disabled={heroUploading}
            onClick={() => heroFileRef.current?.click()}
          >
            {heroUploading ? "업로드 중..." : "📷 이미지 선택"}
          </button>
          {form.heroImageUrl && (
            <button
              className="text-xs text-red-400 hover:text-red-300"
              onClick={() => updateField("heroImageUrl", "")}
            >
              삭제
            </button>
          )}
        </div>
        {(heroPreviewUrl || form.heroImageUrl) && (
          <div className="mt-2 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroPreviewUrl || form.heroImageUrl} alt="preview" className="h-24 w-full object-cover rounded-lg" />
          </div>
        )}
      </div>
      <div>
        <label className={labelClass}>슬로건 (제목)</label>
        <input
          className={inputClass}
          value={form.heroSlogan}
          onChange={(e) => updateField("heroSlogan", e.target.value)}
          placeholder="메인 슬로건"
        />
      </div>
      <div>
        <label className={labelClass}>서브 슬로건</label>
        <input
          className={inputClass}
          value={form.heroSubSlogan}
          onChange={(e) => updateField("heroSubSlogan", e.target.value)}
          placeholder="서브 슬로건"
        />
      </div>
      <div>
        <label className={labelClass}>당명</label>
        <input
          className={inputClass}
          value={form.partyName}
          onChange={(e) => updateField("partyName", e.target.value)}
          placeholder="정당명"
        />
      </div>
      <div>
        <label className={labelClass}>직함</label>
        <input
          className={inputClass}
          value={form.positionTitle}
          onChange={(e) => updateField("positionTitle", e.target.value)}
          placeholder="예: 제00대 국회의원 후보"
        />
      </div>

      {/* Button customization */}
      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">버튼 설정</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>버튼1 텍스트</label>
            <input
              className={inputClass}
              value={buttonForm.button1Text}
              onChange={(e) => setButtonForm({ ...buttonForm, button1Text: e.target.value })}
              placeholder="공약 보기"
            />
          </div>
          <div>
            <label className={labelClass}>버튼1 링크</label>
            <input
              className={inputClass}
              value={buttonForm.button1Link}
              onChange={(e) => setButtonForm({ ...buttonForm, button1Link: e.target.value })}
              placeholder="#pledges"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>버튼2 텍스트</label>
            <input
              className={inputClass}
              value={buttonForm.button2Text}
              onChange={(e) => setButtonForm({ ...buttonForm, button2Text: e.target.value })}
              placeholder="후보 소개"
            />
          </div>
          <div>
            <label className={labelClass}>버튼2 링크</label>
            <input
              className={inputClass}
              value={buttonForm.button2Link}
              onChange={(e) => setButtonForm({ ...buttonForm, button2Link: e.target.value })}
              placeholder="#about"
            />
          </div>
        </div>
      </div>

      <EditorActions onSave={save} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Intro Editor
   ═══════════════════════════════════════════════ */
function IntroEditor({
  block,
  settings: initialSettings,
  setSettings,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { settings: SiteSettings; setSettings: React.Dispatch<React.SetStateAction<SiteSettings>> }) {
  const [form, setForm] = useState({
    subtitle: initialSettings.subtitle || "",
    introText: initialSettings.introText || "",
    profileImageUrl: initialSettings.profileImageUrl || "",
  });
  const [profileUploading, setProfileUploading] = useState(false);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);

  // Update both local form and parent settings for live preview
  const updateField = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    setSettings((prev: SiteSettings) => ({ ...prev, [field]: value }));
  };

  async function save() {
    onSaving();
    await apiFetch("/api/site/settings", {
      method: "PUT",
      body: JSON.stringify(form),
    });
    await apiFetch(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({
        content: { subtitle: form.subtitle, introText: form.introText },
      }),
    });
    onSaved();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>프로필 이미지</label>
        <div className="flex gap-2 items-center">
          <input
            ref={profileFileRef}
            type="file"
            accept="image/*"
            className="absolute w-0 h-0 opacity-0 overflow-hidden"
            disabled={profileUploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const previewUrl = URL.createObjectURL(file);
              setProfilePreviewUrl(previewUrl);
              setProfileUploading(true);
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/upload/image", { method: "POST", body: fd });
              const json = await res.json();
              setProfileUploading(false);
              if (json.success) {
                updateField("profileImageUrl", json.data.url);
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={`${btnSecondary} inline-flex items-center gap-1`}
            disabled={profileUploading}
            onClick={() => profileFileRef.current?.click()}
          >
            {profileUploading ? "업로드 중..." : "📷 이미지 선택"}
          </button>
          {form.profileImageUrl && (
            <button className="text-xs text-red-400 hover:text-red-300" onClick={() => updateField("profileImageUrl", "")}>삭제</button>
          )}
        </div>
        {(profilePreviewUrl || form.profileImageUrl) && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profilePreviewUrl || form.profileImageUrl} alt="preview" className="h-16 w-16 object-cover rounded-full" />
          </div>
        )}
      </div>
      <div>
        <label className={labelClass}>제목 (부제)</label>
        <input
          className={inputClass}
          value={form.subtitle}
          onChange={(e) => updateField("subtitle", e.target.value)}
          placeholder="소개 섹션 제목"
        />
      </div>
      <div>
        <label className={labelClass}>소개 내용</label>
        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          value={form.introText}
          onChange={(e) => updateField("introText", e.target.value)}
          placeholder="소개 내용을 입력해주세요"
        />
      </div>
      <EditorActions onSave={save} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Career Editor
   ═══════════════════════════════════════════════ */
function CareerEditor({
  block,
  items: initialItems,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { items: ProfileItem[] }) {
  const [items, setItems] = useState<ProfileItem[]>(initialItems);
  const [newItem, setNewItem] = useState<ProfileItem>({
    type: "career",
    title: "",
    isCurrent: false,
  });

  async function addItem() {
    if (!newItem.title.trim()) return;
    onSaving();
    const res = await apiFetch<ProfileItem>("/api/site/profiles", {
      method: "POST",
      body: JSON.stringify(newItem),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewItem({ type: "career", title: "", isCurrent: false });
    }
    onSaved();
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/profiles/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved();
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-800/50 px-3 py-2"
            >
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  item.type === "education"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-green-500/20 text-green-400"
                }`}
              >
                {item.type === "education" ? "학력" : "경력"}
              </span>
              <span className="flex-1 text-sm text-zinc-200 truncate">
                {item.title}
              </span>
              {item.isCurrent && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                  현재
                </span>
              )}
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-500">새 항목 추가</p>
        <div className="flex gap-2">
          <select
            className={`${inputClass} w-24`}
            value={newItem.type}
            onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
          >
            <option value="career">경력</option>
            <option value="education">학력</option>
          </select>
          <input
            className={`${inputClass} flex-1`}
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="내용 입력"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={newItem.isCurrent}
              onChange={(e) =>
                setNewItem({ ...newItem, isCurrent: e.target.checked })
              }
              className="rounded"
            />
            현재 진행 중
          </label>
          <button onClick={addItem} className={btnPrimary}>
            추가
          </button>
        </div>
      </div>

      <EditorActions onSave={onCancel} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Goals Editor
   ═══════════════════════════════════════════════ */
function GoalsEditor({
  block,
  items: initialItems,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { items: PledgeItem[] }) {
  const [items, setItems] = useState<PledgeItem[]>(initialItems);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  async function addItem() {
    if (!newTitle.trim()) return;
    onSaving();
    const res = await apiFetch<PledgeItem>("/api/site/pledges", {
      method: "POST",
      body: JSON.stringify({
        title: newTitle,
        description: newDesc || null,
        icon: "🎯",
        details: [],
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewTitle("");
      setNewDesc("");
    }
    onSaved();
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/pledges/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved();
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-800/50 px-3 py-2"
            >
              <span className="text-zinc-500 text-xs font-bold">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-zinc-200 truncate block">
                  {item.title}
                </span>
                {item.description && (
                  <span className="text-xs text-zinc-500 truncate block">
                    {item.description}
                  </span>
                )}
              </div>
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-500">새 공약 추가</p>
        <input
          className={inputClass}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="공약 제목"
        />
        <input
          className={inputClass}
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="공약 설명 (선택)"
        />
        <div className="flex justify-end">
          <button onClick={addItem} className={btnPrimary}>
            추가
          </button>
        </div>
      </div>

      <EditorActions onSave={onCancel} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Gallery Editor
   ═══════════════════════════════════════════════ */
function GalleryEditor({
  block,
  items: initialItems,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { items: GalleryItem[] }) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [newUrl, setNewUrl] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [newCat, setNewCat] = useState("campaign");
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryPreviewUrl, setGalleryPreviewUrl] = useState<string | null>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  async function addItem() {
    if (!newUrl.trim()) return;
    onSaving();
    const res = await apiFetch<GalleryItem>("/api/site/gallery", {
      method: "POST",
      body: JSON.stringify({
        url: newUrl,
        altText: newAlt || null,
        category: newCat,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewUrl("");
      setNewAlt("");
    }
    onSaved();
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/gallery/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved();
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.altText || ""}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="absolute top-1 right-1 rounded-full bg-red-500/80 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-500">새 사진 추가</p>
        <input
          ref={galleryFileRef}
          type="file"
          accept="image/*"
          className="absolute w-0 h-0 opacity-0 overflow-hidden"
          disabled={galleryUploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const previewUrl = URL.createObjectURL(file);
            setGalleryPreviewUrl(previewUrl);
            setGalleryUploading(true);
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload/image", { method: "POST", body: fd });
            const json = await res.json();
            setGalleryUploading(false);
            if (json.success) {
              setNewUrl(json.data.url);
            }
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className={`${btnSecondary} inline-flex items-center gap-1 w-full justify-center`}
          disabled={galleryUploading}
          onClick={() => galleryFileRef.current?.click()}
        >
          {galleryUploading ? "업로드 중..." : "📷 이미지 선택"}
        </button>
        {(galleryPreviewUrl || newUrl) && (
          <div className="mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={galleryPreviewUrl || newUrl} alt="preview" className="h-16 w-full object-cover rounded" />
          </div>
        )}
        <div className="flex gap-2">
          <input
            className={`${inputClass} flex-1`}
            value={newAlt}
            onChange={(e) => setNewAlt(e.target.value)}
            placeholder="설명 (선택)"
          />
          <select
            className={`${inputClass} w-28`}
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          >
            <option value="campaign">선거운동</option>
            <option value="activity">의정활동</option>
            <option value="local">지역활동</option>
            <option value="event">행사</option>
            <option value="media">언론보도</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button onClick={addItem} className={btnPrimary}>
            추가
          </button>
        </div>
      </div>

      <EditorActions onSave={onCancel} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Schedule Editor
   ═══════════════════════════════════════════════ */
function ScheduleEditor({
  block,
  items: initialItems,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { items: ScheduleItem[] }) {
  const [items, setItems] = useState<ScheduleItem[]>(initialItems);
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
  });

  async function addItem() {
    if (!form.title.trim() || !form.date) return;
    onSaving();
    const res = await apiFetch<ScheduleItem>("/api/site/schedules", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        date: form.date,
        time: form.time || null,
        location: form.location || null,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setForm({ title: "", date: "", time: "", location: "" });
    }
    onSaved();
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/schedules/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved();
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-800/50 px-3 py-2"
            >
              <span className="text-xs text-zinc-500">{item.date}</span>
              <span className="flex-1 text-sm text-zinc-200 truncate">
                {item.title}
              </span>
              {item.location && (
                <span className="text-xs text-zinc-500 truncate max-w-[100px]">
                  {item.location}
                </span>
              )}
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-500">새 일정 추가</p>
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="일정 제목"
        />
        <div className="flex gap-2">
          <input
            type="date"
            className={`${inputClass} flex-1`}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            className={`${inputClass} w-24`}
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            placeholder="시간"
          />
        </div>
        <input
          className={inputClass}
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="장소 (선택)"
        />
        <div className="flex justify-end">
          <button onClick={addItem} className={btnPrimary}>
            추가
          </button>
        </div>
      </div>

      <EditorActions onSave={onCancel} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   News Editor
   ═══════════════════════════════════════════════ */
function NewsEditor({
  block,
  items: initialItems,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { items: NewsItem[] }) {
  const [items, setItems] = useState<NewsItem[]>(initialItems);
  const [form, setForm] = useState({
    title: "",
    source: "",
    url: "",
    publishedDate: "",
  });

  async function addItem() {
    if (!form.title.trim()) return;
    onSaving();
    const res = await apiFetch<NewsItem>("/api/site/news", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        source: form.source || null,
        url: form.url || null,
        publishedDate: form.publishedDate || null,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setForm({ title: "", source: "", url: "", publishedDate: "" });
    }
    onSaved();
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/news/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved();
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-800/50 px-3 py-2"
            >
              <span className="flex-1 text-sm text-zinc-200 truncate">
                {item.title}
              </span>
              {item.source && (
                <span className="text-xs text-zinc-500">{item.source}</span>
              )}
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-500">새 기사 추가</p>
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="기사 제목"
        />
        <div className="flex gap-2">
          <input
            className={`${inputClass} flex-1`}
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="출처"
          />
          <input
            type="date"
            className={`${inputClass} w-40`}
            value={form.publishedDate}
            onChange={(e) =>
              setForm({ ...form, publishedDate: e.target.value })
            }
          />
        </div>
        <input
          className={inputClass}
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="기사 URL"
        />
        <div className="flex justify-end">
          <button onClick={addItem} className={btnPrimary}>
            추가
          </button>
        </div>
      </div>

      <EditorActions onSave={onCancel} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Videos Editor
   ═══════════════════════════════════════════════ */
function VideosEditor({
  block,
  items: initialItems,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { items: VideoItem[] }) {
  const [items, setItems] = useState<VideoItem[]>(initialItems);
  const [newVideoId, setNewVideoId] = useState("");
  const [newTitle, setNewTitle] = useState("");

  function extractVideoId(input: string): string {
    // Handle full YouTube URLs
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = input.match(p);
      if (m) return m[1];
    }
    return input.trim();
  }

  async function addItem() {
    const videoId = extractVideoId(newVideoId);
    if (!videoId) return;
    onSaving();
    const res = await apiFetch<VideoItem>("/api/site/videos", {
      method: "POST",
      body: JSON.stringify({
        videoId,
        title: newTitle || null,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewVideoId("");
      setNewTitle("");
    }
    onSaved();
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/videos/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved();
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`}
                alt={item.title || ""}
                className="aspect-video w-full rounded-lg object-cover"
              />
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="absolute top-1 right-1 rounded-full bg-red-500/80 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {item.title && (
                <p className="mt-1 text-[10px] text-zinc-400 truncate">
                  {item.title}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-500">새 영상 추가</p>
        <input
          className={inputClass}
          value={newVideoId}
          onChange={(e) => setNewVideoId(e.target.value)}
          placeholder="YouTube URL 또는 동영상 ID"
        />
        <input
          className={inputClass}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="영상 제목 (선택)"
        />
        <div className="flex justify-end">
          <button onClick={addItem} className={btnPrimary}>
            추가
          </button>
        </div>
      </div>

      <EditorActions onSave={onCancel} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Contacts Editor
   ═══════════════════════════════════════════════ */
function ContactsEditor({
  block,
  items: initialItems,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps & { items: ContactItem[] }) {
  const [items, setItems] = useState<ContactItem[]>(initialItems);
  const [form, setForm] = useState({
    type: "phone",
    label: "",
    value: "",
    url: "",
  });

  async function addItem() {
    if (!form.value.trim()) return;
    onSaving();
    const res = await apiFetch<ContactItem>("/api/site/contacts", {
      method: "POST",
      body: JSON.stringify({
        type: form.type,
        label: form.label || null,
        value: form.value,
        url: form.url || null,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setForm({ type: "phone", label: "", value: "", url: "" });
    }
    onSaved();
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/contacts/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved();
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-800/50 px-3 py-2"
            >
              <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                {item.type}
              </span>
              <span className="flex-1 text-sm text-zinc-200 truncate">
                {item.value}
              </span>
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-500">새 연락처 추가</p>
        <div className="flex gap-2">
          <select
            className={`${inputClass} w-28`}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="phone">전화</option>
            <option value="email">이메일</option>
            <option value="instagram">인스타그램</option>
            <option value="facebook">페이스북</option>
            <option value="youtube">유튜브</option>
            <option value="blog">블로그</option>
            <option value="threads">Threads</option>
          </select>
          <input
            className={`${inputClass} flex-1`}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="라벨 (선택)"
          />
        </div>
        <input
          className={inputClass}
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          placeholder="값 (전화번호, 이메일 등)"
        />
        <input
          className={inputClass}
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="URL (선택)"
        />
        <div className="flex justify-end">
          <button onClick={addItem} className={btnPrimary}>
            추가
          </button>
        </div>
      </div>

      <EditorActions onSave={onCancel} onCancel={onCancel} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Links Editor
   ═══════════════════════════════════════════════ */
function LinksEditor({
  block,
  onSaving,
  onSaved,
  onCancel,
}: EditorBaseProps) {
  const content = block.content as { links?: LinkItem[] } | null;
  const [links, setLinks] = useState<LinkItem[]>(content?.links || []);
  const [form, setForm] = useState({ title: "", url: "", description: "" });

  function addLink() {
    if (!form.title.trim() || !form.url.trim()) return;
    setLinks((prev) => [...prev, { ...form }]);
    setForm({ title: "", url: "", description: "" });
  }

  function removeLink(idx: number) {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    onSaving();
    await apiFetch(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ content: { links } }),
    });
    onSaved();
  }

  return (
    <div className="space-y-3">
      {links.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {links.map((link, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-800/50 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm text-zinc-200 truncate block">
                  {link.title}
                </span>
                <span className="text-xs text-zinc-500 truncate block">
                  {link.url}
                </span>
              </div>
              <button
                onClick={() => removeLink(idx)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-zinc-800/30 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-500">새 링크 추가</p>
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="링크 제목"
        />
        <input
          className={inputClass}
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="URL"
        />
        <input
          className={inputClass}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="설명 (선택)"
        />
        <div className="flex justify-end">
          <button
            onClick={addLink}
            className={btnSecondary}
          >
            목록에 추가
          </button>
        </div>
      </div>

      <EditorActions onSave={save} onCancel={onCancel} />
    </div>
  );
}
