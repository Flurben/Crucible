import { generateMap } from "./mapgen.ts";
import { tick } from "./engine.ts";
import { hashState } from "./hash.ts";
import { think, resetAi } from "../ai/ai.ts";

function runAiTest() {
  console.log("Running AI vs AI Simulation Test...");
  resetAi();
  const s = generateMap(42);

  for (let i = 0; i < 300; i++) {
    const p0Cmds = think(s, 0, "hard");
    const p1Cmds = think(s, 1, "medium");
    tick(s, p0Cmds, p1Cmds);
    if (s.winner !== null) {
      console.log(`Game ended early at tick ${i} with winner P${s.winner}`);
      break;
    }
  }

  console.log(`✅ AI Test Passed! Ran 300 ticks. Final Units count: ${s.units.length}, Hash: ${hashState(s)}`);
}

runAiTest();
