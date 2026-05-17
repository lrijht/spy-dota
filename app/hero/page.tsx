"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HeroIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/hero/antimage"); }, [router]);
  return (
    <>
      <div className="stage-bg" />
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="mono" style={{ color: "var(--text-mute)", letterSpacing: ".2em", fontSize: 12 }}>
          ЗАГРУЗКА...
        </span>
      </div>
    </>
  );
}
