import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLUB_PLAYWRIGHT || 'playwright');
const origin = process.argv[2] || 'http://127.0.0.1:43976';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });

async function exercise({ kind, id, status, body, dismiss = false }) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  let attempts = 0;
  const unexpected = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const club = kind === 'cannabis';
  try {
    // Keep style initialization out of the critical path.
    await page.route('https://tiles.openfreemap.org/styles/positron', route => route.fulfill({ status: 503 }));
    await page.route('**/data/places-*.json', route => {
      const url = route.request().url();
      if (club && !url.endsWith('places-cannabis.json')) unexpected.push(url);
      if (url.endsWith(`places-${kind}.json`) && ++attempts === 1) return route.fulfill({ status, body });
      return route.continue();
    });
    await page.goto(`${origin}/?p=${id}${club ? '&mode=club' : ''}`, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('#shared-place-status');
    const retry = panel.getByRole('button', { name: 'Retry' });
    await retry.waitFor({ state: 'visible' });
    assert.match(await panel.innerText(), /Could not load the shared place/);
    assert.equal(await page.getByRole('button', { name: 'Retry', exact: true }).count(), 1);
    const chips = await page.locator('.chips').boundingBox();
    const panelBox = await panel.boundingBox();
    if (chips) assert(panelBox.y >= chips.y + chips.height - 1);
    const box = await retry.boundingBox();
    assert(box.width >= 44 && box.height >= 44);
    assert.equal(attempts, 1);
    if (dismiss) {
      await panel.getByRole('button', { name: 'Dismiss shared place' }).press('Enter');
      await panel.waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.activeElement.id), 'q');
      assert.equal(attempts, 1);
    } else {
      await retry.press('Enter');
      await page.waitForFunction(id => window.state.selected?.id === id &&
        document.activeElement?.tagName === 'H1', id);
      await panel.waitFor({ state: 'hidden' });
      assert.equal(attempts, 2);
    }
    console.log(`${kind}: ${dismiss ? 'dismissed' : 'recovered'} with one visible Retry`);
    assert.deepEqual(unexpected, []);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function exerciseNamedSearch({ club, name, kind, id }) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  let attempts = 0;
  try {
    await page.route('https://tiles.openfreemap.org/styles/positron', route => route.fulfill({ status: 503 }));
    await page.route(`**/data/places-${kind}.json`, route =>
      ++attempts === 1 ? route.fulfill({ status: 503 }) : route.continue());
    await page.goto(`${origin}/${club ? '?mode=club' : ''}`, { waitUntil: 'domcontentloaded' });
    const search = page.locator('#q');
    await search.fill(name);
    await page.locator('#hits').getByRole('button', { name: 'Retry' }).press('Enter');
    await page.locator(`#hits li[data-id="${id}"]`).waitFor();
    assert.equal(await search.evaluate(node => node === document.activeElement), true);
    await search.press('ArrowDown');
    await search.press('Enter');
    await page.waitForFunction(id => window.state.selected?.id === id, id);
    assert.equal(attempts, 2);
    console.log(`${kind}: named search recovered with keyboard focus`);
  } finally {
    await page.close();
  }
}

try {
  await exercise({ kind: 'work', id: 'o71358a621d50', status: 503, body: 'Injected failure' });
  await exercise({ kind: 'food', id: 'n10003319751', status: 200, body: '{"kinds":[],"rows":[{}]}' });
  await exercise({ kind: 'cannabis', id: 'n10057902624', status: 503, body: 'Injected failure' });
  await exercise({ kind: 'work', id: 'o71358a621d50', status: 503, body: 'Injected failure', dismiss: true });
  await exerciseNamedSearch({ club: true, name: 'Green Thumb 420', kind: 'cannabis', id: 'n10057902624' });
  await exerciseNamedSearch({ club: false, name: 'The Bridge 1958', kind: 'work', id: 'o71358a621d50' });
  console.log('Shared place recovery passed for Work, Food and CL;UB, with no basemap.');
} finally {
  await browser.close();
}
