/** Documented fallback when VERCEL_PROJECT_ID is unset. */
export const DEFAULT_VERCEL_PROJECT_ID = "prj_lskQL35c9gImwWjO4ZASmeK5yIUN";
/** Documented fallback when VERCEL_TEAM_ID / VERCEL_ORG_ID are unset. */
export const DEFAULT_VERCEL_TEAM_ID = "team_xmMLxDTGQiduMBDfRLlXFiMS";

export type VercelEnvWrites = Record<string, string>;

const NEW_ENV_TARGETS = ["production", "preview"] as const;

type VercelEnvRow = {
  id?: string;
  key?: string;
  type?: string;
  target?: string[];
};

export function vercelProjectId(env: NodeJS.ProcessEnv = process.env): string {
  return env.VERCEL_PROJECT_ID || DEFAULT_VERCEL_PROJECT_ID;
}

export function vercelTeamId(env: NodeJS.ProcessEnv = process.env): string {
  return env.VERCEL_TEAM_ID || env.VERCEL_ORG_ID || DEFAULT_VERCEL_TEAM_ID;
}

function vercelApiUrl(
  path: string,
  env: NodeJS.ProcessEnv,
  query: Record<string, string> = {}
): URL {
  const url = new URL(`https://api.vercel.com${path}`);
  url.searchParams.set("teamId", vercelTeamId(env));
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function bearerHeaders(token: string, json = false): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/json",
    ...(json ? { "content-type": "application/json" } : {}),
  };
}

function requireVercelToken(env: NodeJS.ProcessEnv): string {
  if (!env.VERCEL_TOKEN) {
    throw new Error("VERCEL_TOKEN is not configured");
  }
  return env.VERCEL_TOKEN;
}

function projectEnvCollectionPath(env: NodeJS.ProcessEnv): string {
  return `/v9/projects/${encodeURIComponent(vercelProjectId(env))}/env`;
}

function projectEnvItemPath(env: NodeJS.ProcessEnv, envId: string): string {
  return `${projectEnvCollectionPath(env)}/${encodeURIComponent(envId)}`;
}

function hasProductionTarget(row: VercelEnvRow): boolean {
  return Array.isArray(row.target) && row.target.includes("production");
}

function isProductionOnly(row: VercelEnvRow): boolean {
  return (
    Array.isArray(row.target) &&
    row.target.length === 1 &&
    row.target[0] === "production"
  );
}

/** Prefer the production-targeted row so runtime keeps the updated value. */
function pickExistingVercelEnvRow(
  rows: VercelEnvRow[]
): VercelEnvRow | undefined {
  const withId = rows.filter(
    (row) => typeof row.id === "string" && row.id.length > 0
  );
  if (withId.length === 0) return undefined;
  const production = withId.filter(hasProductionTarget);
  const pool = production.length > 0 ? production : withId;
  return pool.find(isProductionOnly) ?? pool[0];
}

function existingTargets(row: VercelEnvRow): string[] {
  return Array.isArray(row.target) && row.target.length > 0
    ? row.target
    : [...NEW_ENV_TARGETS];
}

function existingType(row: VercelEnvRow): string {
  return row.type && row.type.length > 0 ? row.type : "encrypted";
}

function parseEnvList(data: unknown): VercelEnvRow[] {
  if (Array.isArray(data)) return data as VercelEnvRow[];
  if (data && typeof data === "object" && "envs" in data) {
    const envs = (data as { envs?: unknown }).envs;
    if (Array.isArray(envs)) return envs as VercelEnvRow[];
  }
  return [];
}

async function listVercelProjectEnv(
  token: string,
  env: NodeJS.ProcessEnv
): Promise<VercelEnvRow[]> {
  const response = await fetch(vercelApiUrl(projectEnvCollectionPath(env), env), {
    cache: "no-store",
    headers: bearerHeaders(token),
  });
  if (!response.ok) {
    console.error("Vercel env list failed", { status: response.status });
    throw new Error(`Vercel env list failed (${response.status})`);
  }
  return parseEnvList(await response.json());
}

async function patchVercelProjectEnv(
  token: string,
  env: NodeJS.ProcessEnv,
  row: VercelEnvRow,
  value: string
): Promise<void> {
  const envId = row.id;
  if (!envId) {
    throw new Error("Vercel env update failed");
  }
  const response = await fetch(
    vercelApiUrl(projectEnvItemPath(env, envId), env),
    {
      method: "PATCH",
      cache: "no-store",
      headers: bearerHeaders(token, true),
      body: JSON.stringify({
        value,
        type: existingType(row),
        target: existingTargets(row),
      }),
    }
  );
  if (!response.ok) {
    console.error("Vercel env update failed", { status: response.status });
    throw new Error(`Vercel env update failed (${response.status})`);
  }
}

