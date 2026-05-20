"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";

const ATTR_ICON: Record<string, string> = {
  str: `${CDN}/icons/hero_str.png`,
  agi: `${CDN}/icons/hero_agi.png`,
  int: `${CDN}/icons/hero_int.png`,
  all: `${CDN}/icons/hero_universal.png`,
};

const ATTR_LABEL: Record<string, string> = {
  str: "STRENGTH",
  agi: "AGILITY",
  int: "INTELLIGENCE",
  all: "UNIVERSAL",
};

interface HeroData {
  hero_name: string;
  display_name: string;
  keyword_count: number;
  attribute?: string;
}

function CornerOrnament() {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="28" height="28">
      <path d="M2 14 L2 2 L14 2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 14 L5 5 L14 5" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <path d="M5 5 L8 2 L11 5 L8 8 Z" fill="currentColor" opacity="0.9" />
      <path d="M7 4 L8 3 L9 4 L8 5 Z" fill="#000" opacity="0.5" />
      <path d="M14 5 Q18 5 20 9 Q21 12 22 14" stroke="currentColor" strokeWidth="0.7" opacity="0.65" fill="none" />
      <circle cx="22" cy="14" r="1.2" fill="currentColor" opacity="0.85" />
      <path d="M5 14 Q5 18 9 20 Q12 21 14 22" stroke="currentColor" strokeWidth="0.7" opacity="0.65" fill="none" />
      <circle cx="14" cy="22" r="1.2" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function Corners() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", color: "#c8a84b" }} aria-hidden="true">
      <div style={{ position: "absolute", top: -2, left: -2 }}><CornerOrnament /></div>
      <div style={{ position: "absolute", top: -2, right: -2, transform: "scaleX(-1)" }}><CornerOrnament /></div>
      <div style={{ position: "absolute", bottom: -2, left: -2, transform: "scaleY(-1)" }}><CornerOrnament /></div>
      <div style={{ position: "absolute", bottom: -2, right: -2, transform: "scale(-1,-1)" }}><CornerOrnament /></div>
    </div>
  );
}

function BrainIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9.5 2a4.5 4.5 0 0 0-4.5 4.5c0 .6.12 1.17.33 1.7A4 4 0 0 0 2 12a4 4 0 0 0 2.5 3.72V17a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-1.28A4 4 0 0 0 22 12a4 4 0 0 0-3.33-3.8A4.5 4.5 0 0 0 14.5 2a4.48 4.48 0 0 0-2.5.76A4.48 4.48 0 0 0 9.5 2z" stroke="#c8a84b" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export default function TrainPage() {
  const [hero, setHero] = useState<HeroData | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [taughtToday, setTaughtToday] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [imgError, setImgError] = useState(false);

  const fetchNext = useCallback(async (exclude?: string) => {
    setLoading(true);
    setHero(null);
    setError("");
    setText("");
    setImgError(false);
    try {
      const url = exclude
        ? `/api/train/next-hero?exclude=${encodeURIComponent(exclude)}`
        : "/api/train/next-hero";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Не удалось загрузить героя");
      const data: HeroData = await res.json();
      // server returned the same hero despite exclude — retry once without it
      if (exclude && data.hero_name === exclude) {
        const res2 = await fetch("/api/train/next-hero");
        if (res2.ok) {
          setHero(await res2.json());
          return;
        }
      }
      setHero(data);
    } catch (e: any) {
      setError(e.message ?? "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNext(); }, [fetchNext]);

  async function handleSubmit() {
    if (!hero || !text.trim()) return;
    const submittedHeroName = hero.hero_name;
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    const keywords = text.split(/[,\n]+/).map(k => k.trim()).filter(k => k.length > 1);
    const payload = { hero_name: submittedHeroName, keywords };
    console.log("[train/submit] payload:", payload);

    try {
      const res = await fetch("/api/train/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Ошибка отправки");
      }
      const data = await res.json().catch(() => ({}));
      const added = typeof data.added === "number" ? data.added : keywords.length;
      const updatedCount = typeof data.updated_tags_count === "number" ? data.updated_tags_count : null;
      if (updatedCount !== null) {
        setHero(h => h ? { ...h, keyword_count: updatedCount } : h);
      }
      setTaughtToday(n => n + added);
      const countLabel = updatedCount !== null ? ` (всего: ${updatedCount})` : "";
      setSuccessMsg(`✓ Отправлено! Добавлено ${added} ${added === 1 ? "слово" : added < 5 ? "слова" : "слов"}${countLabel}`);
      setTimeout(() => { setSuccessMsg(""); fetchNext(submittedHeroName); }, 1000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const portraitUrl = hero
    ? `${CDN}/heroes/${hero.hero_name}_full.png`
    : null;

  const attr = hero?.attribute ?? "all";

  return (
    <>
      <div className="stage-bg" />
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem" }}>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 720, marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <a href="/" className="mono" style={{ color: "var(--text-mute)", fontSize: 11, letterSpacing: ".2em", textDecoration: "none" }}>
              ← ГЛАВНАЯ
            </a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <BrainIcon />
            <div>
              <div className="display heading-gold" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", lineHeight: 1 }}>
                ОБУЧЕНИЕ ИИ
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", letterSpacing: ".3em", marginTop: 4 }}>
                ПОМОГИ НЕЙРОСЕТИ ЛУЧШЕ УГАДЫВАТЬ ГЕРОЕВ
              </div>
            </div>
          </div>

          {taughtToday > 0 && (
            <div className="anim-in" style={{
              marginTop: 16, padding: "10px 18px",
              background: "rgba(30,163,163,0.12)",
              border: "1px solid rgba(75,224,214,0.3)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ color: "#4be0d6", fontSize: 18 }}>✦</span>
              <span className="mono" style={{ color: "#4be0d6", fontSize: 13, letterSpacing: ".1em" }}>
                Ты обучил ИИ <strong>{taughtToday}</strong> {taughtToday === 1 ? "записи" : taughtToday < 5 ? "записям" : "записям"} сегодня
              </span>
            </div>
          )}
        </div>

        {/* Main card */}
        <div className="panel" style={{ width: "100%", maxWidth: 720, padding: "40px 36px", position: "relative" }}>
          <Corners />

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div className="mono" style={{ color: "var(--text-mute)", letterSpacing: ".3em", fontSize: 12 }}>
                ЗАГРУЗКА ГЕРОЯ...
              </div>
            </div>
          ) : error && !hero ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ color: "#ff6b5e", marginBottom: 20, fontSize: 14 }}>{error}</div>
              <button className="dota-btn" onClick={() => fetchNext()}>ПОВТОРИТЬ</button>
            </div>
          ) : hero ? (
            <>
              {/* Hero portrait row */}
              <div style={{ display: "flex", gap: 28, alignItems: "flex-start", marginBottom: 28 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {!imgError && portraitUrl ? (
                    <Image
                      src={portraitUrl}
                      alt={hero.display_name}
                      width={128}
                      height={72}
                      onError={() => setImgError(true)}
                      style={{
                        display: "block",
                        border: "1px solid rgba(200,168,75,0.5)",
                        boxShadow: "0 0 24px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(200,168,75,0.2)",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 128, height: 72,
                      background: "var(--bg-2)",
                      border: "1px solid rgba(200,168,75,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: "var(--text-mute)", fontSize: 11 }}>?</span>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    {ATTR_ICON[attr] && (
                      <Image
                        src={ATTR_ICON[attr]}
                        alt={ATTR_LABEL[attr] ?? attr}
                        width={20}
                        height={20}
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: ".3em" }}>
                      {ATTR_LABEL[attr] ?? attr.toUpperCase()}
                    </span>
                  </div>

                  <div className="display heading-gold" style={{ fontSize: "clamp(1.2rem, 3vw, 1.8rem)", lineHeight: 1.1, marginBottom: 10 }}>
                    {hero.display_name}
                  </div>

                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "6px 14px",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(200,168,75,0.25)",
                    boxShadow: "inset 0 0 0 1px rgba(200,168,75,0.1)",
                  }}>
                    <span style={{ color: "#c8a84b", fontSize: 14 }}>◆</span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--parchment-dim)", letterSpacing: ".1em" }}>
                      Известно ключевых слов: <strong style={{ color: "var(--gold)" }}>{hero.keyword_count}</strong>
                    </span>
                    <span style={{ color: "var(--text-mute)", fontSize: 11, fontStyle: "italic" }}>
                      — помоги узнать больше!
                    </span>
                  </div>
                </div>
              </div>

              <div className="dota-divider"><span className="line" /><span className="glyph">◆</span><span className="line" /></div>

              {/* Text area */}
              <div style={{ marginBottom: 20 }}>
                <label className="dota-label" style={{ marginBottom: 10 }}>
                  ОПИШИ ГЕРОЯ СВОИМИ СЛОВАМИ
                </label>
                <textarea
                  className="dota-input"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Способности, стиль игры, роль, лор, нюансы... Пиши на русском или английском, как удобно"
                  rows={5}
                  style={{
                    resize: "vertical",
                    minHeight: 120,
                    fontFamily: "'Marcellus', serif",
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                />
                <div className="mono" style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 6, letterSpacing: ".15em" }}>
                  // Любые ассоциации помогут ИИ лучше угадывать этого героя
                </div>
              </div>

              {successMsg && (
                <div className="anim-in" style={{
                  background: "rgba(30,163,163,0.15)", color: "#4be0d6",
                  border: "1px solid rgba(75,224,214,0.4)", padding: "10px 14px",
                  fontSize: 14, marginBottom: 16,
                  fontFamily: "'Marcellus', serif",
                }}>
                  {successMsg}
                </div>
              )}

              {error && (
                <div style={{
                  background: "rgba(163,37,30,0.15)", color: "#ff6b5e",
                  border: "1px solid #a3251e", padding: "10px 14px",
                  fontSize: 14, marginBottom: 16,
                  fontFamily: "'Marcellus', serif",
                }}>
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="dota-btn primary"
                  style={{ flex: 1, padding: "16px 28px" }}
                  onClick={handleSubmit}
                  disabled={submitting || !text.trim()}
                >
                  {submitting ? "ОТПРАВКА..." : "⚔ ОТПРАВИТЬ И ПРОДОЛЖИТЬ"}
                </button>
                <button
                  className="dota-btn"
                  style={{ minWidth: 120 }}
                  onClick={() => fetchNext()}
                  disabled={submitting || loading}
                >
                  ПРОПУСТИТЬ →
                </button>
              </div>
            </>
          ) : null}
        </div>

        <div className="mono" style={{ marginTop: 20, fontSize: 10, color: "var(--text-mute)", letterSpacing: ".2em" }}>
          {"// ТВОИ ЗНАНИЯ ДЕЛАЮТ ИИ СИЛЬНЕЕ"}
        </div>
      </main>
    </>
  );
}
