import { useEffect, useState } from "react";
import { useAppStore } from "../store.ts";

export function QueuingScreen() {
  const { setScreen, startGame, playerName, nextSeed } = useAppStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // TODO: in a full online build this would connect to the Colyseus matchmaker room.
  // For now, after 3 s we fall through to an AI match so offline play always works.
  useEffect(() => {
    if (elapsed < 3) return;
    startGame({ seed: nextSeed(), localPlayer: 0, opponentName: "AI (medium)", localName: playerName, mode: "ai", difficulty: "medium" });
  }, [elapsed]);

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 50% 30%, #1a110a 0%, #0d0d0d 100%)",
    }}>
      <h2 style={{ fontSize: 28, color: "#e8a23a", marginBottom: 20 }}>Searching for opponent…</h2>
      <p style={{ color: "#a09070", marginBottom: 40 }}>{elapsed}s elapsed</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: "50%",
            background: elapsed % 3 === i ? "#e8a23a" : "#3a2010",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <button
        style={{ padding: "10px 32px", background: "transparent", border: "1px solid #5a4020", borderRadius: 4, color: "#a09070", cursor: "pointer" }}
        onClick={() => setScreen("play-menu")}
      >Cancel</button>
    </div>
  );
}
