import { getCharacter, listCharacters, type CharacterMeta } from "./content";

export type VoiceProfile = {
  id: string;
  url: string;
  label: string;
  gender: "male" | "female" | "unknown";
  age_band: "child" | "youth" | "adult" | "elder" | "unknown";
  age_stated: string | null;
  origin: string | null;
  dialect_level: "standard" | "moderate" | "heavy" | "composite";
  accent_hint: string;
  speech_notes: string;
  source_character: { id: string; url: string; label: string };
};

// Per-character curation for things that can't be cleanly derived from
// the existing frontmatter — mostly accent_hint, dialect_level, speech_notes.
// Keep this concise; it's a hint for TTS / voice-casting consumers, not a
// full linguistic analysis.
const OVERRIDES: Record<string, Partial<VoiceProfile>> = {
  mayhew: {
    gender: "male",
    dialect_level: "standard",
    accent_hint: "Educated middle-class London, mid-19th-century (Westminster School, barrister's training, Punch-era literary-journalist register)",
    speech_notes:
      "The narrator voice. Orotund periodic Victorian prose, taxonomic enumeration, statistical aside, sympathetic-but-distanced reportage. Use for the framing narrator in any audio adaptation — NOT for quoted testimony, which should route to the interviewee's voice profile. Contrasts sharply with the heavy dialect of 06-cuckolds-point-tosher and 10-dustman-and-sall, which he preserves verbatim within his own standard-English frame.",
  },
  "01-liverpool-bone-grubber": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "Liverpool-Irish, mid-19th-century",
    speech_notes:
      "Paraphrased with embedded direct quotes. Ex-railway labourer. Story arcs through migration to Paris/Rouen railway and betrayal by foreman.",
  },
  "02-cheque-finder-grubber": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "London working-class, mid-19th-century",
    speech_notes:
      "Paraphrased single-incident report — found a £12 15s cheque; reward 10s. Mostly Mayhew-narrated.",
  },
  "03-pure-finder-widow": {
    gender: "female",
    dialect_level: "standard",
    accent_hint: "Educated southern English, early-to-mid-19th-century",
    speech_notes:
      "Fully literary register — Mayhew calls her 'a superior woman'. Read and wrote well. Use for the educated-fallen-low archetype; speech is grammatical, unslangy, narratively complete.",
  },
  "04-manchester-clerk-pure-collector": {
    gender: "male",
    dialect_level: "standard",
    accent_hint: "Northern English (Manchester), mid-19th-century, some slurring from drink",
    speech_notes:
      "Ruined cotton-trade clerk, formerly £250/year. Register educated but slurred; context of alcoholism.",
  },
  "05-rotherhithe-dredger": {
    gender: "male",
    dialect_level: "heavy",
    accent_hint: "Thames waterman, mid-19th-century",
    speech_notes:
      "Third-generation dredger. Dialect marked by 'arter' for 'after', 'afore' for 'before', heritable trade-jargon.",
  },
  "06-cuckolds-point-tosher": {
    gender: "male",
    dialect_level: "heavy",
    accent_hint: "London working-class, mid-19th-century, heavy",
    speech_notes:
      "THE archetypal tosher voice. Slurs final consonants. Characteristic spellings preserved by Mayhew: 'P'int' for 'Point'; 'niver' for 'never'; 'ag'in' for 'again'; 'pertikler' for 'particular'; 'woppers' for rats. Uses cant — 'tosh', 'shore-workers', 'Johnnys' (river police), 'whacking' (share/split).",
  },
  "07-nine-year-old-mud-lark": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "London child of Aberdeen-Scottish parents, 1851",
    speech_notes:
      "Short declarative answers in paraphrased Q-and-A. Extraordinary catechism-style exchange on religion ('God was God … He had heard he was good, but did not know what good he was to him') and geography ('Thought London was England and England was in London').",
  },
  "08-seven-year-old-mud-lark": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "London child, 1851",
    speech_notes:
      "Very young voice, more fragmented than the nine-year-old. Elder brother also mud-larks.",
  },
  "09-jc-coalwhipper-son-mud-lark": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "London, son of a coalwhipper — post-rescue speech cleaner than pre-rescue",
    speech_notes:
      "Teenager who has passed through the Wapping Ragged School and is now at Bradbury & Evans printers. Register shifts between gang-era London dialect and clerk-style English as he describes his arc.",
  },
  "10-dustman-and-sall": {
    gender: "male",
    dialect_level: "heavy",
    accent_hint: "East-end London dustman, mid-19th-century, very heavy",
    speech_notes:
      "The strongest dialect in the extract. 'V' for 'w' throughout — 'vos' for 'was', 'vouldn't' for 'wouldn't', 'wery' for 'very'. Cant lexicon: 'lush' for drink, 'beggar' as intensifier, 'half-a-bull' for 2s 6d, 'zactly' for 'exactly'. Never been as far west as Temple Bar.",
  },
  "11-minor-voices-and-scenes": {
    gender: "unknown",
    dialect_level: "composite",
    accent_hint: "Mixed — six short vignettes with different speakers",
    speech_notes:
      "Composite file — not a single voice. Use list_characters for the individual main voices; this file is for narrated scenes and brief quotations that don't sustain their own testimony.",
  },
};

function ageBandFrom(ageStated: string | undefined): VoiceProfile["age_band"] {
  if (!ageStated) return "unknown";
  const s = ageStated.toLowerCase();
  // explicit "nine years", "7-year-old", "14", etc.
  const numMatch = s.match(/\b(\d{1,3})\b/);
  const n = numMatch ? Number(numMatch[1]) : NaN;
  if (Number.isFinite(n)) {
    if (n <= 9) return "child";
    if (n <= 17) return "youth";
    if (n <= 59) return "adult";
    return "elder";
  }
  if (/about 60|around 60|\b60\b/.test(s)) return "elder";
  if (/twenty year|20\+|long/.test(s)) return "adult";
  return "unknown";
}

export function voiceProfile(id: string): VoiceProfile | null {
  const c = getCharacter(id);
  if (!c) return null;
  const list = listCharacters();
  const meta = list.find((x) => x.id === id);
  if (!meta) return null;

  const override = OVERRIDES[id] ?? {};

  return {
    id,
    url: `/api/characters/${id}`,
    label: meta.label,
    gender: override.gender ?? "unknown",
    age_band: ageBandFrom(meta.age_stated),
    age_stated: meta.age_stated ?? null,
    origin: meta.origin ?? null,
    dialect_level: override.dialect_level ?? "moderate",
    accent_hint: override.accent_hint ?? "London working-class, mid-19th-century",
    speech_notes: override.speech_notes ?? "",
    source_character: {
      id,
      url: `/api/characters/${id}`,
      label: meta.label,
    },
  };
}

export function listVoiceProfiles(): VoiceProfile[] {
  return listCharacters()
    .map((c: CharacterMeta) => voiceProfile(c.id))
    .filter((v): v is VoiceProfile => v !== null);
}
