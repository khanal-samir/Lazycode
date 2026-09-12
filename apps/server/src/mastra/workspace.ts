import { MASTRACODE_WORKSPACE_TOOLS } from "@mastra/code-sdk/agents/tool-availability";
import { LocalFilesystem, LocalSandbox, Workspace } from "@mastra/core/workspace";

/** Default bound for a single sandbox command in trusted local mode. */
export const TRUSTED_LOCAL_COMMAND_TIMEOUT_MS = 30_000;

/** Fallback PATH when the host provides none (keeps commands resolvable). */
export const FALLBACK_PATH = "/usr/bin:/bin";

/**
 * Build the statically-scoped workspace for trusted local mode: one project
 * directory, contained local filesystem, and a LocalSandbox that receives an
 * explicit environment allowlist instead of the host environment.
 *
 * Guarantees (proven in workspace.integration.test.ts):
 * - file tools reject `..` traversal, absolute outside paths, symlink reads,
 *   and overwrites of existing symlinks;
 * - commands run with `workingDirectory` set, see only the allowlisted env,
 *   and honor per-call timeouts and abort signals.
 *
 * Known limits (not asserted; queued for later phases):
 * - creating a new file beneath a symlinked parent directory escapes the
 *   fixture today (upstream LocalFilesystem checks the target realpath, which
 *   does not exist yet). Candidate for a Phase 5 policy hook.
 * - `execute_command` itself is not path-jailed; command path policy arrives
 *   with Phase 5, and untrusted execution moves to an isolated provider in
 *   Phase 15. LocalSandbox stays development-only: never share this static
 *   workspace across tenants.
 * @param root The trusted project directory serving as filesystem base and
 * command working directory.
 * @returns A Mastra workspace ready for `MastraCodeConfig.workspace`.
 */
export function buildTrustedLocalWorkspace(
  root: string,
): Workspace<LocalFilesystem, LocalSandbox, undefined> {
  return new Workspace({
    id: `lazycode-trusted-local-${root}`,
    name: "Lazycode Trusted Local Workspace",
    filesystem: new LocalFilesystem({ basePath: root, contained: true }),
    sandbox: new LocalSandbox({
      workingDirectory: root,
      env: { PATH: process.env.PATH ?? FALLBACK_PATH },
      timeout: TRUSTED_LOCAL_COMMAND_TIMEOUT_MS,
    }),
    tools: MASTRACODE_WORKSPACE_TOOLS,
  });
}
