import { useAppStore } from "../store.ts";

export function PostGameScreen() {
  const { postGame, matchConfig, setScreen, startGame, nextSeed, playerName } = useAppStore();
  if (!postGame || !matchConfig) return null;

  const won = postGame.winner === postGame.localPlayer;
  const delta = postGame.ratingDelta;

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: won
        ? "radial-gradient(ellipse at 50% 30%, #0d2a0d 0%, #0d0d0d 100%)"
        : "radial-gradient(ellipse at 50% 30%, #2a0d0d 0%, #0d0d0d 100%)",
    }}>
      <h1 style={{ fontSize: 64, marginBottom: 16, color: won ? "#4ec4e0" : "#e85050" }}>
        {won ? "VICTORY" : "DEFEAT"}
      </h1>
      <p style={{ fontSize: 18, color: "#a09070", marginBottom: 8 }}>
        Reason: {postGame.reason}
      </p>
      {delta != null && (
        <p style={{ fontSize: 22, color: delta >= 0 ? "#68d868" : "#e85050", marginBottom: 32 }}>
          {delta >= 0 ? "+" : ""}{delta} rating
        </p>
      )}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          style={{ padding: "12px 32px", background: "linear-gradient(135deg,#c27e2a,#8a4f0f)", border: "2px solid #e8a23a", borderRadius: 6, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          onClick={() => startGame({ ...matchConfig, seed: nextSeed(), localName: playerName })}
        >Rematch</button>
        <button
          style={{ padding: "12px 32px", background: "transparent", border: "2px solid #5a4020", borderRadius: 6, color: "#a09070", fontSize: 16, cursor: "pointer" }}
          onClick={() => setScreen("play-menu")}
        >Play Again</button>
        <button
          style={{ padding: "12px 32px", background: "transparent", border: "1px solid #3a2010", borderRadius: 6, color: "#706050", fontSize: 14, cursor: "pointer" }}
          onClick={() => setScreen("main-menu")}
        >Main Menu</button>
      </div>
    </div>
  );
}
