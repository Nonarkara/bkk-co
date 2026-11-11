const assert = require('node:assert/strict');
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLUB_PLAYWRIGHT || '/Users/nonarkara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.PLUB_URL || 'https://co.nonarkara.org';

async function verify() {
  const browser = await chromium.launch({
    executablePath: process.env.PLUB_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const viewports = [];
  try {
    for (const [width, height] of [[390, 844], [1024, 900], [1440, 900], [1670, 1000]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width === 390, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [], writes = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (request.url().startsWith(base + '/api/') && !['GET', 'HEAD'].includes(request.method())) writes.push(request.method());
      });
      await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(() => typeof state !== 'undefined' && state.foodLoaded &&
        map.getLayer('manga-building-line') && map.queryRenderedFeatures({ layers: ['manga-building-line'] }).length,
        null, { timeout: 90000 });
      if (width === 390) await page.locator('#list-toggle').click();
      const rail = await page.locator('#list').evaluate(list => {
        const groups = [...list.querySelectorAll('.list-group')].map(group => ({
          heading: group.querySelector('h3').innerText,
          previews: group.querySelectorAll('.list-place').length
        }));
        const chrome = list.getBoundingClientRect().top - list.closest('#list-wrap').getBoundingClientRect().top;
        return { groups, chrome, count: document.querySelector('#count').innerText };
      });
      assert(rail.groups.length && rail.groups.every(group => group.previews > 0 && group.previews <= 3));
      assert(rail.chrome <= 128);
      await page.screenshot({ path: path.join(__dirname, `sidebar-${width}.png`) });
      await page.locator('.list-walkthrough').click();
      const stage = page.locator('#walkthrough-stage[open][data-ready="true"]');
      await stage.waitFor({ timeout: 30000 });
      const model = await stage.evaluate(el => ({
        area: el.dataset.area,
        volumes: Number(el.dataset.volumes),
        streets: Number(el.dataset.streets),
        areas: el.querySelector('select[aria-label=Neighbourhood]').options.length,
        pins: [...el.querySelectorAll('.model-pin:not([hidden])')].map(pin => {
          const r = pin.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
        })
      }));
      assert.equal(model.area, 'charoenkrung');
      assert.equal(model.volumes, 30);
      assert(model.streets > 0 && model.areas === 12 && model.pins.length && model.pins.every(Boolean));
      const clip = { x: Math.round(width * .2), y: Math.round(height * .34), width: Math.round(width * .6), height: Math.round(height * .30) };
      const overview = await page.screenshot({ clip });
      await page.screenshot({ path: path.join(__dirname, `overview-${width}.png`) });
      await stage.locator('[data-mode=walk]').click();
      await page.waitForFunction(() => document.activeElement.matches('.model-canvas'));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const street = await page.screenshot({ clip });
      assert(!overview.equals(street), 'Street level should draw a different scene');
      if (width === 390) {
        await page.screenshot({ path: path.join(__dirname, 'street-390.png') });
        await stage.locator('select[aria-label=Neighbourhood]').selectOption('prawet');
        await page.waitForFunction(() => document.querySelector('#walkthrough-stage').dataset.area === 'prawet');
        assert.equal(await stage.getAttribute('data-volumes'), '0');
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#walkthrough-stage').evaluate(el => el.open), false);
      assert.equal(await page.evaluate(() => document.activeElement.matches('.list-walkthrough')), true);
      assert.deepEqual(errors, []);
      assert.deepEqual(writes, []);
      viewports.push({ width, height, rail, model, streetFrameChanged: true, errors, writes });
      console.log(`${width}×${height} grouped rail, overview, street level and Escape passed`);
      await context.close();
    }
    await writeFile(path.join(__dirname, 'results.json'), JSON.stringify({ base, viewports }, null, 2) + '\n');
  } finally {
    await browser.close();
  }
}

verify().catch(error => { console.error(error); process.exitCode = 1; });
