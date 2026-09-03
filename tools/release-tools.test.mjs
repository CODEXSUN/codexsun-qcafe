import assert from "node:assert/strict";
import { test } from "node:test";
import { formatChangelogCommitSubject, readLatestVersionedChangelogEntry } from "./changelog.mjs";
import { bumpPatch } from "./version-bump.mjs";
import { renderReviewBox } from "./github-helper.mjs";

test("patch versions advance by one", () => {
  assert.equal(bumpPatch("0.1.0"), "0.1.1");
});

test("the Git subject follows the latest changelog entry", () => {
  const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/u, "$1");
  const entry = readLatestVersionedChangelogEntry(root);
  assert.match(formatChangelogCommitSubject(entry), /^#\d+ - .+/u);
});

test("the GitHub review uses the interactive bordered format", () => {
  const review = renderReviewBox({ fileCount: 35, subject: "#68 - Billing address reactivity", version: "1.0.68" });
  assert.match(review, /\| GitHub Commit Review\s+\|/u);
  assert.match(review, /\| Version: 1\.0\.68\s+\|/u);
  assert.match(review, /\| Subject: #68 - Billing address reactivity\s+\|/u);
  assert.match(review, /\| Files: 35\s+\|/u);
});
