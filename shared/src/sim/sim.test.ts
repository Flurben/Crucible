import { generateMap } from "./mapgen.ts";
import { tick } from "./engine.ts";
import { hashState } from "./hash.ts";

function runTest() {
  console.log("Running Sim Determinism Test...");
  const s1 = generateMap(1337);
  const s2 = generateMap(1337);

  const h1_init = hashState(s1);
  const h2_init = hashState(s2);

  if (h1_init !== h2_init) {
    throw new Error(`Initial hash mismatch: ${h1_init} !== ${h2_init}`);
  }

  for (let i = 0; i < 100; i++) {
    tick(s1, [], []);
    tick(s2, [], []);
  }

  const h1_end = hashState(s1);
  const h2_end = hashState(s2);

  if (h1_end !== h2_end) {
    throw new Error(`State divergence detected after 100 ticks: ${h1_end} !== ${h2_end}`);
  }

  console.log(`✅ Test Passed! State Hash after 100 empty ticks: ${h1_end}`);
}

runTest();
