/** Documented fallback when VERCEL_PROJECT_ID is unset. */
export const DEFAULT_VERCEL_PROJECT_ID = "prj_lskQL35c9gImwWjO4ZASmeK5yIUN";
/** Documented fallback when VERCEL_TEAM_ID / VERCEL_ORG_ID are unset. */
export const DEFAULT_VERCEL_TEAM_ID = "team_xmMLxDTGQiduMBDfRLlXFiMS";

export type VercelEnvWrites = Record<string, string>;

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

export async function upsertVercelProjectEnv(
  vars: VercelEnvWrites,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const token = requireVercelToken(env);
  const url = vercelApiUrl(
    `/v10/projects/${encodeURIComponent(vercelProjectId(env))}/env`,
    env,
    { upsert: "true" }
  );

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: bearerHeaders(token, true),
    body: JSON.stringify(
      Object.entries(vars).map(([key, value]) => ({
        key,
        value,
        type: "encrypted",
        target: ["production", "preview", "development"],
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
