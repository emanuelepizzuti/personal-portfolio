/* ─── Config ─────────────────────────────────────────────────────────────── */
// Fill these in before deploying.

const CONFIG = {
  // After publishing your Google Sheet as CSV (see README), paste the URL here.
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTiNoGU6wb6qQE8OSTQGolNp9DSl2ic_RFhMn_B9QiVf8rtzKjuSfAeuYcwfPz91zBK148DiPY4Y-Uu/pub?gid=0&single=true&output=csv',

  // Your tagline shown in the header center.
  TAGLINE: 'no',

  // Social links — fill in your handles.
  LINKEDIN:  'https://www.linkedin.com/in/emanuelepizzuti/',
  INSTAGRAM: 'https://www.instagram.com/data.piz/',
  BEHANCE:   'https://www.behance.net/emanuelepizzuti',
  EMAIL:     'mailto:emanuele.pizzuti96@gmail.com',

  // Footer ticker text.
  TICKER: 'weeeeeeeeeebsite under constructiooooooooooon ✦ ',

  // Short bio shown when the site-name is clicked.
  BIO: 'Designer and data visualizer based in Italy. Working at the intersection of information design, visual language, and interactive systems.',
};

/* ─── Sample data (used when SHEET_URL is empty) ─────────────────────────── */

const SAMPLE_PROJECTS = [
  { name: 'Forma Studio',  url: '#', platform: 'Behance',   fields: ['Branding', 'Typography'] },
  { name: 'Luce Series',   url: '#', platform: 'Instagram', fields: ['Photography', 'Art Direction'] },
  { name: 'Grid System',   url: '#', platform: 'Behance',   fields: ['UI/UX', 'Typography'] },
  { name: 'Volta Campaign',url: '#', platform: 'Behance',   fields: ['Branding', 'Motion', 'Art Direction'] },
  { name: 'Notte',         url: '#', platform: 'Instagram', fields: ['Photography', 'Motion'] },
  { name: 'Surface Kit',   url: '#', platform: 'Behance',   fields: ['UI/UX', 'Illustration'] },
];

/* ─── State ──────────────────────────────────────────────────────────────── */

let projects = [];
let graphNodes = [], graphLinks = [];
let nodeSelection, linkSelection;
let selectedNodes = new Set();

/* ─── Boot ───────────────────────────────────────────────────────────────── */

(async function init() {
  applyConfig();
  projects = await loadProjects();
  renderSidebar(projects);
  renderGraph(projects);
})();

/* ─── Config application ──────────────────────────────────────────────────── */

function applyConfig() {
  document.getElementById('tagline').textContent = CONFIG.TAGLINE;

  document.getElementById('link-linkedin').href  = CONFIG.LINKEDIN;
  document.getElementById('link-instagram').href = CONFIG.INSTAGRAM;
  document.getElementById('link-behance').href   = CONFIG.BEHANCE;
  document.getElementById('link-email').href     = CONFIG.EMAIL;

  // Build marquee text (duplicated for seamless loop)
  const ticker = CONFIG.TICKER.repeat(12);
  document.querySelectorAll('.marquee-text').forEach(el => {
    el.textContent = ticker;
  });

  setupBio();
}

/* ─── Bio panel ──────────────────────────────────────────────────────────── */

function setupBio() {
  const nameEl   = document.getElementById('site-name');
  const panel    = document.getElementById('bio-panel');
  const bioText  = document.getElementById('bio-text');
  const closeBtn = document.getElementById('bio-close');

  bioText.textContent = CONFIG.BIO;

  let panelOpen = false;

  nameEl.addEventListener('mouseenter', () => {
    nameEl.textContent = 'Who is Emanuele Pizzuti?';
  });

  nameEl.addEventListener('mouseleave', () => {
    if (!panelOpen) nameEl.textContent = 'Emanuele Pizzuti';
  });

  function closeBio() {
    panelOpen = false;
    panel.classList.add('bio-panel--hidden');
    nameEl.textContent = 'Emanuele Pizzuti';
  }

  nameEl.addEventListener('click', () => {
    if (panelOpen) { closeBio(); return; }
    panelOpen = true;
    panel.classList.remove('bio-panel--hidden');
  });

  closeBtn.addEventListener('click', closeBio);
}

/* ─── Data loading ───────────────────────────────────────────────────────── */

