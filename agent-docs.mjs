// The documentation as AI agents read it. Run before every vitepress dev/build (package.json).
//
// The same file is in docs-skapi-py, docs-skapi-swift and docs-skapi-kotlin; what differs per
// site is in .vitepress/site.mjs (origin, SDK, sidebar). docs-skapi-js has its own, larger
// agent-docs.mjs (it also builds SKAPI-full.md and pins the skapi-js version); the link and id
// rules below are the same as there.
//
// Writes into public/, which VitePress copies to the site root, so every file is served raw:
//
//   SKAPI.md      the base prompt: SYSTEM.md with the Skapi SDKs list, the documentation map
//                 and the SDK method index filled in, every entry linking to a page under /md/.
//                 Small on purpose: tools load it on every turn (CLAUDE.md, AGENTS.md ...), and
//                 Codex reads at most 32 KiB of AGENTS.md, so the build fails past 30,000 bytes.
//   md/<key>.md   one raw markdown file per page of the site, sidebar or not, cross-links as
//                 absolute /md/ urls.
//   llms.txt      the list of all of the above (https://llmstxt.org).
//
// Ids: every page gets one (doc-database-create), and a heading gets one (doc-database-create-x)
// only when a link points at it. A link to a page of this site becomes that page's /md/ url;
// external urls, and everything inside code, are left exactly as written.
import fs from 'fs';
import path from 'path';
import { ORIGIN, SDK_ID, SDK_NAME, SITE_TITLE, sidebar } from './.vitepress/site.mjs';
import { SDK_PLATFORMS, sdkPlatformsMarkdown } from './.vitepress/theme/sdk-platforms.mjs';

const OUT_DIR = './public';
const PAGES_DIR = 'md';
const PROMPT_FILE = 'SKAPI.md';
const PROMPT_MAX_BYTES = 30000;
/** Folders that hold no documentation page, and markdown files that are not pages. */
const NOT_PAGES = new Set(['node_modules', 'public', '.vitepress', '.claude', '.git']);
const NOT_A_PAGE = new Set(['/SYSTEM.md', '/README.md']);
/** The sidebar group whose pages make the method index. */
const REFERENCE_GROUP = 'API Reference';

/* ────────────────────────────── pages and keys ────────────────────────────── */

function linksOf(tree) {
    let links = [];
    let walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== 'object') return;
        if (typeof node.link === 'string') links.push(node.link);
        if (node.items) walk(node.items);
    };
    walk(tree);
    return links;
}

/** Every markdown page of the site, as site paths ('/database/create.md'), sidebar or not. */
function sitePages(dir = '.') {
    let out = [];
    for (let entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!NOT_PAGES.has(entry.name) && !entry.name.startsWith('.')) out.push(...sitePages(path.posix.join(dir, entry.name)));
        } else if (/\.md$/i.test(entry.name)) {
            let sitePath = '/' + path.posix.relative('.', path.posix.join(dir, entry.name));
            if (!NOT_A_PAGE.has(sitePath)) out.push(sitePath);
        }
    }
    return out.sort();
}

/** '/api-reference/' -> 'api-reference', '/database/create' or '/database/create.md' -> 'database/create' */
function pageKey(sitePath) {
    return sitePath
        .replace(/^\/+/, '')
        .replace(/\.(md|html)$/i, '')
        .replace(/(^|\/)index$/i, '')
        .replace(/\/+$/, '');
}

/** The markdown file a sidebar link or a page link names: '/x' -> '/x.md', '/x/' -> '/x/index.md'. */
function fileOf(link) {
    let p = link.split('#')[0];
    if (/\.md$/i.test(p)) return p;
    if (/\.html$/i.test(p)) return p.replace(/\.html$/i, '.md');
    if (p.endsWith('/')) return p + 'index.md';
    return fs.existsSync('.' + p + '.md') ? p + '.md' : p + '/index.md';
}

function pageId(key) {
    return 'doc-' + key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function pageUrl(key) {
    return `${ORIGIN}/${PAGES_DIR}/${key}.md`;
}

/* ────────────────────────────── markdown helpers ────────────────────────────── */

/** The heading slug VitePress gives a heading (@mdit-vue/shared slugify). */
function slugifyHeading(str) {
    return str
        .normalize('NFKD')
        .replace(/[\u0300-\u036F]/g, '')
        .replace(/[\u0000-\u001f]/g, '')
        .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/^(\d)/, '_$1')
        .toLowerCase();
}

