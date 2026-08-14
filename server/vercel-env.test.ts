import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_VERCEL_PROJECT_ID,
  DEFAULT_VERCEL_TEAM_ID,
  persistVercelEnvAndRedeploy,
  vercelProjectId,
  vercelTeamId,
} from "./vercel-env";

const PROJECT_ID = DEFAULT_VERCEL_PROJECT_ID;
const TEAM_ID = DEFAULT_VERCEL_TEAM_ID;

type FetchCall = { url: string; method: string; body: unknown };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function envListUrl(url: string): boolean {
  return /\/v9\/projects\/[^/]+\/env(?:\?|$)/.test(url);
}

function envItemUrl(url: string, envId?: string): boolean {
  if (envId) {
    return url.includes(`/v9/projects/${PROJECT_ID}/env/${envId}`);
  }
  return /\/v9\/projects\/[^/]+\/env\/[^/?]+/.test(url);
}

function createEnvUrl(url: string): boolean {
  return url.includes(`/v10/projects/${PROJECT_ID}/env`);
}

function projectUrl(url: string): boolean {
  return (
    url.includes(`/v9/projects/${PROJECT_ID}`) &&
    !url.includes("/env")
  );
}

async function withMockedFetch(
  handler: (call: FetchCall) => Response,
  run: (calls: FetchCall[]) => Promise<void>
): Promise<void> {
  const calls: FetchCall[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const call = { url, method, body };
    calls.push(call);
    return handler(call);
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function redeployHandlers(call: FetchCall): Response | null {
  if (call.method === "GET" && projectUrl(call.url)) {
    return jsonResponse({
      name: "personal-website",
      targets: { production: { id: "dpl_current" } },
    });
  }
  if (call.method === "POST" && call.url.includes("/v13/deployments")) {
    return jsonResponse({ id: "dpl_new" });
  }
  return null;
}

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

test("creates missing env vars then redeploys the current production deployment", async () => {
  await withMockedFetch(
    (call) => {
      if (call.method === "GET" && envListUrl(call.url)) {
        return jsonResponse({ envs: [] });
      }
      if (call.method === "POST" && createEnvUrl(call.url)) {
        return jsonResponse({ created: [], failed: [] }, 201);
      }
      const redeploy = redeployHandlers(call);
      if (redeploy) return redeploy;
      throw new Error(`Unexpected fetch ${call.method} ${call.url}`);
    },
    async (calls) => {
      const ok = await persistVercelEnvAndRedeploy(
        {
          SPOTIFY_REFRESH_TOKEN: "new-token",
          SPOTIFY_AUTHORIZED_AT: "2026-08-14T17:43:00.000Z",
        },
        { VERCEL_TOKEN: "vercel-token" }
      );
      assert.equal(ok, true);
      assert.equal(calls.length, 4);
      assert.equal(calls[0].method, "GET");
      assert.match(calls[0].url, /\/v9\/projects\/prj_lskQL35c9gImwWjO4ZASmeK5yIUN\/env/);
      assert.match(calls[0].url, new RegExp(`teamId=${TEAM_ID}`));
      assert.equal(calls[1].method, "POST");
      assert.match(calls[1].url, /\/v10\/projects\/prj_lskQL35c9gImwWjO4ZASmeK5yIUN\/env/);
      assert.doesNotMatch(calls[1].url, /upsert=/);
      assert.match(calls[1].url, new RegExp(`teamId=${TEAM_ID}`));
      assert.deepEqual(calls[1].body, [
        {
          key: "SPOTIFY_REFRESH_TOKEN",
          value: "new-token",
          type: "encrypted",
          target: ["production", "preview"],
        },
        {
          key: "SPOTIFY_AUTHORIZED_AT",
          value: "2026-08-14T17:43:00.000Z",
          type: "encrypted",
          target: ["production", "preview"],
        },
      ]);
      assert.equal(calls[3].method, "POST");
      assert.deepEqual(calls[3].body, {
        name: "personal-website",
        deploymentId: "dpl_current",
        target: "production",
      });
    }
  );
});

test("patches the existing production env id instead of posting a second row", async () => {
  await withMockedFetch(
    (call) => {
      if (call.method === "GET" && envListUrl(call.url)) {
        return jsonResponse({
          envs: [
            {
              id: "env_authorized_prod",
              key: "SPOTIFY_AUTHORIZED_AT",
              type: "sensitive",
              target: ["production"],
            },
            {
              id: "env_refresh_all",
              key: "SPOTIFY_REFRESH_TOKEN",
              type: "encrypted",
              target: ["production", "preview", "development"],
            },
          ],
        });
      }
      if (call.method === "PATCH" && envItemUrl(call.url)) {
        return jsonResponse({ id: "updated" });
      }
      const redeploy = redeployHandlers(call);
      if (redeploy) return redeploy;
      throw new Error(`Unexpected fetch ${call.method} ${call.url}`);
    },
    async (calls) => {
      const ok = await persistVercelEnvAndRedeploy(
        {
          SPOTIFY_REFRESH_TOKEN: "new-token",
          SPOTIFY_AUTHORIZED_AT: "2026-08-14T17:43:00.000Z",
        },
        { VERCEL_TOKEN: "vercel-token" }
      );
      assert.equal(ok, true);
      const writes = calls.filter(
        (call) => call.method === "POST" || call.method === "PATCH" || call.method === "DELETE"
      );
      const envWrites = writes.filter(
        (call) => createEnvUrl(call.url) || envItemUrl(call.url)
      );
      assert.equal(envWrites.some((call) => call.method === "POST"), false);
      assert.equal(envWrites.some((call) => createEnvUrl(call.url)), false);
      assert.deepEqual(
        envWrites.map((call) => ({ method: call.method, url: call.url, body: call.body })),
        [
          {
            method: "PATCH",
            url: `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/env_refresh_all?teamId=${TEAM_ID}`,
            body: {
              value: "new-token",
              type: "encrypted",
              target: ["production", "preview", "development"],
            },
          },
          {
            method: "PATCH",
            url: `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/env_authorized_prod?teamId=${TEAM_ID}`,
            body: {
              value: "2026-08-14T17:43:00.000Z",
              type: "sensitive",
              target: ["production"],
            },
          },
        ]
      );
    }
  );
});

test("deletes leftover ids for the same key after patching the production row", async () => {
  await withMockedFetch(
    (call) => {
      if (call.method === "GET" && envListUrl(call.url)) {
        return jsonResponse({
          envs: [
            {
              id: "env_authorized_prod",
              key: "SPOTIFY_AUTHORIZED_AT",
              type: "sensitive",
              target: ["production"],
            },
            {
              id: "env_authorized_dup",
              key: "SPOTIFY_AUTHORIZED_AT",
              type: "encrypted",
              target: ["production", "preview", "development"],
            },
            {
              id: "env_refresh_all",
              key: "SPOTIFY_REFRESH_TOKEN",
              type: "encrypted",
              target: ["production", "preview", "development"],
            },
            {
              id: "env_refresh_dup",
              key: "SPOTIFY_REFRESH_TOKEN",
              type: "plain",
              target: ["preview"],
            },
          ],
        });
      }
      if (call.method === "PATCH" && envItemUrl(call.url)) {
        return jsonResponse({ id: "updated" });
      }
      if (call.method === "DELETE" && envItemUrl(call.url)) {
        return jsonResponse({ id: "deleted" });
      }
      const redeploy = redeployHandlers(call);
      if (redeploy) return redeploy;
      throw new Error(`Unexpected fetch ${call.method} ${call.url}`);
    },
    async (calls) => {
      const ok = await persistVercelEnvAndRedeploy(
        {
          SPOTIFY_REFRESH_TOKEN: "new-token",
          SPOTIFY_AUTHORIZED_AT: "2026-08-14T17:43:00.000Z",
        },
        { VERCEL_TOKEN: "vercel-token" }
      );
      assert.equal(ok, true);
      const envWrites = calls.filter(
        (call) => createEnvUrl(call.url) || envItemUrl(call.url)
      );
      assert.equal(
        envWrites.some((call) => call.method === "POST" || createEnvUrl(call.url)),
        false
      );
      assert.deepEqual(
        envWrites.map((call) => `${call.method} ${call.url}`),
        [
          `PATCH https://api.vercel.com/v9/projects/${PROJECT_ID}/env/env_refresh_all?teamId=${TEAM_ID}`,
          `DELETE https://api.vercel.com/v9/projects/${PROJECT_ID}/env/env_refresh_dup?teamId=${TEAM_ID}`,
          `PATCH https://api.vercel.com/v9/projects/${PROJECT_ID}/env/env_authorized_prod?teamId=${TEAM_ID}`,
          `DELETE https://api.vercel.com/v9/projects/${PROJECT_ID}/env/env_authorized_dup?teamId=${TEAM_ID}`,
        ]
      );
      assert.deepEqual(envWrites[0].body, {
        value: "new-token",
        type: "encrypted",
        target: ["production", "preview", "development"],
      });
      assert.equal(envWrites[1].body, null);
      assert.deepEqual(envWrites[2].body, {
        value: "2026-08-14T17:43:00.000Z",
        type: "sensitive",
        target: ["production"],
      });
    }
  );
});
