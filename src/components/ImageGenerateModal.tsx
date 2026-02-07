"use client";

import { useState } from "react";

const STYLE_OPTIONS = [
  { id: "minimal", label: "ミニマル" },
  { id: "illustration", label: "イラスト" },
  { id: "photo", label: "写真風" },
  { id: "pop", label: "ポップ" },
  { id: "dark", label: "ダーク" },
  { id: "watercolor", label: "水彩画" },
] as const;

const TONE_OPTIONS = [
  { id: "auto", label: "自動" },
  { id: "warm", label: "暖色系" },
  { id: "cool", label: "寒色系" },
  { id: "monochrome", label: "モノクロ" },
  { id: "pastel", label: "パステル" },
  { id: "vivid", label: "ビビッド" },
] as const;

interface ImageGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  keyword: string;
  content: string;
  onTokensUpdated?: (remaining: number) => void;
}

export default function ImageGenerateModal({
  isOpen,
  onClose,
  title,
  keyword,
  content,
  onTokensUpdated,
}: ImageGenerateModalProps) {
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [styles, setStyles] = useState<string[]>(["minimal", "illustration", "photo"]);
  const [tone, setTone] = useState("auto");
  const [customPrompt, setCustomPrompt] = useState("");

  if (!isOpen) return null;

  const toggleStyle = (id: string) => {
    setStyles((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => s !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const generate = async () => {
    setGenerating(true);
    setError("");
    setImages([]);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          keyword,
          content,
          styles,
          tone: tone !== "auto" ? tone : undefined,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needTokens) {
          setError("トークンが不足しています。トークンを購入してください。");
        } else {
          setError(data.error || "画像生成に失敗しました");
        }
        return;
      }

      setImages(data.images || []);
      if (data.remaining !== undefined && onTokensUpdated) {
        onTokensUpdated(data.remaining);
      }
    } catch {
      setError("画像生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = (base64: string, index: number) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 670;
      const ctx = canvas.getContext("2d")!;
      // 1792x1024 → 1280x670 にセンタークロップ
      const srcRatio = img.width / img.height;
      const dstRatio = 1280 / 670;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (srcRatio > dstRatio) {
        sw = img.height * dstRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / dstRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1280, 670);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `note_header_${index + 1}.png`;
      link.click();
    };
    img.src = `data:image/png;base64,${base64}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-bright">Note ヘッダー画像生成</h2>
            <p className="text-sm text-text-dim mt-1">
              記事内容からヘッダー画像を生成（note推奨 1280×670px）
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-dim hover:text-text-bright hover:bg-hover-subtle transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* 初期状態 or 再生成 */}
          {images.length === 0 && !generating && (
            <div className="py-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-tint)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <p className="text-text-primary mb-1">
                  「{title || keyword || "記事"}」のヘッダー画像を生成します
                </p>
                <p className="text-sm text-text-dim">
                  {styles.length}つのスタイルで生成されます（8トークン消費）
                </p>
              </div>

              {/* カスタマイズ */}
              <div className="max-w-lg mx-auto">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="flex items-center gap-2 text-sm text-text-dim hover:text-text-primary transition-colors mx-auto mb-4"
                >
                  <svg className={`w-4 h-4 transition-transform ${showOptions ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  詳細設定
                </button>

                {showOptions && (
                  <div className="space-y-5 bg-[var(--color-bg)] border border-border rounded-xl p-5 mb-6">
                    {/* スタイル選択 */}
                    <div>
                      <label className="text-xs font-medium text-text-dim block mb-2">
                        スタイル（1〜3つ選択）
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {STYLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => toggleStyle(opt.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              styles.includes(opt.id)
                                ? "bg-accent text-on-accent"
                                : "bg-surface border border-border text-text-dim hover:text-text-primary"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 色合い */}
                    <div>
                      <label className="text-xs font-medium text-text-dim block mb-2">
                        色合い
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TONE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setTone(opt.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              tone === opt.id
                                ? "bg-accent text-on-accent"
                                : "bg-surface border border-border text-text-dim hover:text-text-primary"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* カスタム指示 */}
                    <div>
                      <label className="text-xs font-medium text-text-dim block mb-2">
                        追加の指示（任意）
                      </label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="例: 青と白を基調にした爽やかなイメージ、テクノロジー感のあるデザイン..."
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent resize-none"
                        rows={3}
                        maxLength={200}
                      />
                      <div className="text-right text-[0.65rem] text-text-dim mt-1">
                        {customPrompt.length}/200
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
              )}

              <div className="text-center">
                <button
                  onClick={generate}
                  className="px-6 py-3 rounded-xl bg-accent text-on-accent font-medium hover:bg-accent-dark transition-colors"
                >
                  画像を生成する
                </button>
              </div>
            </div>
          )}

          {/* 生成中 */}
          {generating && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-tint)] flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-accent animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <p className="text-text-primary mb-1">画像を生成中...</p>
              <p className="text-sm text-text-dim">3枚の画像を生成しています。しばらくお待ちください。</p>
            </div>
          )}

          {/* 生成結果 */}
          {images.length > 0 && !generating && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {images.map((img, i) => (
                  <div key={i} className="group relative rounded-xl overflow-hidden border border-border">
                    <img
                      src={`data:image/png;base64,${img}`}
                      alt={`ヘッダー画像 ${i + 1}`}
                      className="w-full aspect-[1280/670] object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => downloadImage(img, i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        ダウンロード
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
                      {STYLE_OPTIONS.find((s) => s.id === styles[i])?.label || `スタイル ${i + 1}`}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
              )}

              <div className="flex justify-center">
                <button
                  onClick={generate}
                  className="px-5 py-2.5 rounded-xl border border-border text-text-primary hover:bg-hover-subtle transition-colors text-sm"
                >
                  再生成する（8トークン）
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
