import assert from "node:assert/strict";
import test from "node:test";
import { getSubstackPost } from "./substack-feed";

test("reads a local Substack post by slug", () => {
  const post = getSubstackPost("writing-software");
  assert.ok(post);
  assert.equal(post.slug, "writing-software");
  assert.equal(post.title, "Writing software");
  assert.ok(post.image);
});

test("rejects missing or unsafe slugs", () => {
  assert.equal(getSubstackPost("not-a-real-post"), null);
  assert.equal(getSubstackPost("../package.json"), null);
  assert.equal(getSubstackPost(""), null);
});
