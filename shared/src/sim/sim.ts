import { COMMAND_DELAY, HASH_INTERVAL } from "./constants.js";
import { tick } from "./engine.js";
import { hashState } from "./hash.js";
import { generateMap } from "./mapgen.js";
import type { Command, SimState, TickCommands } from "./types.js";

export class Simulation {
  readonly state: SimState;
  private readonly scheduled = new Map<number, TickCommands>();
  hashes: { tick: number; hash: number }[] = [];

  constructor(seed: number) {
    this.state = generateMap(seed);
  }

  schedule(cmds: TickCommands): void {
    this.scheduled.set(cmds.tick, cmds);
  }

  /** Advance one tick, applying any commands scheduled for this tick. */
  step(): void {
    const cmds = this.scheduled.get(this.state.tick) ?? { tick: this.state.tick, p0: [], p1: [] };
    this.scheduled.delete(this.state.tick);
    tick(this.state, cmds.p0, cmds.p1);
    if (this.state.tick % HASH_INTERVAL === 0) {
      this.hashes.push({ tick: this.state.tick, hash: hashState(this.state) });
    }
  }

  stepN(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  get delay(): number {
    return COMMAND_DELAY;
  }

  get ended(): boolean {
    return this.state.winner !== null;
  }
}

export function replayFrom(seed: number, commands: TickCommands[]): Simulation {
  const sim = new Simulation(seed);
  for (const c of commands) sim.schedule(c);
  return sim;
}

export function emptyTick(tickNo: number): TickCommands {
  return { tick: tickNo, p0: [], p1: [] };
}

export function mergeCommands(a: Command[], b: Command[]): Command[] {
  return a.concat(b);
}
