import { prepareAgentControllerMount } from "@mastra/code-sdk";
import { Mastra } from "@mastra/core/mastra";

import { buildTrustedLocalWorkspace } from "./workspace.js";

// Phase 2: mount Mastra Code's AgentController on the server-owned Mastra.
// The `new Mastra(...)` literal must stay in this entry file so the Mastra
// deployer detects and bundles it. Model credentials resolve through
// Mastra's gateway at request time; no keys live in this file.
//
// Phase 3: trusted local workspace (contained filesystem, explicit sandbox
// env allowlist, bounded command timeouts). LocalSandbox is development-only;
// untrusted execution moves to an isolated provider in Phase 15.
const projectRoot = process.cwd();
const prepared = await prepareAgentControllerMount({
  cwd: projectRoot,
  workspace: buildTrustedLocalWorkspace(projectRoot),
});

export const mastra = new Mastra(prepared.mastraArgs);

await prepared.finalize();
