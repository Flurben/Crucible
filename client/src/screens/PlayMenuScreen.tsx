import { useAppStore } from "../store.ts";
import type { AiDifficulty } from "../store.ts";

const BTN = (color: string): React.CSSProperties => ({
  display: "block",
  width: "280px",
  padding: "13px 0",
  marginBottom: "12px",
  background: color,
  border: "2px solid #5a4020",
  borderRadius: "6px",
  color: "#fff8e7",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
});

export function PlayMenuScreen() {
  const { setScreen, startGame, nextSeed, playerName } = useAppStore();

  function playAi(difficulty: AiDifficulty) {
    startGame({ seed: nextSeed(), localPlayer: 0, opponentName: `AI (${difficulty})`, localName: playerName, mode: "ai", difficulty });
  }

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 50% 30%, #1a110a 0%, #0d0d0d 100%)",
    }}>
      <h2 style={{ fontSize: 32, color: "#e8a23a", marginBottom: 32, letterSpacing: 3 }}>SELECT MODE</h2>

      <button style={BTN("linear-gradient(135deg,#2a5a2a,#163016)")}
        onClick={() => setScreen("queuing")}>
        🌐 Ranked 1v1
      </button>
      <button style={BTN("linear-gradient(135deg,#1a3a1a,#0d1a0d)")}
        onClick={() => setScreen("queuing")}>
        🎮 Quick Match (Unranked)
      </button>

      <div style={{ width: 280, height: 1, background: "#3a2010", margin: "18px 0" }} />

      <button style={BTN("linear-gradient(135deg,#4a2a1a,#281408)")} onClick={() => playAi("easy")}>
        🤖 vs AI — Easy
      </button>
      <button style={BTN("linear-gradient(135deg,#5a3a1a,#301808)")} onClick={() => playAi("medium")}>
        🤖 vs AI — Medium
      </button>
      <button style={BTN("linear-gradient(135deg,#6a1a1a,#380808)")} onClick={() => playAi("hard")}>
        🤖 vs AI — Hard
      </button>

      <div style={{ width: 280, height: 1, background: "#3a2010", margin: "18px 0" }} />

      <button style={{ ...BTN("transparent"), borderColor: "#5a4020", fontSize: 14 }} onClick={() => setScreen("main-menu")}>
        ← Back
      </button>
    </div>
  );
}
