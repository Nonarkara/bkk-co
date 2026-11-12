(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const th = params.get('lang') === 'th';
  const tr = (en, thai) => th ? thai : en;
  const titles = {
    live: tr('Where to live', 'เลือกย่านที่จะอยู่'),
    today: tr('Where to go today', 'วันนี้ไปไหนดี'),
    work: tr('Where to work', 'หาที่นั่งทำงาน')
  };
  const task = Object.hasOwn(titles, params.get('task')) ? params.get('task') : 'today';
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count = new Intl.NumberFormat(th ? 'th-TH' : 'en-GB');
  const title = tr('Plan your Bangkok day', 'วางแผนวันของคุณในกรุงเทพฯ');
  const languageURL = (key, thai) => `/day?${new URLSearchParams({task:key, lang:thai ? 'th' : 'en'})}`;
  const name = (area, thaiKey = 'nameTh') => th ? area[thaiKey] || area.name : area.name;
  const areaAt = area => `${area.anchor.y},${area.anchor.x}`;
  const mapURL = (plan, options = {}) => `/?${new URLSearchParams({plan, lang:th ? 'th' : 'en', ...options})}`;
  const link = (href, label, primary = false) => `<a${primary ? ' class="day-primary"' : ''} href="${esc(href)}">${esc(label)}</a>`;
  const action = (id, href, label, primary = false) => `<a id="${id}"${primary ? ' class="day-primary"' : ''} href="${esc(href)}">${esc(label)}</a>`;
  const option = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;
  const field = (id, label, options) => `<label for="${id}">${esc(label)}<select id="${id}">${options}</select></label>`;
  const intro = text => `<h2>${esc(titles[task])}</h2><p class="day-task-intro">${esc(text)}</p>`;
  const get = async path => {
    const response = await fetch(path, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  document.documentElement.lang = th ? 'th' : 'en';
  document.title = `${title} · PLUB`;
  byId('day-title').textContent = title;
  byId('day-map').textContent = tr('Map ↗', 'แผนที่ ↗');
  const language = byId('day-language');
  language.href = languageURL(task, !th);
  language.lang = th ? 'en' : 'th';
  language.textContent = tr('ภาษาไทย', 'English');
  byId('day-tasks').setAttribute('aria-label', tr('Choose what to plan', 'เลือกสิ่งที่ต้องการวางแผน'));
  byId('day-tasks').innerHTML = Object.entries(titles).map(([key, label]) => `<a href="${esc(languageURL(key, th))}"${key === task ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  byId('day-stamps-title').textContent = tr('Neighbourhood stamps', 'ตราประทับย่าน');
  byId('day-stamp-tip').textContent = tr('Save a private visit in a stamp area to earn a stamp. If you choose to share, tell the next visitor about a socket, noise, or entry rules.', 'บันทึกการไปเยือนแบบส่วนตัวในย่านที่มีตราประทับเพื่อรับตราประทับ หากอยากแบ่งปัน ลองบอกคนถัดไปเรื่องปลั๊กไฟ เสียงรบกวน หรือเงื่อนไขการเข้าใช้');
  byId('day-notebook').textContent = tr('Open my notebook →', 'เปิดสมุดบันทึก →');
  byId('day-stamp-status').textContent = tr('Checking this device…', 'กำลังตรวจสอบบันทึกในอุปกรณ์นี้…');

  function compare(node, areas, source) {
    const choices = areas.map(a => option(a.id, name(a))).join('');
    node.innerHTML = `${intro(tr('Compare two areas, then try a work session in each before choosing a base.', 'เปรียบเทียบสองย่าน แล้วลองไปนั่งทำงานจริงก่อนเลือกที่อยู่'))}
      <div class="day-fields">${field('day-left', tr('First area', 'ย่านแรก'), choices)}${field('day-right', tr('Second area', 'ย่านที่สอง'), choices)}</div>
      <div id="day-comparison"></div>
      <p class="day-source">${tr('Catalogue places within 800 m of each anchor. Rail distances are straight lines to mapped station points on the same side of the Chao Phraya. Check rent, street access and your regular trips separately.', 'นับสถานที่ในฐานข้อมูลภายใน 800 ม. จากจุดอ้างอิงของแต่ละย่าน ระยะถึงสถานีเป็นระยะเส้นตรงถึงจุดในแผนที่ฝั่งเดียวกันของแม่น้ำเจ้าพระยา ควรตรวจค่าเช่า ทางเดิน และการเดินทางประจำแยกต่างหาก')}</p>
      <p class="day-source">${link('https://www.openstreetmap.org/copyright', '© OpenStreetMap')} · ${link('https://overturemaps.org/', 'Overture Maps')} · ${tr('Rail snapshot', 'ข้อมูลสถานี ณ วันที่')} ${esc(source.railDate)}</p>`;
    const left = byId('day-left');
    const right = byId('day-right');
    left.value = 'ari'; right.value = 'samyan';
    const rail = area => `${link(`https://www.openstreetmap.org/node/${area.rail.id.slice(1)}`, name(area.rail))}<br>${esc(area.rail.systems.join('/'))} · ${area.rail.metres === 0 ? tr('At the anchor','ที่จุดอ้างอิง') : `${count.format(area.rail.metres)} ${tr('m','ม.')}`}`;
    const render = () => {
      const pair = [left, right].map(select => areas.find(a => a.id === select.value));
      const rows = [
        [tr('Cafés','คาเฟ่'), a => count.format(a.mix.cafe || 0)],
        [tr('Co-working','พื้นที่ทำงานร่วมกัน'), a => count.format(a.mix.coworking || 0)],
        [tr('Libraries','ห้องสมุด'), a => count.format(a.mix.library || 0)],
        [tr('Nearest rail','สถานีใกล้สุด'), rail],
        [tr('Try it','ลองไป'), a => link(mapURL('nearby', { at:areaAt(a), task:'laptop', minutes:120 }), tr('Find a work spot →','หาที่นั่งทำงาน →'))]
      ];
      byId('day-comparison').innerHTML = `<table class="day-comparison" aria-label="${tr('Area comparison','เปรียบเทียบย่าน')}"><thead><tr><th scope="col">${tr('Within reach','ใกล้จุดอ้างอิง')}</th>${pair.map(a => `<th scope="col">${esc(name(a))}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th scope="row">${esc(label)}</th>${pair.map(a => `<td>${value(a)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    };
    left.onchange = right.onchange = render;
    render();
  }

  function today(node, areas) {
    node.innerHTML = `${intro(tr('Choose an area for an afternoon out, a café hop, or a stop after an errand.', 'เลือกย่านสำหรับออกไปเที่ยวช่วงบ่าย แวะหลายคาเฟ่ หรือหาที่พักหลังทำธุระ'))}
      <div class="day-fields">${field('day-area', tr('Area to explore','ย่านที่อยากไป'), areas.map(a => option(a.id, name(a))).join(''))}</div>
      <p id="day-outing-fact" role="status"></p>
      <div class="day-actions">${action('day-show-area','/',tr('Explore on map →','ดูย่านบนแผนที่ →'),true)}${action('day-hop','/',tr('Plan a café hop','วางแผนแวะคาเฟ่'))}${action('day-drive','/',tr('Find a stop with parking','หาที่แวะพร้อมที่จอดรถ'))}</div>
      <p class="day-source">${tr('The map shows catalogue places. Check walking routes and current traffic in Directions.', 'แผนที่แสดงสถานที่ในฐานข้อมูล ตรวจเส้นทางเดินและสภาพจราจรปัจจุบันจากลิงก์นำทาง')}</p>`;
    const select = byId('day-area');
    select.value = 'charoenkrung';
    const render = () => {
      const area = areas.find(a => a.id === select.value);
      const at = areaAt(area);
      byId('day-outing-fact').textContent = tr(`${count.format(area.mix.cafe || 0)} mapped cafés within 800 m of the area anchor.`, `มีคาเฟ่ในฐานข้อมูล ${count.format(area.mix.cafe || 0)} แห่ง ภายใน 800 ม. จากจุดอ้างอิงของย่าน`);
      byId('day-show-area').href = mapURL('map', { at });
      byId('day-hop').href = `/?${new URLSearchParams({hop:`@${at}`})}`;
      byId('day-drive').href = mapURL('drive', { at, task:'laptop', minutes:120 });
    };
    select.onchange = render;
    render();
  }

  function work(node, areas) {
    node.innerHTML = `${intro(tr('Pick the work, the way you’ll get there, and the time you have.', 'เลือกประเภทงาน วิธีเดินทาง และเวลาที่มี'))}
      <div class="day-fields">
        ${field('day-work', tr('Type of work','ประเภทงาน'), [option('laptop',tr('Laptop · Wi-Fi and power','แล็ปท็อป · ต้องมี Wi-Fi และปลั๊ก')),option('online',tr('Online · Wi-Fi','ทำงานออนไลน์ · ต้องมี Wi-Fi')),option('read',tr('Reading','อ่านหนังสือ'))].join(''))}
        ${field('day-mode', tr('Travel','การเดินทาง'), [option('nearby',tr('Around my starting point','ใกล้จุดเริ่มต้น')),option('rail',tr('By BTS or rail','รถไฟฟ้า BTS หรือสายอื่น')),option('drive',tr('Drive and park','ขับรถและจอดรถ'))].join(''))}
        ${field('day-minutes', tr('Time available','เวลาที่มี'), [60,120,240,480].map(n => option(n,tr(`${n/60} h`,`${n/60} ชม.`))).join(''))}
        ${field('day-start', tr('Starting area','ย่านเริ่มต้น'), option('',tr('Use the map or my location','ใช้แผนที่หรือตำแหน่งของฉัน')) + areas.map(a => option(a.id,name(a))).join(''))}
      </div>
      <div class="day-actions">${action('day-find','/?plan=nearby',tr('Find work spots →','ค้นหาที่นั่งทำงาน →'),true)}</div>
      <p id="day-work-help" class="day-source"></p>
      <section class="day-examples"><h2>${tr('Check admission before you go','เช็กเงื่อนไขก่อนออกเดินทาง')}</h2><ul>
        <li>${link('/?p=o78f6308fa1ba','TCDC Bangkok')} ${tr('· ฿100 day pass listed by the venue.','· ศูนย์ฯ ระบุค่าบัตรรายวัน 100 บาท')} ${link('https://library.tcdc.or.th/page/service',tr('Source ↗','แหล่งข้อมูล ↗'))}</li>
        <li>${link('/?p=n5283277354',tr('BACC Art Library','ห้องสมุดศิลปะ หอศิลปกรุงเทพฯ'))} ${tr('· Wi-Fi instructions ask for a national ID card. Ask staff if you use a passport.','· การขอรหัส Wi-Fi ระบุให้แสดงบัตรประชาชน หากใช้หนังสือเดินทางให้สอบถามเจ้าหน้าที่')} ${link('https://www.bacc.or.th/en/plan-your-visit/art-library/',tr('Source ↗','แหล่งข้อมูล ↗'))}</li>
      </ul></section>`;
    byId('day-minutes').value = '120';
    const render = () => {
      const mode = byId('day-mode').value;
      const start = byId('day-start');
      start.disabled = mode === 'rail';
      const area = areas.find(a => a.id === start.value);
      const query = { task:byId('day-work').value, minutes:byId('day-minutes').value };
      if (area && mode !== 'rail') query.at = areaAt(area);
      byId('day-find').href = mapURL(mode, query);
      byId('day-work-help').textContent = mode === 'rail'
        ? tr('Choose your station in the finder. Distances are straight lines.','เลือกสถานีในหน้าค้นหา ระยะทางที่แสดงเป็นระยะเส้นตรง')
        : tr('The finder distinguishes documented facilities from ones to check. Travel time is extra.','หน้าค้นหาแยกสิ่งอำนวยความสะดวกที่มีข้อมูลออกจากสิ่งที่ต้องสอบถาม เวลาเดินทางยังไม่รวม');
    };
    node.querySelector('.day-fields').onchange = render;
    render();
  }

  const node = byId('day-task');
  async function load() {
    node.setAttribute('aria-busy','true');
    node.innerHTML = `<p role="status">${tr('Loading neighbourhoods…','กำลังโหลดย่าน…')}</p>`;
    try {
      const data = await get('/data/day-areas.json');
      if (!data.areas?.length) throw new Error('Missing areas');
      ({live:compare,today,work})[task](node, data.areas, data.source);
    } catch {
      node.innerHTML = `<p role="status">${tr('Neighbourhood data is unavailable.','ยังเปิดข้อมูลย่านไม่ได้')}</p><div class="day-actions"><button type="button" class="day-retry">${tr('Try again','ลองอีกครั้ง')}</button>${link('/?plan=nearby',tr('Open the work finder','เปิดหน้าค้นหาที่ทำงาน'))}</div>`;
      node.querySelector('button').onclick = load;
    } finally { node.setAttribute('aria-busy','false'); }
  }

  async function stamps() {
    try {
      const [visits, {hoods}, aliases] = await Promise.all([Passport.visitedPlaces(), get('/data/hoods.json'), get('/data/aliases.json')]);
      const visited = new Set(visits.map(id => Object.hasOwn(aliases, id) ? aliases[id] : id));
      const earned = hoods.filter(hood => hood.ids.some(id => visited.has(id))).length;
      byId('day-stamp-status').textContent = tr(`${earned} of ${hoods.length} stamps on this device.`, `ได้รับ ${earned} จาก ${hoods.length} ตราประทับในอุปกรณ์นี้`);
    } catch {
      byId('day-stamp-status').textContent = tr('This device’s stamps could not be read.','ยังอ่านตราประทับในอุปกรณ์นี้ไม่ได้');
    }
  }
  load();
  stamps();
  addEventListener('pageshow', event => { if (event.persisted) stamps(); });
})();
