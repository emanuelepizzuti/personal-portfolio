/* ─── Config ─────────────────────────────────────────────────────────────── */
// Fill these in before deploying.

const CONFIG = {
  // After publishing your Google Sheet as CSV (see README), paste the URL here.
  SHEET_URL: '',

  // Your tagline shown in the header center.
  TAGLINE: 'designer & creative',

  // Social links — fill in your handles.
  LINKEDIN:  'https://linkedin.com/in/YOUR_HANDLE',
  INSTAGRAM: 'https://instagram.com/YOUR_HANDLE',
  BEHANCE:   'https://behance.net/YOUR_HANDLE',
  EMAIL:     'mailto:emanuele.pizzuti96@gmail.com',

  // Footer ticker text.
  TICKER: 'website under construction ✦ ',
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
      ${project.platform ? `<div class="project-btn-meta">${escHtml(project.platform)}</div>` : ''}
    `;

    a.addEventListener('mouseenter', () => highlight(project.fields));
    a.addEventListener('mouseleave', clearHighlight);
    a.addEventListener('focus',      () => highlight(project.fields));
    a.addEventListener('blur',       clearHighlight);

    aside.appendChild(a);
  });
}

/* ─── Graph ──────────────────────────────────────────────────────────────── */

function buildGraphData(data) {
  const fieldCount = new Map();
  data.forEach(p => p.fields.forEach(f => fieldCount.set(f, (fieldCount.get(f) || 0) + 1)));

  graphNodes = Array.from(fieldCount.entries()).map(([id, count]) => ({ id, count }));

  const seen = new Set();
  graphLinks = [];
  data.forEach(p => {
    const fs = p.fields;
    for (let i = 0; i < fs.length; i++) {
      for (let j = i + 1; j < fs.length; j++) {
        const key = [fs[i], fs[j]].sort().join('\x00');
        if (!seen.has(key)) {
          seen.add(key);
          graphLinks.push({ source: fs[i], target: fs[j] });
        }
      }
    }
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

  const maxCount = Math.max(...graphNodes.map(n => n.count));
  const rScale = d3.scaleLinear().domain([1, Math.max(maxCount, 2)]).range([8, 26]);

  const sim = d3.forceSimulation(graphNodes)
    .force('link',      d3.forceLink(graphLinks).id(d => d.id).distance(90).strength(0.6))
    .force('charge',    d3.forceManyBody().strength(-220))
    .force('center',    d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide().radius(d => rScale(d.count) + 22));

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
    .attr('dy', d => rScale(d.count) + 14)
    .text(d => d.id);

  sim.on('tick', () => {
    linkSelection
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    nodeSelection.attr('transform', d => `translate(${d.x},${d.y})`);
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
  nodeSelection.classed('is-active', false).classed('is-dimmed', false);
  linkSelection.classed('is-active', false).classed('is-dimmed', false);
}

/* ─── Utility ────────────────────────────────────────────────────────────── */

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
