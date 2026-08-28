import { useAppStore } from "../store.ts";

const BTN = {
  display: "block" as const,
  width: "260px",
  padding: "14px 0",
  marginBottom: "14px",
  background: "linear-gradient(135deg,#c27e2a,#8a4f0f)",
  border: "2px solid #e8a23a",
  borderRadius: "6px",
  color: "#fff8e7",
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "1px",
  cursor: "pointer",
};

const BG: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "radial-gradient(ellipse at 50% 30%, #1a110a 0%, #0d0d0d 100%)",
};

export function MainMenuScreen() {
  const { setScreen, playerName, setName } = useAppStore();

  return (
    <div style={BG}>
      <h1 style={{ fontSize: 56, letterSpacing: 6, color: "#e8a23a", marginBottom: 8, textShadow: "0 2px 18px #c27e2a" }}>
        CRUCIBLE
      </h1>
      <p style={{ color: "#a09070", marginBottom: 40, fontSize: 14, letterSpacing: 2 }}>
        1v1 · Real-Time Strategy · Play in Browser
      </p>

      <div style={{ marginBottom: 28, display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ fontSize: 13, color: "#a09070" }}>Your Name:</label>
        <input
          style={{
            background: "#1e1a14",
            border: "1px solid #5a4020",
            borderRadius: 4,
            color: "#f0e8d8",
            fontSize: 15,
            padding: "6px 12px",
            width: 170,
          }}
          maxLength={20}
          value={playerName}
          onChange={(e) => setName(e.target.value.trim() || "Commander")}
        />
      </div>

      <button style={BTN} onClick={() => setScreen("play-menu")}>⚔️ Play</button>
      <button
        style={{ ...BTN, background: "linear-gradient(135deg,#1a3a4a,#0d2233)", borderColor: "#4ec4e0" }}
        onClick={() => {
          const { nextSeed, startGame, playerName } = useAppStore.getState();
          startGame({ seed: nextSeed(), localPlayer: 0, opponentName: "Tutorial", localName: playerName, mode: "tutorial" });
        }}
      >
        📖 Tutorial
      </button>
    </div>
  );
}
