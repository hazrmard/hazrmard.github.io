#!/usr/bin/env python3
"""One-time conversion of the filasteen post from data.json/taxonomies.json to
the geo-timeline schema v1.

    python3 tools/geotimeline/migrate.py content/post/filasteen

Writes timeline.yaml, events/*.timeline, facets.yaml, places.yaml,
periods.yaml, sources.yaml, series.yaml and threads.yaml into the post
directory. Existing files are overwritten. Everything the script guessed is
marked with a `TODO(migration)` comment for the author to review.

The inputs were deleted once the migration was done; they are in git history
(commit cc32820, `content/post/filasteen/data.json` and `taxonomies.json`).
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

# Old taxonomy key -> (new group, new key). Groups: actors, themes, threads.
TAXONOMY_MAP = {
    'ejews': ('actors', 'european-jewry'),
    'mjews': ('actors', 'mizrahi-jewry'),
    'usjews': ('actors', 'us-jewry'),
    'uk': ('actors', 'uk'),
    'us': ('actors', 'us'),
    'france': ('actors', 'france'),
    'ottomans': ('actors', 'ottoman-empire'),
    'zionism': ('actors', 'zionist-movement'),
    'israel': ('actors', 'israel'),
    'palestinians': ('actors', 'palestinians'),
    'leaguenations': ('actors', 'league-of-nations'),
    'un': ('actors', 'un'),
    'statistic_demographics': ('themes', 'demographics'),
    'statistic_casualties': ('themes', 'casualties'),
    'rhetoric_zionists': ('themes', 'rhetoric-zionist'),
    'rhetoric_palestinians': ('themes', 'rhetoric-palestinian'),
    'myth_empty_land': ('threads', 'empty-land'),
    'myth_ethnic_cleansing': ('threads', 'ethnic-cleansing'),
    'myth_colonialism': ('threads', 'zionism-colonialism'),
}

# Actors recognised in an entry's text (header + content) when the entry has
# no tag for them. Patterns are case-sensitive on purpose ("UN", "US").
AUTO_ACTORS = [
    ('haganah', r'\bHaganah\b'),
    ('palmach', r'\bPalmach\b'),
    ('irgun', r'\bIrgun\b'),
    ('lehi', r'\bLehi\b|\bStern Gang\b'),
    ('idf', r'\bIDF\b'),
    ('arab-liberation-army', r'Arab Liberation Army|\bALA\b'),
    ('arab-legion', r'\bArab Legion\b'),
    ('arab-league', r'\bArab League\b'),
    ('un', r'\bUN\b|United Nations|\bUNSC\b'),
    ('uk', r'\bBritish\b|\bBritain\b|\bUK\b'),
    ('us', r'\bUS\b|\bTruman\b'),
    ('ottoman-empire', r'\bOttoman'),
]

EXTRA_ACTORS = {
    'haganah': {'label': 'Haganah'},
    'palmach': {'label': 'Palmach', 'parent': 'haganah'},
    'irgun': {'label': 'Irgun'},
    'lehi': {'label': 'Lehi'},
    'idf': {'label': 'Israel Defense Forces'},
    'arab-liberation-army': {'label': 'Arab Liberation Army'},
    'arab-legion': {'label': 'Arab Legion'},
    'arab-league': {'label': 'Arab League'},
}

# key: (name, lat, lon, parent, region, aliases). Coordinates are approximate
# and must be verified; None means "no point of its own" (inherits parent's).
PLACES = {
    'palestine': ('Palestine', 31.6, 34.95, None, 'levant', [r'\bPalestine\b']),
    'jerusalem': ('Jerusalem', 31.7767, 35.2345, 'palestine', None, [r'\bJerusalem']),
    'sheikh-jarrah': ('Sheikh Jarrah', None, None, 'jerusalem', None, [r'Sheikh Jarrah']),
    'romema': ('Romema', None, None, 'jerusalem', None, [r'\bRomama\b|\bRomema\b']),
    'jaffa': ('Jaffa', 32.0504, 34.7522, 'palestine', None, [r'\bJaffa\b']),
    'tel-aviv': ('Tel Aviv', 32.0853, 34.7818, 'palestine', None, [r'\bTel Aviv\b']),
    'haifa': ('Haifa', 32.7940, 34.9896, 'palestine', None, [r'\bHaifa\b']),
    'wadi-rushmiya': ('Wadi Rushmiya', None, None, 'haifa', None, [r'Wadi Rushmiya']),
    'balad-al-sheikh': ('Balad al-Sheikh', 32.772, 35.045, 'palestine', None, [r'Balad al.Sheikh']),
    'gaza': ('Gaza', 31.5017, 34.4668, 'palestine', None, [r'\bGaza\b']),
    'acre': ('Acre', 32.9281, 35.0818, 'palestine', None, [r'\bAcre\b']),
    'tiberias': ('Tiberias', 32.7922, 35.5312, 'palestine', None, [r'\bTiberias\b']),
    'safad': ('Safad', 32.9646, 35.4960, 'palestine', None, [r'\bSafad\b']),
    'baysan': ('Baysan', 32.4971, 35.4964, 'palestine', None, [r'\bBaysan\b']),
    'lydda': ('Lydda', 31.9516, 34.8953, 'palestine', None, [r'\bLydda\b']),
    'ramle': ('Ramle', 31.9293, 34.8664, 'palestine', None, [r'\bRamle\b']),
    'rehovot': ('Rehovot', 31.8928, 34.8113, 'palestine', None, [r'\bRehovot\b']),
    'petah-tikva': ('Petah Tikva', 32.0871, 34.8875, 'palestine', None, [r'Petah Tikva']),
    'deir-yassin': ('Deir Yassin', 31.7862, 35.1790, 'palestine', None, [r'Deir Yassin']),
    'lifta': ('Lifta', 31.7950, 35.1980, 'palestine', None, [r'\bLifta\b']),
    'qisarya': ('Qisarya', 32.5000, 34.8940, 'palestine', None, [r'\bQisarya\b']),
    'sasa': ("Sa'sa", 33.0300, 35.3940, 'palestine', None, [r"\bSa'sa\b"]),
    'khisas': ('al-Khisas', 33.22, 35.62, 'palestine', None, [r'\bKhisas\b']),
    'faluja': ('al-Faluja', 31.6250, 34.7480, 'palestine', None, [r'\bFaluja\b']),
    'binyamina': ('Binyamina', 32.5200, 34.9500, 'palestine', None, [r'\bBinyamina\b']),
    'kefar-etzion': ('Kfar Etzion', 31.6530, 35.1170, 'palestine', None, [r'Kefar Etzion']),
    'kfar-szold': ('Kfar Szold', 33.1930, 35.6570, 'palestine', None, [r'Kefar Sold']),
    'lebanon': ('Lebanon', 33.85, 35.86, None, 'levant', [r'\bLebanon\b']),
    'basel': ('Basel', 47.5596, 7.5886, None, None, [r'\bBasel\b']),
    'paris': ('Paris', 48.8566, 2.3522, None, None, [r'\bParis\b']),
    'new-york': ('New York', 40.7128, -74.0060, None, None, [r'\bBiltmore\b']),
}

PERIODS_YAML = """\
# TODO(migration): draft periods. The old bgRender colours did not form
# coherent eras, so these are suggestions; adjust labels, dates and colours.
- id: ottoman
  label: Late Ottoman Palestine
  when: ../1917-12-09
  color: "#5b8fd6"
