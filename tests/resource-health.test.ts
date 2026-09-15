import assert from 'node:assert/strict';
import test from 'node:test';
import { checkResourceUrl, classifyResourceStatus } from '../src/lib/resource-health';

test('maps HTTP health states without treating 403 as broken', () => {
  assert.equal(classifyResourceStatus(200), 'healthy');
  assert.equal(classifyResourceStatus(200, true), 'redirected');
  assert.equal(classifyResourceStatus(301), 'redirected');
  assert.equal(classifyResourceStatus(403), 'blocked');
  assert.equal(classifyResourceStatus(404), 'broken');
  assert.equal(classifyResourceStatus(500), 'broken');
});

test('falls back to a limited GET when HEAD is unsupported', async () => {
  const methods: string[] = [];
  const fakeFetch: typeof fetch = async (_input, init) => {
    methods.push(String(init?.method));
    return new Response('', { status: methods.length === 1 ? 405 : 200, headers: { 'content-type': 'application/pdf' } });
  };
  const result = await checkResourceUrl('https://example.test/resource.pdf', { fetchImpl: fakeFetch });
  assert.deepEqual(methods, ['HEAD', 'GET']);
  assert.equal(result.method, 'GET');
  assert.equal(result.content_type, 'application/pdf');
  assert.equal(result.result, 'healthy');
});

test('reports timeout distinctly', async () => {
  const fakeFetch: typeof fetch = async (_input, init) => await new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
  });
  const result = await checkResourceUrl('https://example.test/slow', { fetchImpl: fakeFetch, timeoutMs: 5 });
  assert.equal(result.result, 'timeout');
});