/** The text a heading is slugged from: its plain text and the content of its code spans. */
function headingText(raw) {
    let codes = [];
    let text = raw
        .replace(/\s+#+\s*$/, '')
        .replace(/(`+)(.+?)\1/g, (m, ticks, code) => {
            codes.push(code.trim());
            return `\u0000${codes.length - 1}\u0000`;
        })
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/\\([\\`*_{}[\]()#+\-.!|<>~])/g, '$1')
        .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')
        .replace(/(^|[^\w*])[*_]([^*_]+)[*_](?=[^\w*]|$)/g, '$1$2')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    return text.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[+i]);
}

/** Calls onLine(line, index) for every line that is NOT inside a fenced code block. */
function eachProseLine(lines, onLine) {
    let fence = null;
    lines.forEach((line, i) => {
        let m = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
        if (fence) {
            if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !m[2].trim()) fence = null;
            return;
        }
        if (m) {
            fence = m[1];
            return;
        }
        onLine(line, i);
    });
}

function stripFrontmatter(text) {
    return text.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, '');
}

/** Vue components render on the website only: report any that would reach the agent as a bare tag. */
function renderComponents(text, sitePath, report) {
    let lines = text.split(/\r?\n/);
    eachProseLine(lines, (line) => {
        let stray = line.match(/<([A-Z][A-Za-z]+)\b[^>]*\/>/);
        if (stray) report.warnings.push(`${sitePath}: component <${stray[1]}> is not rendered for agents`);
    });
    return text;
}

