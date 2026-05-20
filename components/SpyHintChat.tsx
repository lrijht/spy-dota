"use client";
import { useState, useRef, useEffect } from "react";

// Maps our hero IDs / common AI-returned names → CDN filenames
const CDN_OVERRIDES: Record<string, string> = {
  "anti_mage": "antimage",
  "anti-mage": "antimage",
  "crystal_maiden": "crystal_maiden",
  "drow_ranger": "drow_ranger",
  "shadow_fiend": "nevermore",
  "wraith_king": "skeleton_king",
  "nature_s_prophet": "natures_prophet",
  "natures_prophet": "natures_prophet",
  "nature's_prophet": "natures_prophet",
  "io": "wisp",
  "lycan": "lycanthrope",
  "treant_protector": "treant",
  "outworld_destroyer": "obsidian_destroyer",
  "outworld_devourer": "obsidian_destroyer",
  "centaur_warrunner": "centaur",
  "keeper_of_the_light": "keeper_of_the_light",
};

function heroIconUrl(heroId: string | null | undefined): string | null {
  if (!heroId) return null;
  const key = heroId.toLowerCase().replace(/[\s']/g, "_").replace(/-/g, "_");
  const name = CDN_OVERRIDES[key] ?? key;
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${name}_icon.png`;
}

interface Candidate {
  hero_name: string;
  display_name: string;
  confidence: number;
}

interface ClueResult {
  clue: string;
  candidates: Candidate[];
}

interface NarrowResult {
  hero_name: string;
  display_name: string;
  confidence?: number;
}

const MAX_CLUES = 3;

export default function SpyHintChat({ isSpy, onCluesChange, onNarrow }: {
  isSpy: boolean;
  onCluesChange?: (clues: string[]) => void;
  onNarrow?: (hero_name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [clues, setClues] = useState<string[]>([]);
  const [results, setResults] = useState<ClueResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [narrowResult, setNarrowResult] = useState<NarrowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const done = clues.length >= MAX_CLUES || narrowResult !== null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results, narrowResult, loading]);

  useEffect(() => {
    if (open && !done && inputRef.current) inputRef.current.focus();
  }, [open, done]);

  if (!isSpy) return null;

  async function submitClue() {
    const clue = input.trim();
    if (!clue || loading || done) return;
    const wordCount = clue.split(/\s+/).filter(Boolean).length;
    if (wordCount > 5) { setError("Максимум 5 слов"); return; }

    setError(null);
    setLoading(true);
    const newClues = [...clues, clue];
    setClues(newClues);
    onCluesChange?.(newClues);
    setInput("");

    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clue, clues: newClues }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setResults(prev => [...prev, { clue, candidates: data.candidates ?? [] }]);

      if (newClues.length >= MAX_CLUES) {
        const narrowRes = await fetch("/api/narrow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clues: newClues }),
        });
        if (narrowRes.ok) {
          const nr = await narrowRes.json();
          setNarrowResult(nr);
          if (nr?.hero_name) onNarrow?.(nr.hero_name);
        }
      }
    } catch {
      setError("Сервис недоступен");
      setClues(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating dagger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Spy Assistant"
        style={{
          position: "fixed", bottom: 24, right: 16,
          width: 52, height: 52,
          background: "linear-gradient(180deg, #1a232f 0%, #0c1117 100%)",
          border: `1px solid ${open ? "#c8a84b" : "rgba(200,168,75,0.55)"}`,
          boxShadow: open
            ? "0 0 0 2px rgba(200,168,75,0.3), 0 8px 32px rgba(0,0,0,0.85)"
            : "0 4px 20px rgba(0,0,0,0.7)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
          transition: "box-shadow .2s ease, border-color .2s ease",
        }}
      >
        <DaggerSvg size={24} />
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 84, right: 16,
          width: 340, maxWidth: "calc(100vw - 28px)",
          maxHeight: 520,
          background: "linear-gradient(180deg, #131b24 0%, #0c1117 100%)",
          border: "1px solid #c8a84b",
          boxShadow: "inset 0 0 0 1px rgba(200,168,75,0.15), 0 20px 60px rgba(0,0,0,0.95)",
          display: "flex", flexDirection: "column",
          zIndex: 999,
        }}>
          {/* Header */}
          <div style={{
            padding: "9px 14px",
            borderBottom: "1px solid rgba(200,168,75,0.2)",
            background: "rgba(200,168,75,0.05)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DaggerSvg size={13} />
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: 10,
                letterSpacing: ".22em", color: "var(--gold-bright)",
              }}>
                SPY ASSISTANT
              </span>
            </div>
            <span className="mono" style={{
              fontSize: 10, letterSpacing: ".1em",
              color: done ? "#ff6b5e" : "var(--text-dim)",
            }}>
              {clues.length}/{MAX_CLUES} УЛИК
            </span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: "auto", padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {results.length === 0 && !loading && (
              <div style={{
                fontFamily: "'Marcellus', serif", fontStyle: "italic",
                color: "var(--text-mute)", fontSize: 13,
                textAlign: "center", padding: "16px 4px", lineHeight: 1.65,
              }}>
                Введи улику — слово или фразу про героя (макс. 5 слов).
                После {MAX_CLUES} улик назову финального кандидата.
              </div>
            )}

            {results.map((r, idx) => (
              <div key={idx}>
                <div className="mono" style={{
                  fontSize: 9, color: "rgba(200,168,75,0.45)",
                  letterSpacing: ".18em", marginBottom: 5,
                }}>
                  УЛИКА {idx + 1} · «{r.clue}»
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {r.candidates.slice(0, 3).map((c, ci) => (
                    <CandidateRow key={ci} candidate={c} rank={ci} />
                  ))}
                  {r.candidates.length === 0 && (
                    <span style={{
                      fontFamily: "'Marcellus', serif", fontStyle: "italic",
                      color: "var(--text-mute)", fontSize: 12,
                    }}>
                      Нет совпадений
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{
                fontFamily: "'Marcellus', serif", fontStyle: "italic",
                color: "var(--text-dim)", fontSize: 12, textAlign: "center",
              }}>
                Анализирую…
              </div>
            )}

            {narrowResult && (
              <NarrowCard result={narrowResult} />
            )}

            {error && (
              <div style={{
                fontFamily: "'Marcellus', serif", fontSize: 12,
                color: "#ff8b7e",
                background: "rgba(163,37,30,0.1)",
                border: "1px solid rgba(163,37,30,0.3)",
                padding: "7px 10px",
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: "9px 10px",
            borderTop: "1px solid rgba(200,168,75,0.18)",
            display: "flex", gap: 5, flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && submitClue()}
              placeholder={done ? "Анализ завершён" : "Введи улику (макс. 5 слов)…"}
              disabled={done || loading}
              style={{
                flex: 1, padding: "7px 10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(200,168,75,0.22)",
                color: "var(--parchment)",
                fontFamily: "'Marcellus', serif", fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={submitClue}
              disabled={done || loading || !input.trim()}
              style={{
                padding: "7px 13px",
                background: (!done && input.trim())
                  ? "rgba(200,168,75,0.14)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${(!done && input.trim()) ? "var(--gold)" : "#1c2530"}`,
                cursor: (!done && input.trim()) ? "pointer" : "not-allowed",
                color: (!done && input.trim()) ? "var(--gold-bright)" : "var(--text-mute)",
                fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 700,
                transition: "all .15s ease",
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CandidateRow({ candidate, rank }: { candidate: Candidate; rank: number }) {
  const [imgErr, setImgErr] = useState(false);
  const pct = Math.min(100, Math.round((candidate?.confidence ?? 0) * 100));
  const barColor = ["#c8a84b", "#7a8fa0", "#506070"][rank] ?? "#506070";
  const borderColor = rank === 0 ? "rgba(200,168,75,0.22)" : "#1c2530";
  const bgColor = rank === 0 ? "rgba(200,168,75,0.05)" : "rgba(255,255,255,0.02)";
  const portraitUrl = heroIconUrl(candidate?.hero_name);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "5px 7px",
      background: bgColor,
      border: `1px solid ${borderColor}`,
    }}>
      {portraitUrl && !imgErr ? (
        <img
          src={portraitUrl}
          alt={candidate?.display_name ?? ""}
          width={32} height={18}
          style={{ objectFit: "cover", flexShrink: 0, display: "block" }}
          onError={() => setImgErr(true)}
        />
      ) : (
        <div style={{
          width: 32, height: 18, flexShrink: 0,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid #1c2530",
        }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Cinzel', serif", fontSize: 10,
          letterSpacing: ".05em",
          color: rank === 0 ? "var(--gold-bright)" : "var(--parchment)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: 3,
        }}>
          {candidate?.display_name ?? "—"}
        </div>
        <div style={{
          height: 2, background: "rgba(255,255,255,0.06)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${pct}%`, background: barColor,
            transition: "width .5s ease",
          }} />
        </div>
      </div>

      <span className="mono" style={{
        fontSize: 9, flexShrink: 0,
        color: rank === 0 ? "var(--gold)" : "var(--text-dim)",
        letterSpacing: ".06em",
      }}>
        {pct}%
      </span>
    </div>
  );
}

function NarrowCard({ result }: { result: NarrowResult }) {
  const [imgErr, setImgErr] = useState(false);
  const portraitUrl = heroIconUrl(result?.hero_name);
  const pct = typeof result?.confidence === "number"
    ? Math.min(100, Math.round(result.confidence * 100))
    : null;

  return (
    <div style={{
      padding: "12px 14px",
      background: "rgba(163,37,30,0.1)",
      border: "1px solid #a3251e",
      textAlign: "center",
    }}>
      <div className="mono" style={{
        fontSize: 9, color: "#ff6b5e",
        letterSpacing: ".3em", marginBottom: 10,
      }}>
        ФИНАЛЬНЫЙ ОТВЕТ
      </div>
      {portraitUrl && !imgErr ? (
        <img
          src={portraitUrl}
          alt={result?.display_name ?? ""}
          width={64} height={36}
          style={{
            objectFit: "cover", display: "block",
            margin: "0 auto 8px",
            border: "1px solid rgba(163,37,30,0.4)",
          }}
          onError={() => setImgErr(true)}
        />
      ) : (
        <div style={{
          width: 64, height: 36,
          margin: "0 auto 8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(163,37,30,0.3)",
        }} />
      )}
      <div style={{
        fontFamily: "'Cinzel', serif", fontSize: 17,
        color: "var(--gold-bright)", letterSpacing: ".1em",
      }}>
        {result?.display_name ?? "—"}
      </div>
      {pct != null && (
        <div className="mono" style={{
          fontSize: 10, color: "var(--text-dim)", marginTop: 5,
        }}>
          {pct}% уверен
        </div>
      )}
    </div>
  );
}

function DaggerSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {/* Blade */}
      <path d="M12 2 L14 9 L12 11 L10 9 Z"
        fill="rgba(200,168,75,0.25)" stroke="#c8a84b" strokeWidth="1.1" strokeLinejoin="round" />
      {/* Crossguard */}
      <rect x="8.5" y="11" width="7" height="1.6" rx="0.4" fill="#c8a84b" />
      {/* Handle */}
      <rect x="11" y="12.6" width="2" height="6.4" rx="0.5"
        fill="rgba(200,168,75,0.3)" stroke="#c8a84b" strokeWidth="0.9" />
      {/* Pommel */}
      <ellipse cx="12" cy="20.2" rx="2" ry="1.1" fill="#c8a84b" />
    </svg>
  );
}
