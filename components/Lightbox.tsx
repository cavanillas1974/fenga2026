"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

interface Props {
  renders: string[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
  onDownload: (url: string) => void;
}

export default function Lightbox({ renders, index, onClose, onNav, onDownload }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNav(index - 1);
      if (e.key === "ArrowRight" && index < renders.length - 1) onNav(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, renders.length, onClose, onNav]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Image */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(90vw, 1200px)",
          aspectRatio: "4/3",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={renders[index]} alt={`Variación ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

        {/* Top bar */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          padding: "16px 20px",
          background: "linear-gradient(rgba(0,0,0,0.7), transparent)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: "-0.2px" }}>
            Variación {index + 1} <span style={{ opacity: 0.5 }}>/ {renders.length}</span>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <IconBtn onClick={() => onDownload(renders[index])} title="Descargar">
              <Download size={16} />
            </IconBtn>
            <IconBtn onClick={onClose} title="Cerrar">
              <X size={16} />
            </IconBtn>
          </div>
        </div>

        {/* Nav prev */}
        {index > 0 && (
          <NavBtn side="left" onClick={() => onNav(index - 1)}>
            <ChevronLeft size={20} />
          </NavBtn>
        )}
        {/* Nav next */}
        {index < renders.length - 1 && (
          <NavBtn side="right" onClick={() => onNav(index + 1)}>
            <ChevronRight size={20} />
          </NavBtn>
        )}

        {/* Dots */}
        <div style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
        }}>
          {renders.map((_, i) => (
            <button
              key={i}
              onClick={() => onNav(i)}
              style={{
                width: i === index ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? "var(--gold)" : "rgba(255,255,255,0.3)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 34, height: 34,
      borderRadius: 8,
      background: "rgba(255,255,255,0.1)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {children}
    </button>
  );
}

function NavBtn({ side, onClick, children }: { side: "left" | "right"; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      position: "absolute",
      top: "50%",
      [side]: 16,
      transform: "translateY(-50%)",
      width: 40, height: 40,
      borderRadius: "50%",
      background: "rgba(0,0,0,0.6)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {children}
    </button>
  );
}
