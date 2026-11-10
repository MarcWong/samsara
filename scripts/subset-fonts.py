#!/usr/bin/env python3
"""Rebuild the bundled Chinese fonts from their full source files.

The game ships two subset fonts so Chinese renders identically on every
machine instead of falling back to whatever the system has:

  static/fonts/samsara-sc.woff      Noto Sans SC (variable weight) -- all
                                    Chinese text: events, charms, interface
  static/fonts/samsara-hand.woff    LXGW WenKai Medium -- the "reborn"
                                    subtitle on the start sequence only

Each holds only the characters the game actually uses, so RE-RUN THIS after
changing static/data/zh-cn/*.json or the Chinese strings in src/lib/i18n.js.
`npm test` fails if a character is in the text but not in the font.

    pip install fonttools
    python3 scripts/subset-fonts.py NotoSansSC[wght].ttf LXGWWenKai-Medium.ttf

Sources (both SIL Open Font License 1.1, see static/fonts/LICENSE-*.txt):
  https://github.com/google/fonts/tree/main/ofl/notosanssc
  https://github.com/lxgw/LxgwWenKai/tree/main/fonts/TTF
"""
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'static' / 'fonts'
TEXT_FILES = [
    ROOT / 'static/data/zh-cn/events.json',
    ROOT / 'static/data/zh-cn/talents.json',
    ROOT / 'src/lib/i18n.js',
]


def used_chars():
    """Every non-ASCII character in the Chinese text (ASCII stays with the
    Latin fonts ahead of this one in the CSS stack)."""
    chars = set()
    for path in TEXT_FILES:
        chars |= {c for c in path.read_text(encoding='utf-8') if ord(c) > 0x7F and not c.isspace()}
    chars.add('　')
    return chars


def build(source, target, chars):
    options = subset.Options()
    options.flavor = 'woff'
    options.layout_features = ['*']
    options.name_IDs = [1, 2, 13, 14]  # keep family + licence, drop the rest
    font = TTFont(source)
    cmap = font.getBestCmap()
    missing = sorted(c for c in chars if ord(c) not in cmap)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=[ord(c) for c in chars])
    subsetter.subset(font)
    font.flavor = 'woff'
    font.save(target)
    print(f'{target.relative_to(ROOT)}: {len(chars) - len(missing)} glyphs, {target.stat().st_size // 1024} KB')
    return missing


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    body_source, hand_source = sys.argv[1:]
    chars = used_chars()
    missing = build(body_source, OUT / 'samsara-sc.woff', chars)
    # Characters the source font itself lacks (emoji, rare symbols) stay with
    # the system fallback; list only what the font really covers.
    covered = ''.join(sorted(chars - set(missing)))
    (OUT / 'samsara-sc.chars.txt').write_text(covered, encoding='utf-8')
    if missing:
        print('not in Noto Sans SC, left to system fonts:', ' '.join(missing))

    reborn = re.search(r"'intro\.reborn': '([^']+)'", TEXT_FILES[2].read_text(encoding='utf-8')).group(1)
    hand_missing = build(hand_source, OUT / 'samsara-hand.woff', set(reborn))
    if hand_missing:
        sys.exit(f'subtitle characters missing from the handwriting font: {hand_missing}')


if __name__ == '__main__':
    main()
