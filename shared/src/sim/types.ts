import type {
  BuildingKind,
  PlayerId,
  Terrain,
  UnitKind,
  UpgradeKind,
} from "./constants.ts";

export type { BuildingKind, PlayerId, Terrain, UnitKind, UpgradeKind };

export type OrderKind =
  | "idle"
  | "move"
  | "attackMove"
  | "attack"
  | "gather"
  | "return"
  | "build"
  | "patrol";

export interface Order {
  kind: OrderKind;
  x: number;
  y: number;
  targetId: number;
  resourceId: number;
  building: BuildingKind | null;
  patrolAx: number;
  patrolAy: number;
  patrolBx: number;
  patrolBy: number;
  patrolToB: boolean;
}

export interface Unit {
  id: number;
  player: PlayerId;
  kind: UnitKind;
  x: number;
  y: number;
  hp: number;
  cooldown: number;
  order: Order;
  carrying: number;
  buildProgress: number;
  path: number[];
  pathIndex: number;
  attackTarget: number;
  alive: boolean;
}

export interface Building {
  id: number;
  player: PlayerId;
  kind: BuildingKind;
  tx: number;
  ty: number;
  hp: number;
  cooldown: number;
  complete: boolean;
  progress: number;
  queue: QueueItem[];
  rallyX: number;
  rallyY: number;
  alive: boolean;
}

export interface QueueItem {
  kind: "unit" | "upgrade";
  unit: UnitKind | null;
  upgrade: UpgradeKind | null;
  remaining: number;
  total: number;
}

export interface GoldMine {
  id: number;
  tx: number;
  ty: number;
  remaining: number;
}

export interface PlayerState {
  gold: number;
  usedSupply: number;
  maxSupply: number;
  attackLevel: number;
  armorLevel: number;
  alive: boolean;
  surrendered: boolean;
}

export interface SimState {
  tick: number;
  seed: number;
  winner: PlayerId | null;
  nextId: number;
  units: Unit[];
  buildings: Building[];
  mines: GoldMine[];
  players: [PlayerState, PlayerState];
  terrain: Uint8Array;
  blocked: Uint8Array;
  explored: [Uint8Array, Uint8Array];
  visible: [Uint8Array, Uint8Array];
}

export type Command =
  | { type: "move"; unitIds: number[]; x: number; y: number; attackMove: boolean }
  | { type: "attack"; unitIds: number[]; targetId: number }
  | { type: "gather"; unitIds: number[]; resourceId: number }
  | { type: "build"; workerId: number; building: BuildingKind; tx: number; ty: number }
  | { type: "train"; buildingId: number; unit: UnitKind }
  | { type: "research"; buildingId: number; upgrade: UpgradeKind }
  | { type: "stop"; unitIds: number[] }
  | { type: "patrol"; unitIds: number[]; x: number; y: number }
  | { type: "rally"; buildingId: number; x: number; y: number }
  | { type: "cancel"; buildingId: number }
  | { type: "surrender" };

export interface TickCommands {
  tick: number;
  p0: Command[];
  p1: Command[];
}

export interface ReplayHeader {
  version: 1;
  seed: number;
  mapName: string;
  p0Name: string;
  p1Name: string;
  p0Id: string;
  p1Id: string;
  startedAt: number;
}

export interface ReplayFile {
  header: ReplayHeader;
  commands: TickCommands[];
}

export type AiDifficulty = "easy" | "medium" | "hard";

export interface MatchConfig {
  seed: number;
  localPlayer: PlayerId;
  opponentName: string;
  localName: string;
  mode: "ai" | "pvp" | "tutorial" | "replay";
  difficulty?: AiDifficulty;
  ranked?: boolean;
}
