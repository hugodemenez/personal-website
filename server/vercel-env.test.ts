import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_VERCEL_PROJECT_ID,
  DEFAULT_VERCEL_TEAM_ID,
  persistVercelEnvAndRedeploy,
  vercelProjectId,
  vercelTeamId,
} from "./vercel-env";

test("uses Vercel project and team env vars when present", () => {
  assert.equal(
    vercelProjectId({ VERCEL_PROJECT_ID: "prj_from_env" }),
    "prj_from_env"
  );
  assert.equal(vercelTeamId({ VERCEL_TEAM_ID: "team_from_env" }), "team_from_env");
  assert.equal(vercelTeamId({ VERCEL_ORG_ID: "org_from_env" }), "org_from_env");
});

test("falls back to the documented project and team IDs", () => {
  assert.equal(vercelProjectId({}), DEFAULT_VERCEL_PROJECT_ID);
  assert.equal(vercelTeamId({}), DEFAULT_VERCEL_TEAM_ID);
});

test("upserts env vars then redeploys the current production deployment", async () => {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, method, body });

    if (url.includes("/v10/projects/") && url.includes("/env")) {
      return new Response(JSON.stringify({ created: [], failed: [] }), {
        status: 201,
      });
    }
    if (url.includes("/v9/projects/")) {
      return new Response(
        JSON.stringify({
          name: "personal-website",
          targets: { production: { id: "dpl_current" } },
        }),
        { status: 200 }
      );
    }
    if (url.includes("/v13/deployments")) {
      return new Response(JSON.stringify({ id: "dpl_new" }), { status: 200 });
    }
    throw new Error(`Unexpected fetch ${method} ${url}`);
  };

  try {
    const ok = await persistVercelEnvAndRedeploy(
      {
        SPOTIFY_REFRESH_TOKEN: "new-token",
        SPOTIFY_AUTHORIZED_AT: "2026-08-14T17:43:00.000Z",
      },
      { VERCEL_TOKEN: "vercel-token" }
    );
    assert.equal(ok, true);
    assert.equal(calls.length, 3);
    assert.match(calls[0].url, /\/v10\/projects\/prj_lskQL35c9gImwWjO4ZASmeK5yIUN\/env/);
    assert.match(calls[0].url, /upsert=true/);
    assert.match(calls[0].url, /teamId=team_xmMLxDTGQiduMBDfRLlXFiMS/);
    assert.equal(calls[0].method, "POST");
    assert.deepEqual(
      (calls[0].body as Array<{ key: string }>).map((item) => item.key),
      ["SPOTIFY_REFRESH_TOKEN", "SPOTIFY_AUTHORIZED_AT"]
    );
    assert.equal(calls[2].method, "POST");
    assert.deepEqual(calls[2].body, {
      name: "personal-website",
      deploymentId: "dpl_current",
      target: "production",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
