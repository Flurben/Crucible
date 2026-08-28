/** Simulation ticks per second. 20 Hz keeps lockstep traffic modest and combat readable. */
export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;

/** World units per tile. Positions are integers. */
export const TILE = 32;

export const MAP_W = 80;
export const MAP_H = 80;

export const MAX_SUPPLY = 50;
export const STARTING_GOLD = 200;
export const STARTING_WORKERS = 6;
export const KEEP_SUPPLY = 10;
export const OUTPOST_SUPPLY = 10;

export const GATHER_AMOUNT = 8;
export const GATHER_TICKS = 16;
export const GOLD_MINE_AMOUNT = 1500;
export const DROP_RANGE = 48;
export const GATHER_RANGE = 40;

export const BUILD_RANGE = 48;
export const RALLY_DEFAULT_OFFSET = 64;

export const HASH_INTERVAL = 40;
export const COMMAND_DELAY = 6;

export const MAX_PRODUCTION_QUEUE = 5;

export const AGGRO_RANGE = 160;
export const KEEP_REVEAL_RADIUS = 12;

export type PlayerId = 0 | 1;

export type UnitKind = "worker" | "swordsman" | "archer" | "knight";
export type BuildingKind = "keep" | "barracks" | "outpost" | "tower" | "forge";
export type UpgradeKind = "attack" | "armor";
export type Terrain = "plains" | "forest" | "rock" | "gold";

export interface UnitStats {
  kind: UnitKind;
  gold: number;
  supply: number;
  trainTicks: number;
  hp: number;
  armor: number;
  attack: number;
  attackTicks: number;
  range: number;
  speed: number;
  radius: number;
  vision: number;
  isRanged: boolean;
}

export interface BuildingStats {
  kind: BuildingKind;
  gold: number;
  buildTicks: number;
  hp: number;
  armor: number;
  attack: number;
  attackTicks: number;
  range: number;
  w: number;
  h: number;
  vision: number;
  supply: number;
}

export const UNIT_STATS: Record<UnitKind, UnitStats> = {
  worker: {
    kind: "worker",
    gold: 50,
    supply: 1,
    trainTicks: 30,
    hp: 40,
    armor: 0,
    attack: 5,
    attackTicks: 22,
    range: 20,
    speed: 4,
    radius: 8,
    vision: 7,
    isRanged: false,
  },
  swordsman: {
    kind: "swordsman",
    gold: 75,
    supply: 1,
    trainTicks: 36,
    hp: 90,
    armor: 2,
    attack: 12,
    attackTicks: 18,
    range: 22,
    speed: 4,
    radius: 9,
    vision: 7,
    isRanged: false,
  },
  archer: {
    kind: "archer",
    gold: 90,
    supply: 1,
    trainTicks: 40,
    hp: 55,
    armor: 0,
    attack: 9,
    attackTicks: 20,
    range: 140,
    speed: 4,
    radius: 8,
    vision: 9,
    isRanged: true,
  },
  knight: {
    kind: "knight",
    gold: 160,
    supply: 2,
    trainTicks: 50,
    hp: 140,
    armor: 3,
    attack: 16,
    attackTicks: 20,
    range: 24,
    speed: 7,
    radius: 11,
    vision: 8,
    isRanged: false,
  },
};

export const BUILDING_STATS: Record<BuildingKind, BuildingStats> = {
  keep: {
    kind: "keep",
    gold: 400,
    buildTicks: 200,
    hp: 1400,
    armor: 4,
    attack: 0,
    attackTicks: 0,
    range: 0,
    w: 4,
    h: 4,
    vision: 10,
    supply: KEEP_SUPPLY,
  },
  barracks: {
    kind: "barracks",
    gold: 150,
    buildTicks: 80,
    hp: 700,
    armor: 2,
    attack: 0,
    attackTicks: 0,
    range: 0,
    w: 3,
    h: 3,
    vision: 6,
    supply: 0,
  },
  outpost: {
    kind: "outpost",
    gold: 100,
    buildTicks: 50,
    hp: 450,
    armor: 1,
    attack: 0,
    attackTicks: 0,
    range: 0,
    w: 2,
    h: 2,
    vision: 8,
    supply: OUTPOST_SUPPLY,
  },
  tower: {
    kind: "tower",
    gold: 125,
    buildTicks: 60,
    hp: 500,
    armor: 3,
    attack: 14,
    attackTicks: 16,
    range: 180,
    w: 2,
    h: 2,
    vision: 10,
    supply: 0,
  },
  forge: {
    kind: "forge",
    gold: 150,
    buildTicks: 80,
    hp: 600,
    armor: 2,
    attack: 0,
    attackTicks: 0,
    range: 0,
    w: 3,
    h: 3,
    vision: 6,
    supply: 0,
  },
};

export const UPGRADE_COST = [100, 150, 200] as const;
export const UPGRADE_TICKS = [80, 100, 120] as const;
export const MAX_UPGRADE = 3;
export const ATTACK_PER_LEVEL = 2;
export const ARMOR_PER_LEVEL = 1;

export const FOREST_SPEED = 2;

export const BONUS: Record<UnitKind, Partial<Record<UnitKind | BuildingKind, number>>> = {
  worker: {},
  swordsman: { knight: 6 },
  archer: { swordsman: 4, worker: 2 },
  knight: { archer: 8, worker: 6 },
};

export const BUILDING_BONUS: Partial<Record<UnitKind, number>> = {
  knight: 8,
  swordsman: 4,
};

export const PLAYER_COLORS = ["#e8a23a", "#4ec4e0"] as const;
export const PLAYER_NAMES = ["Ember", "Frost"] as const;