async function deleteVercelProjectEnv(
  token: string,
  env: NodeJS.ProcessEnv,
  envId: string
): Promise<void> {
  const response = await fetch(
    vercelApiUrl(projectEnvItemPath(env, envId), env),
    {
      method: "DELETE",
      cache: "no-store",
      headers: bearerHeaders(token),
    }
  );
  if (!response.ok) {
    console.error("Vercel env delete failed", { status: response.status });
    throw new Error(`Vercel env delete failed (${response.status})`);
  }
}

async function createVercelProjectEnv(
  token: string,
  env: NodeJS.ProcessEnv,
  created: Array<{ key: string; value: string }>
): Promise<void> {
  const url = vercelApiUrl(
    `/v10/projects/${encodeURIComponent(vercelProjectId(env))}/env`,
    env
  );
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: bearerHeaders(token, true),
    body: JSON.stringify(
      created.map(({ key, value }) => ({
        key,
        value,
        type: "encrypted",
        target: [...NEW_ENV_TARGETS],
      }))
    ),
  });
  if (!response.ok) {
    console.error("Vercel env update failed", { status: response.status });
    throw new Error(`Vercel env update failed (${response.status})`);
  }
  const data = (await response.json()) as { failed?: unknown[] };
  if (Array.isArray(data.failed) && data.failed.length > 0) {
    console.error("Vercel env update failed", { failed: data.failed.length });
    throw new Error("Vercel env update failed");
  }
}

export async function upsertVercelProjectEnv(
  vars: VercelEnvWrites,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const token = requireVercelToken(env);
  const existing = await listVercelProjectEnv(token, env);
  const rowsByKey = new Map<string, VercelEnvRow[]>();
  for (const row of existing) {
    if (!row.key) continue;
    const rows = rowsByKey.get(row.key) ?? [];
    rows.push(row);
    rowsByKey.set(row.key, rows);
  }

  const toCreate: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(vars)) {
    const rows = rowsByKey.get(key) ?? [];
    const primary = pickExistingVercelEnvRow(rows);
    if (!primary?.id) {
      toCreate.push({ key, value });
      continue;
    }
    await patchVercelProjectEnv(token, env, primary, value);
    for (const leftover of rows) {
      if (!leftover.id || leftover.id === primary.id) continue;
      await deleteVercelProjectEnv(token, env, leftover.id);
    }
  }

  if (toCreate.length > 0) {
    await createVercelProjectEnv(token, env, toCreate);
  }
}

export async function redeployCurrentProduction(
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const token = requireVercelToken(env);
  const projectId = vercelProjectId(env);
  const projectResponse = await fetch(
    vercelApiUrl(`/v9/projects/${encodeURIComponent(projectId)}`, env),
    {
      cache: "no-store",
      headers: bearerHeaders(token),
    }
  );
  if (!projectResponse.ok) {
    console.error("Vercel project lookup failed", {
      status: projectResponse.status,
    });
    throw new Error(`Vercel project lookup failed (${projectResponse.status})`);
  }

  const project = (await projectResponse.json()) as {
    name?: string;
    targets?: { production?: { id?: string } };
  };
  const projectName = project.name;
  let deploymentId = project.targets?.production?.id;

  if (!deploymentId) {
    const listResponse = await fetch(
      vercelApiUrl("/v6/deployments", env, {
        projectId,
        target: "production",
        limit: "1",
      }),
      {
        cache: "no-store",
        headers: bearerHeaders(token),
      }
    );
    if (!listResponse.ok) {
      console.error("Vercel deployment lookup failed", {
        status: listResponse.status,
      });
      throw new Error(
        `Vercel deployment lookup failed (${listResponse.status})`
      );
    }
    const list = (await listResponse.json()) as {
      deployments?: Array<{ uid?: string }>;
    };
    deploymentId = list.deployments?.[0]?.uid;
  }

  if (!deploymentId || !projectName) {
    throw new Error("No production deployment to redeploy");
  }

  const redeployResponse = await fetch(
    vercelApiUrl("/v13/deployments", env, { forceNew: "1" }),
    {
      method: "POST",
      cache: "no-store",
      headers: bearerHeaders(token, true),
      body: JSON.stringify({
        name: projectName,
        deploymentId,
        target: "production",
      }),
    }
  );
  if (!redeployResponse.ok) {
    console.error("Vercel production redeploy failed", {
      status: redeployResponse.status,
    });
    throw new Error(
      `Vercel production redeploy failed (${redeployResponse.status})`
    );
  }
}

export async function persistVercelEnvAndRedeploy(
  vars: VercelEnvWrites,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  try {
    await upsertVercelProjectEnv(vars, env);
    await redeployCurrentProduction(env);
    return true;
  } catch (error) {
    console.error(
      "Failed to persist Vercel env and redeploy",
      error instanceof Error ? error.message : "unknown error"
    );
    return false;
  }
}