- id: british
  label: British rule
  when: 1917-12-09/1948-05-14
  color: "#4f9a5e"
- id: war-1947
  label: 1947–1949 war
  when: 1947-11-30/1949-07-20
  color: "#d08a2e"
"""


def slugify(text, max_words=5):
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c)).lower()
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
    words = re.sub(r'[^a-z0-9]+', ' ', text).split()
    return '-'.join(words[:max_words])


def q(value):
    """A YAML scalar that needs no escaping thought: JSON strings are YAML."""
    return json.dumps(value, ensure_ascii=False)


def when_of(entry, todos):
    start = (entry.get('datetime_start') or '').strip()
    end = (entry.get('datetime_end') or '').strip()
    if entry.get('datetime_start') and entry['datetime_start'] != start:
        todos.append('removed a leading space from the start date')
    if not start:
        todos.append(f'no start date in data.json (only datetime_end {end}); '
                     f'used the end date as `when`. Check the year: the surrounding entries are January 1948')
        start, end = end, ''

    def trim(d):
        # "YYYY-01-02" and "YYYY-01-01" were placeholders for "some time in YYYY".
        if re.fullmatch(r'\d{4}-01-0[12]', d):
            return d[:4]
        return d

    s, e = trim(start), trim(end)
    if s != start or (end and e != end):
        todos.append('date precision reduced to the year (was a -01-01/-01-02 placeholder)')
    return f'{s}/{e}' if e else s


def match_places(text):
    text = text.replace('Cairo-Haifa', '')
    found = [k for k, (_, _, _, _, _, aliases) in PLACES.items()
             if any(re.search(a, text) for a in aliases)]
    # Drop places that are ancestors of another match ("Romema … in Jerusalem").
    def ancestors(k):
        out = []
        while PLACES[k][3]:
            k = PLACES[k][3]
            out.append(k)
        return out
    covered = {a for k in found for a in ancestors(k)}
    return [k for k in found if k not in covered]


def first_heading(path):
    for line in path.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^#+\s+(.*)', line)
        if m:
            return m.group(1).strip()
    return None


def main(post):
    post = Path(post)
    data = json.loads((post / 'data.json').read_text(encoding='utf-8'))
    taxonomies = json.loads((post / 'taxonomies.json').read_text(encoding='utf-8'))

    used_ids = set()
    files = {'1878-1917': [], '1918-1946': [], '1947-1949': []}
    thread_members = {}

    for index, entry in enumerate(data):
        header = (entry.get('header') or '').strip()
        content = entry.get('content') or ''
        if content.strip() == 'null':
            content = ''
        if not header and not content.strip():
            continue  # the empty placeholder entry
        todos = []
        when = when_of(entry, todos)
        if index == 53:
            todos.append('dated 1948-12-28 but listed between December 1947 entries; check the year')

        groups = {'actors': [], 'themes': [], 'threads': []}
        for ref in entry.get('taxonomies') or []:
            group, key = TAXONOMY_MAP[ref]
            if key not in groups[group]:
                groups[group].append(key)

        text = f'{header}\n{content}'
        auto = [k for k, pattern in AUTO_ACTORS if re.search(pattern, text) and k not in groups['actors']]
        groups['actors'] += auto

        places = match_places(header)

        details = []
        for d in entry.get('details') or []:
            title = first_heading(post / d)
            details.append((d, title))

        year = int(when[:4])
        bucket = '1878-1917' if year <= 1917 else '1918-1946' if year <= 1946 else '1947-1949'
        base_id = f'{when.split("/")[0]}-{slugify(header)}'
        event_id, n = base_id, 2
        while event_id in used_ids:
            event_id, n = f'{base_id}-{n}', n + 1
        used_ids.add(event_id)
        for t in groups['threads']:
            thread_members.setdefault(t, []).append(event_id)

        lines = ['---']
        for todo in todos:
            lines.append(f'# TODO(migration): {todo}')
        lines.append(f'id: {event_id}')
        lines.append(f'when: {when}')
        if places:
            lines.append(f'where: [{", ".join(places)}]  # TODO(migration): matched from the title; verify')
        for group in ('actors', 'themes', 'threads'):
            values = groups[group]
            if values:
                comment = ''
                if group == 'actors' and auto:
                    comment = f'  # auto-tagged from text: {", ".join(auto)}'
                lines.append(f'{group}: [{", ".join(values)}]{comment}')
        if details:
            lines.append('details:')
            for src, title in details:
                lines.append(f'  - {{src: {src}, title: {q(title or "Details")}}}')
        lines.append('---')
        lines.append(f'## {header}')
        if content.strip():
            lines.append('')
            lines.append(content.strip())
        lines.append('')
        files[bucket].append('\n'.join(lines))

    (post / 'events').mkdir(exist_ok=True)
    for name, records in files.items():
        head = (f'# Events {name.replace("-", "–")}. One event per `---` header; see\n'
                f'# geotimeline/README.md for the format.\n')
        (post / 'events' / f'{name}.timeline').write_text(head + '\n'.join(records), encoding='utf-8')

    # facets.yaml
    def icon_ok(icon):
        # Emoji flags render as letter pairs on Windows; bracketed sequences
        # were placeholders.
        return icon and not icon.startswith('[') and not any(0x1F1E6 <= ord(c) <= 0x1F1FF for c in icon)

    actors, themes = {}, {}
    for ref, (group, key) in TAXONOMY_MAP.items():
        t = taxonomies.get(ref, {})
        if group == 'actors':
            actors[key] = {'label': t.get('value', key), 'icon': t.get('icon') if icon_ok(t.get('icon')) else None}
        elif group == 'themes':
            themes[key] = {'label': t.get('value', key), 'icon': t.get('icon') if icon_ok(t.get('icon')) else None}
    themes['rhetoric-zionist']['parent'] = 'rhetoric'
    themes['rhetoric-palestinian']['parent'] = 'rhetoric'
    themes = {'rhetoric': {'label': 'Rhetoric'}, **themes}
    actors.update(EXTRA_ACTORS)

    def facet_block(values):
        out = []
        for key, v in values.items():
            parts = [f'label: {q(v["label"])}']
            if v.get('icon'):
                parts.append(f'icon: {q(v["icon"])}')
            if v.get('parent'):
                parts.append(f'parent: {v["parent"]}')
            out.append(f'    {key}: {{{", ".join(parts)}}}')
        return '\n'.join(out)

    (post / 'facets.yaml').write_text(
        '# Filterable dimensions. Any group key here can be used in an event header.\n'
        '# Emoji flag icons were dropped (they render as letters on Windows).\n'
        'actors:\n  label: Actors\n  values:\n' + facet_block(actors) + '\n'
        'themes:\n  label: Themes\n  values:\n' + facet_block(themes) + '\n',
        encoding='utf-8')

    # places.yaml
    out = ['# Gazetteer. TODO(migration): coordinates are approximate (about ±1 km)',
           '# and were added during migration; verify before publishing. Places',
           '# without lat/lon are drawn at their parent\'s point, marked approximate.']
    for key, (name, lat, lon, parent, region, _) in PLACES.items():
        parts = [f'name: {q(name)}']
        if lat is not None:
            parts += [f'lat: {lat}', f'lon: {lon}']
        if parent:
            parts.append(f'parent: {parent}')
        if region:
            parts.append(f'region: {region}')
        out.append(f'{key}: {{{", ".join(parts)}}}')
    (post / 'places.yaml').write_text('\n'.join(out) + '\n', encoding='utf-8')

    (post / 'periods.yaml').write_text(PERIODS_YAML, encoding='utf-8')

    (post / 'sources.yaml').write_text(
        '# Bibliography. Cite from an event with `sources: [key]` or\n'
        '# `sources: [{key: "p. 95"}]`.\n'
        '#\n'
        '# example2006:\n'
        '#   author: Firstname Lastname\n'
        '#   title: Book title\n'
        '#   year: 2006\n'
        '#   publisher: Publisher\n'
        '#   url: https://…\n'
        '{}\n', encoding='utf-8')

    (post / 'series.yaml').write_text('# Timeline-wide quantitative series (drawn as tracks).\n{}\n', encoding='utf-8')

    out = ['# Guided threads. Members are the events that list the thread under',
           '# `threads:`; add `events: [ids]` here to set an explicit order.']
    for ref, (group, key) in TAXONOMY_MAP.items():
        if group != 'threads':
            continue
        out.append(f'- id: {key}')
        out.append(f'  title: {q(taxonomies[ref]["value"])}')
        out.append('  intro: ""  # TODO(migration): state the claim this thread examines')
    (post / 'threads.yaml').write_text('\n'.join(out) + '\n', encoding='utf-8')

    (post / 'timeline.yaml').write_text(f'''\
schema: 1
title: Filasteen
events:
  - events/1878-1917.timeline
  - events/1918-1946.timeline
  - events/1947-1949.timeline
facets: facets.yaml
places: places.yaml
periods: periods.yaml
sources: sources.yaml
series: series.yaml
threads: threads.yaml
basemap:
  world: geo/land-110m.json
  regions:
    levant: {{name: Levant, center: [35.1, 31.9], span: 4.2, land: geo/levant-10m.json}}
options:
  view: scroll
  spacing: compressed
  gap_marker: 2y
  filter_mode: dim
  date_locale: en-GB
''', encoding='utf-8')

    total = sum(len(r) for r in files.values())
    print(f'wrote {total} events')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'content/post/filasteen')
