import {
  BUILDING_STATS,
  UNIT_STATS,
  type BuildingKind,
  type Command,
  type PlayerId,
  type SimState,
} from "@crucible/shared";
import type { InputState } from "./input/input.ts";
import { selectedBuildings, selectedUnits } from "./input/input.ts";

interface HudProps {
  state: SimState;
  localPlayer: PlayerId;
  input: InputState;
  sendCommands: (cmds: Command[]) => void;
  setInput: (fn: (i: InputState) => void) => void;
}

const BTN = {
  background: "#1e1a14",
  border: "1px solid #5a4020",
  borderRadius: 4,
  color: "#f0e8d8",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 12,
  minWidth: 80,
  textAlign: "center" as const,
};

export function HUD({ state, localPlayer, input, sendCommands, setInput }: HudProps) {
  const p = state.players[localPlayer];
  const u = selectedUnits(state, input.selected, localPlayer);
  const b = selectedBuildings(state, input.selected, localPlayer);

  return (
    <>
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", padding: "8px 16px",
        background: "linear-gradient(to bottom, rgba(13,13,13,0.9), transparent)",
        display: "flex", justifyContent: "space-between", color: "#e8a23a", fontSize: 16, fontWeight: 700,
        pointerEvents: "none",
      }}>
        <div>Gold: {p.gold} | Supply: {p.usedSupply} / {p.maxSupply}</div>
        <div>Tick: {state.tick}</div>
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, width: "100%", height: 160,
        background: "linear-gradient(to top, rgba(13,13,13,0.95) 60%, transparent)",
        display: "flex", padding: "16px", gap: 32, alignItems: "flex-end", pointerEvents: "none",
      }}>
        <div style={{ background: "rgba(30,26,20,0.8)", border: "2px solid #5a4020", borderRadius: 8, padding: 12, minWidth: 260, pointerEvents: "auto" }}>
          {u.length > 0 ? (
            <>
              <h3 style={{ color: "#e8a23a", margin: "0 0 8px" }}>Selected Units ({u.length})</h3>
              {u.length === 1 && <div style={{ color: "#a09070" }}>HP: {Math.ceil(u[0]!.hp)} / {UNIT_STATS[u[0]!.kind].hp}</div>}
              {u.some((x: any) => x.kind === "worker") && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {(["barracks", "outpost", "tower", "forge"] as BuildingKind[]).map((k) => (
                    <button key={k} style={BTN} onClick={() => setInput((i) => { i.buildGhost = { kind: k, valid: false, tx: 0, ty: 0 }; })}>
                      Build {k} ({BUILDING_STATS[k].gold})
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : b.length === 1 ? (
            <>
              <h3 style={{ color: "#e8a23a", margin: "0 0 8px" }}>{b[0]!.kind.toUpperCase()}</h3>
              <div style={{ color: "#a09070" }}>HP: {Math.ceil(b[0]!.hp)} / {BUILDING_STATS[b[0]!.kind].hp}</div>
              {b[0]!.queue.length > 0 && <div style={{ color: "#4ec4e0", fontSize: 12, marginTop: 4 }}>Constructing...</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {b[0]!.kind === "keep" && (
                  <button style={BTN} onClick={() => sendCommands([{ type: "train", buildingId: b[0]!.id, unit: "worker" }])}>
                    Worker ({UNIT_STATS.worker.gold})
                  </button>
                )}
                {b[0]!.kind === "barracks" && (
                  <>
                    <button style={BTN} onClick={() => sendCommands([{ type: "train", buildingId: b[0]!.id, unit: "swordsman" }])}>
                      Swordsman ({UNIT_STATS.swordsman.gold})
                    </button>
                    <button style={BTN} onClick={() => sendCommands([{ type: "train", buildingId: b[0]!.id, unit: "archer" }])}>
                      Archer ({UNIT_STATS.archer.gold})
                    </button>
                    <button style={BTN} onClick={() => sendCommands([{ type: "train", buildingId: b[0]!.id, unit: "knight" }])}>
                      Knight ({UNIT_STATS.knight.gold})
                    </button>
                  </>
                )}
                {b[0]!.kind === "forge" && (
                  <>
                    <button style={BTN} onClick={() => sendCommands([{ type: "research", buildingId: b[0]!.id, upgrade: "attack" }])}>
                      Upgrade Wep (100)
                    </button>
                    <button style={BTN} onClick={() => sendCommands([{ type: "research", buildingId: b[0]!.id, upgrade: "armor" }])}>
                      Upgrade Arm (100)
                    </button>
                  </>
                )}
                <button style={{ ...BTN, borderColor: "#e85050" }} onClick={() => sendCommands([{ type: "cancel", buildingId: b[0]!.id }])}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: "#706050", fontStyle: "italic" }}>No selection</div>
          )}
        </div>
      </div>
    </>
  );
}
