import { prepareAgentControllerMount } from "@mastra/code-sdk";
import { Mastra } from "@mastra/core/mastra";

// Phase 2: mount Mastra Code's AgentController on the server-owned Mastra.
// The `new Mastra(...)` literal must stay in this entry file so the Mastra
// deployer detects and bundles it. Model credentials resolve through
// Mastra's gateway at request time; no keys live in this file.
const prepared = await prepareAgentControllerMount();

export const mastra = new Mastra(prepared.mastraArgs);

await prepared.finalize();
