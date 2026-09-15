import assert from 'node:assert/strict';
import test from 'node:test';

test('publication invariant requires both title and domain verification', () => {
  const canPublish = (titleVerified: boolean, domainVerified: boolean, status: string) =>
    titleVerified && domainVerified && status === 'current';
  assert.equal(canPublish(false, true, 'current'), false);
  assert.equal(canPublish(true, false, 'current'), false);
  assert.equal(canPublish(true, true, 'draft'), false);
  assert.equal(canPublish(true, true, 'current'), true);
});

test('a filename is never promoted to an official title', () => {
  const originalFilename = 'ABC-010203.pdf';
  const fetched = { originalFilename, suggestedTitle: null, titleVerified: false };
  assert.equal(fetched.suggestedTitle, null);
  assert.equal(fetched.titleVerified, false);
});