async function loadProjects() {
  if (!CONFIG.SHEET_URL) return SAMPLE_PROJECTS;

  return new Promise(resolve => {
    Papa.parse(CONFIG.SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete({ data }) {
        const parsed = data
          .map(row => ({
            name:      (row['name']      || row['Project Name'] || '').trim(),
            url:       (row['url']       || row['URL']          || '#').trim(),
            platform:  (row['platform']  || row['Platform']     || '').trim(),
            fields:    parseFields(row['fields'] || row['Fields'] || ''),
            description:(row['description'] || row['Description'] || '').trim(),
            thumbnail: (row['thumbnail'] || row['Thumbnail URL'] || '').trim(),
          }))
          .filter(p => p.name);
        resolve(parsed.length ? parsed : SAMPLE_PROJECTS);
      },
      error() { resolve(SAMPLE_PROJECTS); },
    });
  });
}

function parseFields(raw) {
  return raw.split(',').map(f => f.trim()).filter(Boolean);
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */

function renderSidebar(data) {
  const aside = document.getElementById('project-list');
  aside.innerHTML = '';

  data.forEach(project => {
    const a = document.createElement('a');
    a.className = 'project-btn';
    a.href = project.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = `
      <div class="project-btn-name">${escHtml(project.name)}</div>
      <div class="project-btn-platform">Explore on ${escHtml(project.platform)} -></div>
    `;
    a.dataset.fields = JSON.stringify(project.fields);

    a.addEventListener('mouseenter', () => { if (selectedNodes.size === 0) highlight(project.fields); });
    a.addEventListener('mouseleave', () => { if (selectedNodes.size === 0) clearHighlight(); });
    a.addEventListener('focus',      () => { if (selectedNodes.size === 0) highlight(project.fields); });
    a.addEventListener('blur',       () => { if (selectedNodes.size === 0) clearHighlight(); });

    aside.appendChild(a);
  });
}

/* ─── Graph ──────────────────────────────────────────────────────────────── */

function buildGraphData(data) {
  const fieldCount = new Map();
  data.forEach(p => p.fields.forEach(f => fieldCount.set(f, (fieldCount.get(f) || 0) + 1)));

  graphNodes = Array.from(fieldCount.entries()).map(([id, count]) => ({ id, count }));

  // Count how many projects each pair of fields shares (link weight)
  const linkWeights = new Map();
  data.forEach(p => {
    const fs = p.fields;
    for (let i = 0; i < fs.length; i++) {
      for (let j = i + 1; j < fs.length; j++) {
        const key = [fs[i], fs[j]].sort().join('\x00');
        linkWeights.set(key, (linkWeights.get(key) || 0) + 1);
      }
    }
  });

  graphLinks = Array.from(linkWeights.entries()).map(([key, weight]) => {
    const [source, target] = key.split('\x00');
    return { source, target, weight };
  });
}

function renderGraph(data) {
  buildGraphData(data);

  const section = document.getElementById('graph-section');
  const svg = d3.select('#graph');
  svg.selectAll('*').remove();

  if (!graphNodes.length) {
    document.getElementById('graph-empty').classList.remove('hidden');
    return;
  }

  const W = section.clientWidth;
  const H = section.clientHeight;

  svg.attr('width', W).attr('height', H);

  const maxCount  = Math.max(...graphNodes.map(n => n.count));
  const maxWeight = Math.max(...graphLinks.map(l => l.weight), 1);

  // Sqrt scale: node radius proportional to area, not radius
  const rScale = d3.scaleSqrt().domain([1, Math.max(maxCount, 2)]).range([16, 48]);

  // More shared projects → shorter distance (closer nodes)
  const distScale = d3.scaleLinear().domain([1, maxWeight]).range([180, 60]);

  const sim = d3.forceSimulation(graphNodes)
    .force('link',      d3.forceLink(graphLinks).id(d => d.id).distance(l => distScale(l.weight)).strength(0.5))
    .force('charge',    d3.forceManyBody().strength(d => -80 / d.count))
    .force('center',    d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide().radius(d => {
      const r          = rScale(d.count);
      const labelHalfW = (d.id.length * 7 + 16) / 2; // approx half-width of text label
      const labelBaseY = r + 60;                       // distance from centre to label bottom
      // Euclidean distance from node centre to label corner, plus a small gap
      return Math.sqrt(labelHalfW * labelHalfW + labelBaseY * labelBaseY) + 8;
    }))
    .velocityDecay(0.75)
    .stop();

  // Pre-warm to convergence
  for (let i = 0; i < 300; i++) sim.tick();

  // Snapshot resting positions so cursor attraction has somewhere to return to
  graphNodes.forEach(node => { node.restX = node.x; node.restY = node.y; });

  const g = svg.append('g');

  linkSelection = g.append('g').selectAll('line')
    .data(graphLinks)
    .join('line')
    .attr('class', 'link');

  nodeSelection = g.append('g').selectAll('g')
    .data(graphNodes)
    .join('g')
    .attr('class', 'node');

  nodeSelection.append('circle')
    .attr('r', d => rScale(d.count));

  nodeSelection.append('text')
    .attr('dy', d => rScale(d.count) + 18)
    .text(d => d.id);

  function render() {
    linkSelection
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    nodeSelection.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  sim.on('tick', () => {
    graphNodes.forEach(node => { node.restX = node.x; node.restY = node.y; });
    render();
  });
  render();
  sim.alpha(0.3).restart();

  // ── Cursor attraction via independent RAF ──────────────────────────────
  // Runs completely outside the D3 simulation so it never heats up the
  // physics engine — no charge/repulsion runs, no rotation possible.
  let cursorX = W / 2, cursorY = H / 2;
  let cursorActive = false;
  let cursorRaf = null;

  function cursorFrame() {
    graphNodes.forEach(node => {
      const dx   = cursorX - node.x;
      const dy   = cursorY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const pull = 0.02 / (1 + dist * 0.01);
      node.x += dx * pull;
      node.y += dy * pull;
      // Spring back toward resting position
      node.x += (node.restX - node.x) * 0.06;
      node.y += (node.restY - node.y) * 0.06;
    });
    render();
    cursorRaf = requestAnimationFrame(cursorFrame);
  }

  svg.on('mousemove', (event) => {
    [cursorX, cursorY] = d3.pointer(event);
    if (!cursorActive) {
      cursorActive = true;
      cursorRaf = requestAnimationFrame(cursorFrame);
    }
  });

  svg.on('mouseleave', () => {
    cursorActive = false;
    if (cursorRaf) { cancelAnimationFrame(cursorRaf); cursorRaf = null; }
  });

  // Node click → single select (click same node again to deselect)
  nodeSelection.on('click', (event, d) => {
    event.stopPropagation();
    if (selectedNodes.has(d.id)) {
      selectedNodes.clear();
    } else {
      selectedNodes.clear();
      selectedNodes.add(d.id);
    }
    applySelection();
  });

  // Click outside graph → reset filter
  svg.on('click', () => {
    selectedNodes.clear();
    applySelection();
  });

  // Drag to reposition nodes
  nodeSelection.call(
    d3.drag()
      .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end',   (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
  );

  // Resize handling
  const ro = new ResizeObserver(() => {
    const w = section.clientWidth;
    const h = section.clientHeight;
    svg.attr('width', w).attr('height', h);
    sim.force('center', d3.forceCenter(w / 2, h / 2)).alpha(0.2).restart();
  });
  ro.observe(section);
}

/* ─── Highlight ──────────────────────────────────────────────────────────── */

function highlight(activeFields) {
  if (!nodeSelection) return;
  const active = new Set(activeFields);

  nodeSelection.classed('is-active', d => active.has(d.id))
               .classed('is-dimmed', d => !active.has(d.id));

  linkSelection.classed('is-active', d => active.has(d.source.id) && active.has(d.target.id))
               .classed('is-dimmed', d => !(active.has(d.source.id) && active.has(d.target.id)));
}

function clearHighlight() {
  if (!nodeSelection) return;
  nodeSelection.classed('is-active', false).classed('is-dimmed', false).classed('is-selected', false);
  linkSelection.classed('is-active', false).classed('is-dimmed', false).classed('is-selected', false);
}

function applySelection() {
  if (selectedNodes.size === 0) {
    clearHighlight();
    document.querySelectorAll('.project-btn').forEach(el => {
      el.classList.remove('is-filtered-out');
      el.classList.remove('is-filtered-in');
    });
    return;
  }

  const litNodes = selectedNodes;

  nodeSelection
    .classed('is-active',   d => litNodes.has(d.id))
    .classed('is-dimmed',   d => !litNodes.has(d.id))
    .classed('is-selected', d => selectedNodes.has(d.id));

  linkSelection
    .classed('is-active', d => litNodes.has(d.source.id) && litNodes.has(d.target.id))
    .classed('is-dimmed', d => !(litNodes.has(d.source.id) && litNodes.has(d.target.id)));

  // Filter sidebar: matching buttons slide right, non-matching fade
  document.querySelectorAll('.project-btn').forEach(el => {
    const fields = JSON.parse(el.dataset.fields || '[]');
    const matches = fields.some(f => litNodes.has(f));
    el.classList.toggle('is-filtered-out', !matches);
    el.classList.toggle('is-filtered-in',  matches);
  });
}

/* ─── Utility ────────────────────────────────────────────────────────────── */

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
