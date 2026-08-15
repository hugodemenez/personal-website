import assert from "node:assert/strict";
import test from "node:test";
import {
  postDateTransitionName,
  postStampTransitionName,
  postTitleTransitionName,
} from "./view-transitions";

test("builds unique title, stamp, and date names from a slug", () => {
  assert.equal(postTitleTransitionName("writing-software"), "post-title-writing-software");
  assert.equal(postStampTransitionName("writing-software"), "post-stamp-writing-software");
  assert.equal(postDateTransitionName("writing-software"), "post-date-writing-software");
});

test("strips characters that are not valid in a CSS ident", () => {
  assert.equal(
    postTitleTransitionName("hello world!"),
    "post-title-hello-world-"
  );
});
