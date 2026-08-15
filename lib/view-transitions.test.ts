import assert from "node:assert/strict";
import test from "node:test";
import {
  postStampTransitionName,
  postTitleTransitionName,
} from "./view-transitions";

test("builds unique title and stamp names from a slug", () => {
  assert.equal(postTitleTransitionName("writing-software"), "post-title-writing-software");
  assert.equal(postStampTransitionName("writing-software"), "post-stamp-writing-software");
});

test("strips characters that are not valid in a CSS ident", () => {
  assert.equal(
    postTitleTransitionName("hello world!"),
    "post-title-hello-world-"
  );
});
