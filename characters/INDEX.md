---
purpose: Catalogue of first-person voices and narrated character scenes extracted from the Mayhew source. Read this after source/INDEX.md.
source: All quotes are verbatim slices from ../source.txt; frontmatter and prose commentary in each file is interpretive layering by Claude.
sibling_index: ../source/INDEX.md (the chapter-level index of the primary source text)
---

# Character Catalogue — First-Person Voices in the Mayhew Extract

Every substantive first-person voice or character-scene from the 1851 source is extracted here as a standalone file. Each file contains:

- **YAML frontmatter** — the character's label, occupation, chapter, source line range, anonymity status, stated age/origin, a `key_facts` bullet list, and a `game_hooks` list of what the voice is useful for in game design.
- **Verbatim source text** — the exact Mayhew framing and quoted testimony, sliced byte-for-byte from `../source.txt` via `sed`.

The frontmatter is the only interpretive layer; everything below the `---` closing line is original 1851 prose.

## The ten main voices

| # | File | Voice | Chapter |
|---|------|-------|---------|
| 01 | [01-liverpool-bone-grubber.md](01-liverpool-bone-grubber.md) | Anonymous Liverpool-Irish man, ex-railway labourer cheated out of £12 | 02 — Bone-grubbers |
| 02 | [02-cheque-finder-grubber.md](02-cheque-finder-grubber.md) | Anonymous grubber who found a £12 15s bank cheque and got 10s reward | 02 — Bone-grubbers |
| 03 | [03-pure-finder-widow.md](03-pure-finder-widow.md) | 60-year-old educated widow, buried two husbands and 8 children | 03 — Pure-finders |
| 04 | [04-manchester-clerk-pure-collector.md](04-manchester-clerk-pure-collector.md) | Ex-Manchester cotton-trade clerk (£250/yr) ruined by drink | 03 — Pure-finders |
| 05 | [05-rotherhithe-dredger.md](05-rotherhithe-dredger.md) | Third-generation Thames dredger with scarred hand from the Church Hole corpse | 06 — Dredgers |
| 06 | [06-cuckolds-point-tosher.md](06-cuckolds-point-tosher.md) | **⭐** Birmingham-born sewer-hunter at Cuckold's Point, 20+ years underground | 07 — Sewer-hunters |
| 07 | [07-nine-year-old-mud-lark.md](07-nine-year-old-mud-lark.md) | 9-year-old boy, dead coal-backer father, charwoman mother | 08 — Mud-larks |
| 08 | [08-seven-year-old-mud-lark.md](08-seven-year-old-mud-lark.md) | 7-year-old boy, injured-sailor father, elder brother also a mud-lark | 08 — Mud-larks |
| 09 | [09-jc-coalwhipper-son-mud-lark.md](09-jc-coalwhipper-son-mud-lark.md) | **J.C.**, 14 — the redemption arc: Ragged School gang → printer's apprentice → newspaper clerk | 08 — Mud-larks |
| 10 | [10-dustman-and-sall.md](10-dustman-and-sall.md) | Anonymous third-generation East-end dustman and his deaf partner Sall | 10 — Dustmen |

## Minor voices & narrated scenes

| # | File | Contents |
|---|------|----------|
| 11 | [11-minor-voices-and-scenes.md](11-minor-voices-and-scenes.md) | Six shorter vignettes: the abandoned-house grubber; the prison-preferring mud-lark; the notebook-fleeing dustman; the callous dust-contractor; the Essex farmhand dustman; the intelligent dustman's weekly perquisites record |

## Quick-reference character map

### By archetype
- **The cheated migrant** — 01 (Liverpool-Irish), 04 (Manchester clerk)
- **The educated-fallen woman** — 03 (pure-finder widow)
- **The hereditary river/dust worker** — 05 (Rotherhithe dredger), 06 (Cuckold's Point tosher), 10 (East-end dustman)
- **The child labourer** — 07 (9yo), 08 (7yo), 09 (J.C.)
- **The redemption arc** — 09 only (J.C. escapes to Bradbury & Evans at Whitefriars)
- **The system antagonist** — 11 §4 (the callous contractor), 03 (the named poor-law-guardian tanner)
- **The silent partner** — Sall in 10 (deaf sifter, out-shovels her partner)

### By voice quality
- **Fully literary / educated register** — 03 (widow, "superior woman")
- **Strong dialect, extended speech** — 05 (dredger), 06 (tosher), 10 (dustman)
- **Paraphrased with embedded quotes** — 01, 04, 07, 08, 09 (framing), 11 (most)
- **Mayhew-narrated scenes (no direct speech from subject)** — 11 §1 (abandoned house), 11 §3 (notebook-fleeing)

### By age (where stated)
- 7 — mud-lark (08)
- 9 — mud-lark (07)
- 14 — J.C. (09)
- ~60 — pure-finder widow (03)
- 20+ years at the trade (age unknown) — tosher (06)

### Named within the extract
Only three named individuals appear in any direct form:
- **Sall** — the dustman's common-law partner (10)
- **Scratchey Jack** — the one literate dustman in the yard (mentioned by the dustman in 10)
- **Mr Brown** — the missing-heir pure-finder in the widow's story (03); real name never disclosed

Plus nicknames/initials:
- **J.C.** — the redeemed mud-lark (09)
- **C----** — the 18-year-old gang captain at Wapping Ragged School (09); in prison for stealing bacon
- **B---- B----, B---- L----, W---- B----, Tim** — gang mates (09)
- **Long J----** — the tosher's partner-turned-rival at the Parliament Houses fire rubbish (06)
- **Bill S----** — the rare literate dredger (cross-ref from ch 06 narration, not a testimony)
- **Lanky Bill, Long Tom, One-eyed George, Short-armed Jack** — listed tosher nicknames (06 Mayhew framing)

### Real-world anchors mentioned in the testimonies
- **Bradbury and Evans, Whitefriars** — printers; placed J.C. after his rescue (09). Real firm — printed Punch and much of Dickens.
- **Red Lion school, Green-bank, Old Gravel-lane, Ratcliffe-highway** — J.C.'s penny-a-week school (09)
- **Ragged School, High-street, Wapping** — J.C.'s gang headquarters (09)
- **Neptune East Indiaman, bound for Bombay** — the widow's first husband's ship (03)
- **Paris and Rouen Railway, under McKenzie & Brassy** — the Liverpool man's French job (01); McKenzie & Brassy were real Victorian railway contractors
- **Parliament Houses fire, 16 October 1834** — rubbish shot in Hyde Park, worked by the tosher and Long J---- (06)
- **London & County Bank, 21 Lombard-street** — the cheque-redemption scene (02)
- **Whitechapel workhouse hospital** — the Liverpool man's nine-week winter stay (01)
- **Bermondsey tanyards, Blue Anchor-yard** — the widow's buyers and Mr Brown's lodgings (03)
- **Cuckold's Point, Blackfriars-bridge, Bishop Bonner's-fields** — the tosher's working territory (06)
- **Church Hole, Pelican Pier, Limehouse Point** — the dredger's river geography (05)

## Conventions

- Every file is self-contained — frontmatter + verbatim Mayhew. You can drop any single file into a fresh LLM context without reading anything else.
- Line numbers in frontmatter reference `../source.txt` (the canonical original).
- `key_facts` bullets are **neutral descriptions** — they summarise, they do not interpret or judge.
- `game_hooks` bullets are **openly interpretive** — they name what the voice is *for*, as raw material. Feel free to disagree and overwrite.
- If you add a new character file, register it in the table above and in the quick-reference map.