function loadPage(sitePath, report, text) {
    let key = pageKey(sitePath);
    let raw = text === undefined ? fs.readFileSync('.' + sitePath, 'utf-8') : text;
    let lines = renderComponents(stripFrontmatter(raw), sitePath, report).split(/\r?\n/);
    let headings = [];
    let taken = {};
    eachProseLine(lines, (line, i) => {
        let m = line.match(/^ {0,3}(#{1,6})[ \t]+(.*)$/);
        if (!m) return;
        let text = headingText(m[2]);
        let base = slugifyHeading(text);
        let slug = base;
        for (let n = 1; taken[slug]; n++) slug = `${base}-${n}`;
        taken[slug] = true;
        headings.push({ line: i, slug, level: m[1].length, text });
    });
    return { sitePath, key, id: pageId(key), lines, headings, slugs: taken };
}

/* ────────────────────────────── links and ids ────────────────────────────── */

/** Rewrites every link of every page to this set's /md/ urls and writes the ids they need. Sets p.out. */
function buildPages(pages, report) {
    let byKey = {};
    let idOwner = {};
    for (let p of pages) {
        if (p.key) byKey[p.key.toLowerCase()] = p;
        p.out = p.lines.slice();
        p.wanted = new Set();
    }

    // SYSTEM.md has no page id: its headings are the file's own, so their slug is their id.
    let idOf = (page, frag) => (page.id ? `${page.id}-${frag}` : frag);
    let hrefOf = (page, frag) => (page.key ? pageUrl(page.key) : '') + (frag ? `#${idOf(page, frag)}` : '');
    let fragmentOf = (page, hash) => {
        if (!hash) return null;
        let frag;
        try { frag = decodeURIComponent(hash); } catch (err) { frag = hash; }
        frag = frag.toLowerCase();
        return page.slugs[frag] ? frag : null;
    };

    let resolve = (page, target) => {
        if (target.startsWith(ORIGIN + '/')) {
            let sitePath = target.slice(ORIGIN.length).split('#')[0];
            if (!byKey[pageKey(sitePath).toLowerCase()]) return null;
            target = target.slice(ORIGIN.length);
        }
        if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) return null;   // external: as is

        let [rawPath, hash = ''] = target.split('#');
        if (!rawPath) {
            let frag = fragmentOf(page, hash);
            if (!frag) {
                report.warnings.push(`${page.sitePath}: "#${hash}" is not a heading of this page`);
                return page.id ? hrefOf(page) : null;
            }
            page.wanted.add(frag);
            return (page.key ? pageUrl(page.key) : '') + '#' + idOf(page, frag);
        }

        let sitePath = rawPath.startsWith('/')
            ? path.posix.normalize(rawPath)
            : path.posix.normalize(path.posix.join('/', path.posix.dirname(page.sitePath), rawPath));
        let ext = path.posix.extname(sitePath).toLowerCase();
        if (ext && ext !== '.md' && ext !== '.html') return ORIGIN + sitePath;             // an image or a download

        let dest = byKey[pageKey(sitePath).toLowerCase()];
        if (!dest) {
            report.warnings.push(`${page.sitePath}: "${target}" is not a page of this site`);
            return null;
        }
        report.internal++;
        if (!hash) return hrefOf(dest);
        let frag = fragmentOf(dest, hash);
        if (!frag) {
            report.warnings.push(`${page.sitePath}: "${target}" names a heading that ${dest.sitePath} does not have`);
            return hrefOf(dest);
        }
        dest.wanted.add(frag);
        return hrefOf(dest, frag);
    };

    for (let p of pages) {
        eachProseLine(p.lines, (line, i) => {
            if (!line.includes('](')) return;
            p.out[i] = line.split(/(`+[^`]*`+)/).map((part, n) => {
                if (n % 2) return part;
                return part.replace(/\]\((\s*)([^)\s]+)((?:\s+"[^"]*")?\s*)\)/g, (m, lead, target, title) => {
                    let to = resolve(p, target);
                    return to === null ? m : `](${lead}${to}${title})`;
                });
            }).join('');
        });
    }

    for (let p of pages) {
        let ids = {};
        if (p.id && p.headings.length) ids[p.headings[0].line] = [p.id];
        for (let h of p.headings) {
            if (p.wanted.has(h.slug)) (ids[h.line] = ids[h.line] || []).push(idOf(p, h.slug));
        }
        for (let line in ids) {
            for (let id of ids[line]) {
                if (idOwner[id]) report.warnings.push(`id "${id}" is used by both ${idOwner[id]} and ${p.sitePath}`);
                idOwner[id] = p.sitePath;
            }
            p.out[line] = p.out[line].replace(/\s+$/, '') + ' ' + ids[line].map((id) => `<a id="${id}"></a>`).join('');
        }
        if (p.id && !p.headings.length) p.out.unshift(`<a id="${p.id}"></a>`, '');
    }
}

/** Runs of blank lines are layout for a person. An agent pays for each. */
function compact(text) {
    return text.replace(/<br>/g, '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '') + '\n';
}

/* ────────────────────────────── generated sections ────────────────────────────── */

/** The sidebar as links to the raw pages. */
function documentationMap(byKey) {
    let out = [];
    let walk = (nodes, depth) => {
        for (let node of nodes) {
            let label = node.text;
            if (node.link) {
                let p = byKey[pageKey(fileOf(node.link))];
                if (!p) throw new Error(`documentation map: ${node.link} is not a loaded page`);
                label = `[${node.text}](${pageUrl(p.key)})`;
            }
            out.push(`${'  '.repeat(depth)}- ${label}`);
            if (node.items) walk(node.items, depth + 1);
        }
    };
    walk(sidebar, 0);
    return out.join('\n');
}

/**
 * Every "## name" of the reference pages, grouped by page, one link per page. Only headings that
 * are a name (a method, a property or a type): "## Common errors" and the like are sections.
 */
function methodIndex(byKey) {
    let group = sidebar.find((g) => g.text === REFERENCE_GROUP);
    if (!group) throw new Error(`method index: no "${REFERENCE_GROUP}" group in the sidebar`);
    let out = [];
    for (let item of group.items) {
        if (item.link.endsWith('/')) continue;      // the overview page: its headings are links to the others
        let page = byKey[pageKey(fileOf(item.link))];
        if (!page) throw new Error(`method index: ${item.link} is not a loaded page`);
        let names = page.headings.filter((h) => h.level === 2 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(h.text)).map((h) => h.text);
        if (!names.length) continue;
        out.push(`### [${item.text}](${pageUrl(page.key)})`, names.join(', '));
    }
    return out.join('\n');
}

function llmsTxt(sidebarPages, others) {
    let byKey = Object.fromEntries([...sidebarPages, ...others].map((p) => [p.key, p]));
    let line = (text, key) => `- [${text}](${pageUrl(key)})`;
    let out = [
        `# ${SITE_TITLE}`,
        '',
        `> ${SDK_NAME}: ${SDK_PLATFORMS.find((p) => p.id === SDK_ID).use}. Every page below is raw markdown; the same page is at the same path with .html instead of /md/ and .md, for a browser.`,
        '',
        '## Start here',
        '',
        `- [${PROMPT_FILE}](${ORIGIN}/${PROMPT_FILE}): the base prompt for AI coding agents. Rules, the documentation map and the index of every ${SDK_NAME} method, each linking to its page below. Read this one first, then the pages a task needs.`,
    ];
    for (let node of sidebar) {
        out.push('', `## ${node.text}`, '');
        for (let item of node.items || [node]) out.push(line(item.text, byKey[pageKey(fileOf(item.link))].key));
    }
    let more = others.map((p) => {
        let h = p.headings.find((h) => h.level === 1);
        return line(h ? h.text : p.key, p.key);
    });
    if (more.length) out.push('', '## Other pages', '', ...more);
    out.push('', '## Base prompts for the other Skapi SDKs', '',
        ...SDK_PLATFORMS.filter((p) => p.prompt !== `${ORIGIN}/${PROMPT_FILE}`)
            .filter((p, i, all) => all.findIndex((q) => q.prompt === p.prompt) === i)
            .map((p) => `- [${p.prompt.includes('docs.skapi.com') ? 'skapi-js' : p.sdk}](${p.prompt}): for ${p.prompt.includes('docs.skapi.com') ? 'web apps and Node.js programs' : p.use}.`),
        '');
    return out.join('\n');
}

/** Every /md/ link in the prompt must land: the file exists, and the fragment is an id in it. */
function checkPromptLinks(prompt, written) {
    let errors = [];
    let re = new RegExp(`\\]\\(${ORIGIN.replace(/[.]/g, '\\.')}/${PAGES_DIR}/([^)#\\s]+)\\.md(?:#([^)\\s]+))?\\)`, 'g');
    let count = 0;
    for (let m of prompt.matchAll(re)) {
        count++;
        let text = written[m[1]];
        if (text === undefined) { errors.push(`${m[1]}.md is linked but not written`); continue; }
        if (m[2] && !text.includes(`<a id="${m[2]}"></a>`)) errors.push(`${m[1]}.md has no id "${m[2]}"`);
    }
    return { count, errors };
}

/* ────────────────────────────── build ────────────────────────────── */

function build() {
    let report = { internal: 0, warnings: [], skipped: [] };
    let sidebarFiles = [...new Set(linksOf(sidebar).map(fileOf))];
    let sidebarPages = sidebarFiles.map((f) => loadPage(f, report));
    let listed = new Set(sidebarPages.map((p) => p.key));
    let others = sitePages().filter((sp) => !listed.has(pageKey(sp))).map((sp) => loadPage(sp, report));
    let empty = others.filter((p) => !p.lines.some((l) => l.trim()));
    others = others.filter((p) => !empty.includes(p));
    for (let p of empty) report.skipped.push(`${p.sitePath}: no body besides frontmatter, not written`);
    let all = [...sidebarPages, ...others];
    let byKey = Object.fromEntries(all.map((p) => [p.key, p]));

    let systemText = fs.readFileSync('./SYSTEM.md', 'utf-8')
        .replace('<!-- SKAPI_SDKS -->', sdkPlatformsMarkdown(SDK_ID))
        .replace('<!-- DOCUMENTATION_MAP -->', documentationMap(byKey))
        .replace('<!-- METHOD_INDEX -->', methodIndex(byKey));
    let prompt = loadPage('/SYSTEM.md', report, systemText);
    prompt.key = prompt.id = '';
    buildPages([prompt, ...all], report);

    fs.mkdirSync(path.join(OUT_DIR, PAGES_DIR), { recursive: true });
    for (let stale of fs.readdirSync(path.join(OUT_DIR, PAGES_DIR))) {
        fs.rmSync(path.join(OUT_DIR, PAGES_DIR, stale), { recursive: true, force: true });
    }
    let written = {};
    for (let p of all) {
        let file = path.join(OUT_DIR, PAGES_DIR, p.key + '.md');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        written[p.key] = compact(p.out.join('\n'));
        fs.writeFileSync(file, written[p.key]);
    }
    let promptText = compact(prompt.out.join('\n'));
    fs.writeFileSync(path.join(OUT_DIR, PROMPT_FILE), promptText);
    fs.writeFileSync(path.join(OUT_DIR, 'llms.txt'), llmsTxt(sidebarPages, others));

    let bytes = Buffer.byteLength(promptText);
    let links = checkPromptLinks(promptText, written);
    let failures = [...links.errors];
    if (bytes > PROMPT_MAX_BYTES) failures.push(`${PROMPT_FILE} is ${bytes} bytes; the limit is ${PROMPT_MAX_BYTES} (Codex reads 32 KiB of AGENTS.md)`);
    if (links.count < sidebarPages.length) failures.push(`${PROMPT_FILE} links ${links.count} pages; the map alone must link all ${sidebarPages.length} sidebar pages`);
    if (/<!-- [A-Z_]+ -->/.test(promptText)) failures.push(`${PROMPT_FILE} still has a placeholder: ${promptText.match(/<!-- [A-Z_]+ -->/)[0]}`);

    console.log(
        `Generated ${PROMPT_FILE} (${bytes} bytes, ${links.count} page links), ${all.length} pages under ${PAGES_DIR}/ `
        + `(${others.length} not on the sidebar) and llms.txt in ${OUT_DIR}/: ${report.internal} links kept inside the set.`
    );
    for (let w of [...new Set(report.warnings)]) console.warn('  link warning:', w);
    for (let w of report.skipped) console.log('  skipped:', w);
    if (failures.length) {
        for (let f of failures) console.error('  FAILED:', f);
        process.exit(1);
    }
}

build();
