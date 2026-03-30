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
  heroSlogan?: string;
  heroSubSlogan?: string;
  introText?: string;
  subtitle?: string;
}

/* ─── Constants ─── */
const BLOCK_TYPES: Record<string, { label: string; icon: string }> = {
  hero: { label: "메인 이미지", icon: "🖼" },
  intro: { label: "소개", icon: "📝" },
  career: { label: "이력", icon: "📋" },
  goals: { label: "핵심 목표", icon: "🎯" },
  gallery: { label: "사진첩", icon: "📸" },
  schedule: { label: "일정", icon: "📅" },
  news: { label: "관련기사", icon: "📰" },
  videos: { label: "영상", icon: "🎬" },
  contacts: { label: "연락처", icon: "📞" },
  links: { label: "링크", icon: "🔗" },
};

const BLOCK_TYPE_KEYS = Object.keys(BLOCK_TYPES);

/* ─── Shared styles ─── */
const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 placeholder:text-zinc-600";
const labelClass = "mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider";
const btnPrimary =
  "rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50";
const btnSecondary =
  "rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const btnDanger =
  "rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20";

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

/* ═══════════════════════════════════════════════
   Main Builder Page
   ═══════════════════════════════════════════════ */
export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<number | null>(null); // index to insert after, -1 for top
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [siteName, setSiteName] = useState("");

  // Auth check
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

  // Load blocks
  const loadBlocks = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<Block[]>("/api/site/blocks");
    if (res.success && res.data) {
      setBlocks(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  // Add block
  async function addBlock(type: string, insertIndex: number) {
    const sortOrder = insertIndex >= 0 ? insertIndex + 1 : 0;
    const res = await apiFetch<Block>("/api/site/blocks", {
      method: "POST",
      body: JSON.stringify({ type, sortOrder }),
    });
    if (res.success) {
      await loadBlocks();
      if (res.data) {
        setEditingBlockId(res.data.id);
      }
    }
    setShowAddMenu(null);
  }

  // Delete block
  async function deleteBlock(id: number) {
    if (!confirm("이 블록을 삭제하시겠습니까?")) return;
    await apiFetch(`/api/site/blocks/${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (editingBlockId === id) setEditingBlockId(null);
  }

  // Toggle visibility
  async function toggleVisibility(block: Block) {
    const res = await apiFetch<Block>(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ visible: !block.visible }),
    });
    if (res.success && res.data) {
      setBlocks((prev) => prev.map((b) => (b.id === res.data!.id ? res.data! : b)));
    }
  }

  // Drag and drop
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

    // Save new order
    await apiFetch("/api/site/blocks/reorder", {
      method: "PUT",
      body: JSON.stringify({ ids: newBlocks.map((b) => b.id) }),
    });
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // Update block locally after edit
  function onBlockUpdated(updatedBlock: Block) {
    setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-zinc-500">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${code}/admin`)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
          >
            <span>←</span>
            <span>돌아가기</span>
          </button>
          <div className="h-5 w-px bg-white/10" />
          <h1 className="text-lg font-bold text-zinc-100">
            <span className="text-zinc-500">{siteName}</span> 페이지 빌더
          </h1>
        </div>
        <a
          href={`/${code}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          미리보기 →
        </a>
      </div>

      {/* Add block at top */}
      <AddBlockButton
        index={-1}
        showAddMenu={showAddMenu}
        setShowAddMenu={setShowAddMenu}
        onAdd={addBlock}
        existingTypes={blocks.map((b) => b.type)}
      />

      {/* Block list */}
      {blocks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 py-20 text-center">
          <div className="text-4xl">📦</div>
          <p className="mt-4 text-zinc-400">아직 블록이 없습니다</p>
          <p className="mt-1 text-sm text-zinc-600">위의 + 버튼을 눌러 블록을 추가하세요</p>
        </div>
      )}

      {blocks.map((block, index) => (
        <div key={block.id}>
          <div
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={`group relative mb-2 rounded-2xl border transition-all duration-200 ${
              dragOverIndex === index
                ? "border-emerald-500/50 bg-emerald-500/5"
                : dragIndex === index
                ? "border-white/20 bg-zinc-900/50 opacity-50"
                : "border-white/10 bg-zinc-900"
            } ${!block.visible ? "opacity-60" : ""}`}
          >
            {/* Block header */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Drag handle */}
              <span
                className="cursor-grab text-zinc-600 transition-colors hover:text-zinc-400 active:cursor-grabbing"
                title="드래그하여 순서 변경"
              >
                ☰
              </span>

              {/* Block type icon + name */}
              <span className="text-lg">{BLOCK_TYPES[block.type]?.icon || "📄"}</span>
              <span className="text-sm font-medium text-zinc-200">
                {block.title || BLOCK_TYPES[block.type]?.label || block.type}
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Visibility toggle */}
                <button
                  onClick={() => toggleVisibility(block)}
                  className={`rounded-lg p-1.5 text-sm transition-colors ${
                    block.visible
                      ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      : "text-zinc-600 hover:bg-white/5 hover:text-zinc-400"
                  }`}
                  title={block.visible ? "숨기기" : "보이기"}
                >
                  {block.visible ? "👁" : "👁‍🗨"}
                </button>

                {/* Edit toggle */}
                <button
                  onClick={() =>
                    setEditingBlockId(editingBlockId === block.id ? null : block.id)
                  }
                  className={`rounded-lg p-1.5 text-sm transition-colors ${
                    editingBlockId === block.id
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }`}
                  title="편집"
                >
                  ✏️
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="rounded-lg p-1.5 text-sm text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="삭제"
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Edit form (expanded) */}
            {editingBlockId === block.id && (
              <div className="border-t border-white/5 px-4 py-4">
                <BlockEditor
                  block={block}
                  onSaved={(updated) => {
                    onBlockUpdated(updated);
                    setSaving(false);
                  }}
                  onSaving={() => setSaving(true)}
                />
              </div>
            )}

            {/* Preview (collapsed) */}
            {editingBlockId !== block.id && (
              <BlockPreview block={block} />
            )}
          </div>

          {/* Add block between */}
          <AddBlockButton
            index={index}
            showAddMenu={showAddMenu}
            setShowAddMenu={setShowAddMenu}
            onAdd={addBlock}
            existingTypes={blocks.map((b) => b.type)}
          />
        </div>
      ))}

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 shadow-lg border border-white/10">
          저장 중...
        </div>
      )}
    </div>
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
    <div className="relative flex items-center justify-center py-2" ref={menuRef}>
      <div className="absolute inset-x-4 top-1/2 h-px bg-white/5" />
      <button
        onClick={() => setShowAddMenu(isOpen ? null : index)}
        className={`relative z-10 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
          isOpen
            ? "bg-emerald-500 text-zinc-950"
            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 border border-white/10"
        }`}
      >
        <span className="text-base leading-none">{isOpen ? "×" : "+"}</span>
        블록 추가
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full z-30 mt-2 w-64 rounded-2xl border border-white/10 bg-zinc-900 p-2 shadow-2xl">
          <p className="mb-2 px-2 text-xs font-medium text-zinc-500">블록 유형 선택</p>
          <div className="grid grid-cols-2 gap-1">
            {BLOCK_TYPE_KEYS.map((type) => {
              const info = BLOCK_TYPES[type];
              const alreadyExists =
                (type === "hero" || type === "intro") && existingTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => onAdd(type, index)}
                  disabled={alreadyExists}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    alreadyExists
                      ? "cursor-not-allowed text-zinc-700"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                  title={alreadyExists ? "이미 존재하는 블록입니다" : `${info.label} 블록 추가`}
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
   Block Preview (collapsed state)
   ═══════════════════════════════════════════════ */
function BlockPreview({ block }: { block: Block }) {
  const content = block.content as Record<string, unknown> | null;

  function renderPreview() {
    switch (block.type) {
      case "hero": {
        const heroUrl = (content as { heroImageUrl?: string })?.heroImageUrl;
        return heroUrl ? (
          <div className="flex items-center gap-3 px-4 pb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt="" className="h-12 w-20 rounded-lg object-cover" />
            <span className="text-xs text-zinc-500">이미지 설정됨</span>
          </div>
        ) : (
          <p className="px-4 pb-3 text-xs text-zinc-600">이미지를 설정해주세요</p>
        );
      }
      case "intro": {
        const introText = (content as { introText?: string })?.introText;
        return (
          <p className="line-clamp-2 px-4 pb-3 text-xs text-zinc-500">
            {introText || "소개 내용을 입력해주세요"}
          </p>
        );
      }
      default:
        return (
          <p className="px-4 pb-3 text-xs text-zinc-600">
            편집 버튼을 클릭하여 내용을 수정하세요
          </p>
        );
    }
  }

  return <>{renderPreview()}</>;
}

/* ═══════════════════════════════════════════════
   Block Editor (expanded edit state)
   ═══════════════════════════════════════════════ */
function BlockEditor({
  block,
  onSaved,
  onSaving,
}: {
  block: Block;
  onSaved: (b: Block) => void;
  onSaving: () => void;
}) {
  switch (block.type) {
    case "hero":
      return <HeroEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "intro":
      return <IntroEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "career":
      return <CareerEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "goals":
      return <GoalsEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "gallery":
      return <GalleryEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "schedule":
      return <ScheduleEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "news":
      return <NewsEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "videos":
      return <VideosEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "contacts":
      return <ContactsEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    case "links":
      return <LinksEditor block={block} onSaved={onSaved} onSaving={onSaving} />;
    default:
      return <p className="text-sm text-zinc-500">알 수 없는 블록 유형입니다.</p>;
  }
}

/* ─── Editor Props ─── */
interface EditorProps {
  block: Block;
  onSaved: (b: Block) => void;
  onSaving: () => void;
}

/* ═══════════════════════════════════════════════
   Hero Editor — SiteSettings fields
   ═══════════════════════════════════════════════ */
function HeroEditor({ block, onSaved, onSaving }: EditorProps) {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch<SiteSettings>("/api/site/settings").then((res) => {
      if (res.success && res.data) {
        setSettings(res.data);
      }
      setLoaded(true);
    });
  }, []);

  async function save() {
    onSaving();
    await apiFetch("/api/site/settings", {
      method: "PUT",
      body: JSON.stringify({
        heroImageUrl: settings.heroImageUrl || "",
        heroSlogan: settings.heroSlogan || "",
        heroSubSlogan: settings.heroSubSlogan || "",
      }),
    });
    // Also update block content for preview
    const res = await apiFetch<Block>(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({
        content: {
          heroImageUrl: settings.heroImageUrl,
          heroSlogan: settings.heroSlogan,
          heroSubSlogan: settings.heroSubSlogan,
        },
      }),
    });
    if (res.success && res.data) onSaved(res.data);
    else onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>히어로 이미지 URL</label>
        <input
          className={inputClass}
          value={settings.heroImageUrl || ""}
          onChange={(e) => setSettings({ ...settings, heroImageUrl: e.target.value })}
          placeholder="https://example.com/hero.jpg"
        />
        {settings.heroImageUrl && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.heroImageUrl}
              alt="hero preview"
              className="h-32 w-full rounded-xl object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          </div>
        )}
      </div>
      <div>
        <label className={labelClass}>슬로건 (제목)</label>
        <input
          className={inputClass}
          value={settings.heroSlogan || ""}
          onChange={(e) => setSettings({ ...settings, heroSlogan: e.target.value })}
          placeholder="메인 슬로건"
        />
      </div>
      <div>
        <label className={labelClass}>서브 슬로건</label>
        <input
          className={inputClass}
          value={settings.heroSubSlogan || ""}
          onChange={(e) => setSettings({ ...settings, heroSubSlogan: e.target.value })}
          placeholder="서브 슬로건"
        />
      </div>
      <div className="flex justify-end">
        <button onClick={save} className={btnPrimary}>
          저장
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Intro Editor — SiteSettings fields
   ═══════════════════════════════════════════════ */
function IntroEditor({ block, onSaved, onSaving }: EditorProps) {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch<SiteSettings>("/api/site/settings").then((res) => {
      if (res.success && res.data) {
        setSettings(res.data);
      }
      setLoaded(true);
    });
  }, []);

  async function save() {
    onSaving();
    await apiFetch("/api/site/settings", {
      method: "PUT",
      body: JSON.stringify({
        subtitle: settings.subtitle || "",
        introText: settings.introText || "",
      }),
    });
    const res = await apiFetch<Block>(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({
        content: {
          subtitle: settings.subtitle,
          introText: settings.introText,
        },
      }),
    });
    if (res.success && res.data) onSaved(res.data);
    else onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>제목 (부제)</label>
        <input
          className={inputClass}
          value={settings.subtitle || ""}
          onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
          placeholder="소개 섹션 제목"
        />
      </div>
      <div>
        <label className={labelClass}>소개 내용</label>
        <textarea
          className={`${inputClass} min-h-[120px] resize-y`}
          value={settings.introText || ""}
          onChange={(e) => setSettings({ ...settings, introText: e.target.value })}
          placeholder="소개 내용을 입력해주세요"
        />
      </div>
      <div className="flex justify-end">
        <button onClick={save} className={btnPrimary}>
          저장
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Career (Profiles) Editor
   ═══════════════════════════════════════════════ */
function CareerEditor({ block, onSaved, onSaving }: EditorProps) {
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState<ProfileItem>({
    type: "career",
    title: "",
    isCurrent: false,
  });

  useEffect(() => {
    apiFetch<ProfileItem[]>("/api/site/profiles").then((res) => {
      if (res.success && res.data) setItems(res.data);
      setLoaded(true);
    });
  }, []);

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
    onSaved(block);
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/profiles/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      {/* Existing items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-zinc-800/50 px-3 py-2"
            >
              <div className="flex-1">
                <span className="text-sm text-zinc-200">{item.title}</span>
                <span className="ml-2 text-xs text-zinc-600">
                  ({item.type === "education" ? "학력" : "경력"})
                </span>
                {item.isCurrent && (
                  <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                    현재
                  </span>
                )}
              </div>
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New item form */}
      <div className="rounded-xl border border-dashed border-white/10 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500">새 항목 추가</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>유형</label>
            <select
              className={inputClass}
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
            >
              <option value="career">경력</option>
              <option value="education">학력</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={newItem.isCurrent}
                onChange={(e) => setNewItem({ ...newItem, isCurrent: e.target.checked })}
                className="rounded border-white/20 bg-zinc-700"
              />
              현재 진행 중
            </label>
          </div>
        </div>
        <div>
          <label className={labelClass}>내용</label>
          <input
            className={inputClass}
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="예: 서울대학교 행정학과 졸업"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
        </div>
        <button onClick={addItem} className={btnSecondary}>
          + 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Goals (Pledges) Editor
   ═══════════════════════════════════════════════ */
function GoalsEditor({ block, onSaved, onSaving }: EditorProps) {
  const [items, setItems] = useState<PledgeItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState<Omit<PledgeItem, "id">>({
    icon: "🎯",
    title: "",
    description: "",
    details: [],
  });

  useEffect(() => {
    apiFetch<PledgeItem[]>("/api/site/pledges").then((res) => {
      if (res.success && res.data) setItems(res.data);
      setLoaded(true);
    });
  }, []);

  async function addItem() {
    if (!newItem.title.trim()) return;
    onSaving();
    const res = await apiFetch<PledgeItem>("/api/site/pledges", {
      method: "POST",
      body: JSON.stringify(newItem),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewItem({ icon: "🎯", title: "", description: "", details: [] });
    }
    onSaved(block);
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/pledges/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-800/50 px-3 py-2.5"
            >
              <span className="mt-0.5 text-lg">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="shrink-0 text-xs text-red-400 hover:text-red-300"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/10 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500">새 목표 추가</p>
        <div>
          <label className={labelClass}>제목</label>
          <input
            className={inputClass}
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="목표 제목"
          />
        </div>
        <div>
          <label className={labelClass}>설명</label>
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={newItem.description || ""}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="목표에 대한 설명"
          />
        </div>
        <button onClick={addItem} className={btnSecondary}>
          + 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Gallery Editor
   ═══════════════════════════════════════════════ */
function GalleryEditor({ block, onSaved, onSaving }: EditorProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState({ url: "", altText: "", category: "activity" });

  useEffect(() => {
    apiFetch<GalleryItem[]>("/api/site/gallery").then((res) => {
      if (res.success && res.data) setItems(res.data);
      setLoaded(true);
    });
  }, []);

  async function addItem() {
    if (!newItem.url.trim()) return;
    onSaving();
    const res = await apiFetch<GalleryItem>("/api/site/gallery", {
      method: "POST",
      body: JSON.stringify(newItem),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewItem({ url: "", altText: "", category: "activity" });
    }
    onSaved(block);
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/gallery/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="group/img relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.altText || ""}
                className="aspect-square w-full rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%2327272a' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%2371717a' font-size='12'%3E❌%3C/text%3E%3C/svg%3E";
                }}
              />
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="absolute right-1 top-1 hidden rounded-lg bg-black/70 px-2 py-1 text-[10px] text-red-400 group-hover/img:block"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/10 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500">새 사진 추가</p>
        <div>
          <label className={labelClass}>이미지 URL</label>
          <input
            className={inputClass}
            value={newItem.url}
            onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
            placeholder="https://example.com/photo.jpg"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>설명 (alt)</label>
            <input
              className={inputClass}
              value={newItem.altText}
              onChange={(e) => setNewItem({ ...newItem, altText: e.target.value })}
              placeholder="이미지 설명"
            />
          </div>
          <div>
            <label className={labelClass}>카테고리</label>
            <select
              className={inputClass}
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            >
              <option value="activity">활동</option>
              <option value="profile">프로필</option>
              <option value="event">행사</option>
              <option value="other">기타</option>
            </select>
          </div>
        </div>
        <button onClick={addItem} className={btnSecondary}>
          + 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Schedule Editor
   ═══════════════════════════════════════════════ */
function ScheduleEditor({ block, onSaved, onSaving }: EditorProps) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", date: "", time: "", location: "" });

  useEffect(() => {
    apiFetch<ScheduleItem[]>("/api/site/schedules").then((res) => {
      if (res.success && res.data) setItems(res.data);
      setLoaded(true);
    });
  }, []);

  async function addItem() {
    if (!newItem.title.trim() || !newItem.date) return;
    onSaving();
    const res = await apiFetch<ScheduleItem>("/api/site/schedules", {
      method: "POST",
      body: JSON.stringify({
        title: newItem.title,
        date: newItem.date,
        time: newItem.time || null,
        location: newItem.location || null,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewItem({ title: "", date: "", time: "", location: "" });
    }
    onSaved(block);
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/schedules/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-800/50 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                <p className="text-xs text-zinc-500">
                  {item.date?.slice(0, 10)}
                  {item.time && ` ${item.time}`}
                  {item.location && ` · ${item.location}`}
                </p>
              </div>
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="shrink-0 text-xs text-red-400 hover:text-red-300"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/10 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500">새 일정 추가</p>
        <div>
          <label className={labelClass}>일정 제목</label>
          <input
            className={inputClass}
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="일정 제목"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>날짜</label>
            <input
              type="date"
              className={inputClass}
              value={newItem.date}
              onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>시간</label>
            <input
              className={inputClass}
              value={newItem.time}
              onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
              placeholder="14:00"
            />
          </div>
          <div>
            <label className={labelClass}>장소</label>
            <input
              className={inputClass}
              value={newItem.location}
              onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
              placeholder="장소"
            />
          </div>
        </div>
        <button onClick={addItem} className={btnSecondary}>
          + 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   News Editor
   ═══════════════════════════════════════════════ */
function NewsEditor({ block, onSaved, onSaving }: EditorProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    source: "",
    url: "",
    publishedDate: "",
  });

  useEffect(() => {
    apiFetch<NewsItem[]>("/api/site/news").then((res) => {
      if (res.success && res.data) setItems(res.data);
      setLoaded(true);
    });
  }, []);

  async function addItem() {
    if (!newItem.title.trim()) return;
    onSaving();
    const res = await apiFetch<NewsItem>("/api/site/news", {
      method: "POST",
      body: JSON.stringify({
        title: newItem.title,
        source: newItem.source || null,
        url: newItem.url || null,
        publishedDate: newItem.publishedDate || null,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewItem({ title: "", source: "", url: "", publishedDate: "" });
    }
    onSaved(block);
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/news/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-800/50 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                <p className="text-xs text-zinc-500">
                  {item.source && `${item.source} · `}
                  {item.publishedDate?.slice(0, 10)}
                </p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-500 hover:underline"
                  >
                    기사 보기
                  </a>
                )}
              </div>
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="shrink-0 text-xs text-red-400 hover:text-red-300"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/10 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500">새 기사 추가</p>
        <div>
          <label className={labelClass}>제목</label>
          <input
            className={inputClass}
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="기사 제목"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>출처</label>
            <input
              className={inputClass}
              value={newItem.source}
              onChange={(e) => setNewItem({ ...newItem, source: e.target.value })}
              placeholder="언론사 이름"
            />
          </div>
          <div>
            <label className={labelClass}>날짜</label>
            <input
              type="date"
              className={inputClass}
              value={newItem.publishedDate}
              onChange={(e) => setNewItem({ ...newItem, publishedDate: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>URL</label>
          <input
            className={inputClass}
            value={newItem.url}
            onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <button onClick={addItem} className={btnSecondary}>
          + 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Videos Editor
   ═══════════════════════════════════════════════ */
function VideosEditor({ block, onSaved, onSaving }: EditorProps) {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState({ videoId: "", title: "" });

  useEffect(() => {
    apiFetch<VideoItem[]>("/api/site/videos").then((res) => {
      if (res.success && res.data) setItems(res.data);
      setLoaded(true);
    });
  }, []);

  function extractYoutubeId(input: string): string {
    // Handle full URLs
    const match = input.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (match) return match[1];
    // Assume it's already an ID if 11 chars
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    return input;
  }

  async function addItem() {
    const videoId = extractYoutubeId(newItem.videoId.trim());
    if (!videoId) return;
    onSaving();
    const res = await apiFetch<VideoItem>("/api/site/videos", {
      method: "POST",
      body: JSON.stringify({
        videoId,
        title: newItem.title || null,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewItem({ videoId: "", title: "" });
    }
    onSaved(block);
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/videos/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="group/vid relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                alt={item.title || ""}
                className="aspect-video w-full rounded-xl object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/80 px-2 py-1.5">
                <p className="line-clamp-1 text-[11px] text-zinc-200">
                  {item.title || item.videoId}
                </p>
              </div>
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="absolute right-1 top-1 hidden rounded-lg bg-black/70 px-2 py-1 text-[10px] text-red-400 group-hover/vid:block"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/10 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500">새 영상 추가</p>
        <div>
          <label className={labelClass}>YouTube ID 또는 URL</label>
          <input
            className={inputClass}
            value={newItem.videoId}
            onChange={(e) => setNewItem({ ...newItem, videoId: e.target.value })}
            placeholder="dQw4w9WgXcQ 또는 https://youtube.com/watch?v=..."
          />
        </div>
        <div>
          <label className={labelClass}>제목 (선택)</label>
          <input
            className={inputClass}
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="영상 제목"
          />
        </div>
        <button onClick={addItem} className={btnSecondary}>
          + 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Contacts Editor
   ═══════════════════════════════════════════════ */
function ContactsEditor({ block, onSaved, onSaving }: EditorProps) {
  const [items, setItems] = useState<ContactItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState({
    type: "phone",
    label: "",
    value: "",
    url: "",
  });

  const contactTypes = [
    { value: "phone", label: "전화" },
    { value: "email", label: "이메일" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "youtube", label: "YouTube" },
    { value: "blog", label: "블로그" },
    { value: "threads", label: "Threads" },
    { value: "twitter", label: "X (Twitter)" },
  ];

  useEffect(() => {
    apiFetch<ContactItem[]>("/api/site/contacts").then((res) => {
      if (res.success && res.data) setItems(res.data);
      setLoaded(true);
    });
  }, []);

  async function addItem() {
    if (!newItem.value.trim()) return;
    onSaving();
    const res = await apiFetch<ContactItem>("/api/site/contacts", {
      method: "POST",
      body: JSON.stringify({
        type: newItem.type,
        label: newItem.label || null,
        value: newItem.value,
        url: newItem.url || null,
      }),
    });
    if (res.success && res.data) {
      setItems((prev) => [...prev, res.data!]);
      setNewItem({ type: "phone", label: "", value: "", url: "" });
    }
    onSaved(block);
  }

  async function removeItem(id: number) {
    onSaving();
    await apiFetch(`/api/site/contacts/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    onSaved(block);
  }

  if (!loaded) return <p className="text-sm text-zinc-600">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-800/50 px-3 py-2.5"
            >
              <span className="rounded-lg bg-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-300 uppercase">
                {item.type}
              </span>
              <div className="flex-1 min-w-0">
                {item.label && (
                  <span className="mr-2 text-xs text-zinc-500">{item.label}</span>
                )}
                <span className="text-sm text-zinc-200">{item.value}</span>
              </div>
              <button
                onClick={() => item.id && removeItem(item.id)}
                className="shrink-0 text-xs text-red-400 hover:text-red-300"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/10 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500">새 연락처 추가</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>유형</label>
            <select
              className={inputClass}
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
            >
              {contactTypes.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>라벨 (선택)</label>
            <input
              className={inputClass}
              value={newItem.label}
              onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
              placeholder="예: 선거캠프"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>값</label>
          <input
            className={inputClass}
            value={newItem.value}
            onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
            placeholder="전화번호, 이메일, 사용자명 등"
          />
        </div>
        <div>
          <label className={labelClass}>URL (선택)</label>
          <input
            className={inputClass}
            value={newItem.url}
            onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <button onClick={addItem} className={btnSecondary}>
          + 추가
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Links Editor — stored in block content JSON
   ═══════════════════════════════════════════════ */
function LinksEditor({ block, onSaved, onSaving }: EditorProps) {
  const [items, setItems] = useState<LinkItem[]>(() => {
    const content = block.content as { links?: LinkItem[] } | null;
    return content?.links || [];
  });
  const [newItem, setNewItem] = useState({ title: "", url: "", description: "" });

  async function saveItems(updated: LinkItem[]) {
    onSaving();
    const res = await apiFetch<Block>(`/api/site/blocks/${block.id}`, {
      method: "PUT",
      body: JSON.stringify({ content: { links: updated } }),
    });
    if (res.success && res.data) onSaved(res.data);
    else onSaved(block);
  }

  function addItem() {
    if (!newItem.title.trim() || !newItem.url.trim()) return;
    const updated = [...items, { ...newItem }];
    setItems(updated);
    setNewItem({ title: "", url: "", description: "" });
    saveItems(updated);
  }

  function removeItem(index: number) {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    saveItems(updated);
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-800/50 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-500 hover:underline"
                >
                  {item.url}
                </a>
                {item.description && (
                  <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => removeItem(idx)}
                className="shrink-0 text-xs text-red-400 hover:text-red-300"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/10 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-500">새 링크 추가</p>
        <div>
          <label className={labelClass}>제목</label>
          <input
            className={inputClass}
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="링크 제목"
          />
        </div>
        <div>
          <label className={labelClass}>URL</label>
          <input
            className={inputClass}
            value={newItem.url}
            onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className={labelClass}>설명 (선택)</label>
          <input
            className={inputClass}
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="간단한 설명"
          />
        </div>
        <button onClick={addItem} className={btnSecondary}>
          + 추가
        </button>
      </div>
    </div>
  );
}
