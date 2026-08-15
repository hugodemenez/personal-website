import assert from "node:assert/strict";
import test from "node:test";
import {
  htmlToMarkdown,
  repairDetachedMarkdownMarkers,
} from "./html-to-markdown";

test("keeps Substack list items on one line so they are not setext headings", () => {
  const markdown = htmlToMarkdown(
    "<p>You have the choice:</p><ul><li><p>To use the booster and take the shortcut</p></li><li><p>Don’t use it and take the regular path</p></li></ul>"
  );

  assert.equal(
    markdown,
    [
      "You have the choice:",
      "",
      "- To use the booster and take the shortcut",
      "- Don’t use it and take the regular path",
    ].join("\n")
  );
  assert.doesNotMatch(markdown, /^-\s*$/m);
});

test("keeps numbered Substack lists attached to their text", () => {
  const markdown = htmlToMarkdown(
    "<p>Small wins built up.</p><ol><li><p>The runs kept me steady.</p></li><li><p>The savings lowered risk.</p></li></ol>"
  );

  assert.equal(
    markdown,
    [
      "Small wins built up.",
      "",
      "1. The runs kept me steady.",
      "1. The savings lowered risk.",
    ].join("\n")
  );
});

test("does not emit an empty blockquote line before quoted text", () => {
  const markdown = htmlToMarkdown(
    "<blockquote><p>Quantitative analysis means using math.</p></blockquote>"
  );

  assert.equal(markdown, "> Quantitative analysis means using math.");
});

test("decodes HTML entities in body text", () => {
  const markdown = htmlToMarkdown(
    "<p>Black &amp; Scholes differential equations</p>"
  );

  assert.equal(markdown, "Black & Scholes differential equations");
});

test("reattaches list markers already stored in synced markdown", () => {
  const repaired = repairDetachedMarkdownMarkers(
    [
      "Why I value this experience so much?",
      "-",
      "",
      "Now, I know more about vectorization",
      "-",
      "",
      "I understand what people want",
    ].join("\n")
  );

  assert.equal(
    repaired,
    [
      "Why I value this experience so much?",
      "- Now, I know more about vectorization",
      "- I understand what people want",
    ].join("\n")
  );
});

test("leaves a space before bold that starts after a period", () => {
  const markdown = htmlToMarkdown(
    "<p>The dataset was relatively small. <strong>In conclusion, envision the challenges.</strong></p>"
  );

  assert.equal(
    markdown,
    "The dataset was relatively small. **In conclusion, envision the challenges.**"
  );
});
