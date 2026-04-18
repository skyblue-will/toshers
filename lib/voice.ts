import { getCharacter, listCharacters, type CharacterMeta } from "./content";

export type PronunciationOverride = {
  spelling: string;
  ipa: string;
  note?: string;
};

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
  // TTS-oriented fields: concrete pronunciation hints, a generic voice-model
  // descriptor a casting/TTS pipeline can match, and optional SSML guidance.
  // `pronunciation_overrides` addresses Mayhew's heavy phonetic spellings —
  // without them a TTS engine will render "vos" as /vɒs/ or "P'int" literally.
  pronunciation_overrides: PronunciationOverride[];
  suggested_voice_model: string;
  ssml_hints: string | null;
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
    suggested_voice_model: "male, adult, educated southern British English (RP or near-RP), measured reading tempo, periodic sentence rhythm",
    ssml_hints: "<prosody rate=\"95%\"><voice name=\"en-GB-RyanNeural\">...</voice></prosody> — slow slightly for the long periodic sentences; no accent overlay.",
    pronunciation_overrides: [],
  },
  "01-liverpool-bone-grubber": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "Liverpool-Irish, mid-19th-century",
    speech_notes:
      "Paraphrased with embedded direct quotes. Ex-railway labourer. Story arcs through migration to Paris/Rouen railway and betrayal by foreman.",
    suggested_voice_model: "male, adult, Liverpool-Irish blend (Scouse base with retained Irish vowels), mid-tempo",
    ssml_hints: null,
    pronunciation_overrides: [],
  },
  "02-cheque-finder-grubber": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "London working-class, mid-19th-century",
    speech_notes:
      "Paraphrased single-incident report — found a £12 15s cheque; reward 10s. Mostly Mayhew-narrated.",
    suggested_voice_model: "male, adult, London working-class English",
    ssml_hints: null,
    pronunciation_overrides: [],
  },
  "03-pure-finder-widow": {
    gender: "female",
    dialect_level: "standard",
    accent_hint: "Educated southern English, early-to-mid-19th-century",
    speech_notes:
      "Fully literary register — Mayhew calls her 'a superior woman'. Read and wrote well. Use for the educated-fallen-low archetype; speech is grammatical, unslangy, narratively complete.",
    suggested_voice_model: "female, elder (60s), educated southern British English, controlled grief register",
    ssml_hints: null,
    pronunciation_overrides: [],
  },
  "04-manchester-clerk-pure-collector": {
    gender: "male",
    dialect_level: "standard",
    accent_hint: "Northern English (Manchester), mid-19th-century, some slurring from drink",
    speech_notes:
      "Ruined cotton-trade clerk, formerly £250/year. Register educated but slurred; context of alcoholism.",
    suggested_voice_model: "male, adult, Manchester English (educated register), slightly slurred delivery",
    ssml_hints: "<prosody rate=\"90%\">...</prosody> — slight slurring for the alcoholic register, but register remains educated.",
    pronunciation_overrides: [],
  },
  "05-rotherhithe-dredger": {
    gender: "male",
    dialect_level: "heavy",
    accent_hint: "Thames waterman, mid-19th-century",
    speech_notes:
      "Third-generation dredger. Dialect marked by 'arter' for 'after', 'afore' for 'before', heritable trade-jargon.",
    suggested_voice_model: "male, adult/elder, London Thames-side English, weathered, mid-low tempo",
    ssml_hints: null,
    pronunciation_overrides: [
      { spelling: "arter", ipa: "ˈɑːtə", note: "for 'after'" },
      { spelling: "afore", ipa: "əˈfɔː", note: "for 'before'" },
    ],
  },
  "06-cuckolds-point-tosher": {
    gender: "male",
    dialect_level: "heavy",
    accent_hint: "London working-class, mid-19th-century, heavy",
    speech_notes:
      "THE archetypal tosher voice. Slurs final consonants. Characteristic spellings preserved by Mayhew: 'P'int' for 'Point'; 'niver' for 'never'; 'ag'in' for 'again'; 'pertikler' for 'particular'; 'woppers' for rats. Uses cant — 'tosh', 'shore-workers', 'Johnnys' (river police), 'whacking' (share/split).",
    suggested_voice_model: "male, adult, heavy London working-class English, slurred word-final consonants, confident mid-fast tempo",
    ssml_hints: "Apply phoneme substitutions for the P'int/niver/ag'in/pertikler spellings — literal rendering mangles them. Mid-fast tempo; confident self-possessed register.",
    pronunciation_overrides: [
      { spelling: "P'int", ipa: "pɔɪnt", note: "Cuckold's Point — elision of the O" },
      { spelling: "niver", ipa: "ˈnɪvə", note: "for 'never'" },
      { spelling: "ag'in", ipa: "əˈɡɪn", note: "for 'again'" },
      { spelling: "pertikler", ipa: "pəˈtɪklə", note: "for 'particular'" },
      { spelling: "woppers", ipa: "ˈwɒpəz", note: "for the large sewer-rats" },
      { spelling: "arter", ipa: "ˈɑːtə", note: "for 'after'" },
      { spelling: "thort", ipa: "θɔːt", note: "for 'thought'" },
    ],
  },
  "07-nine-year-old-mud-lark": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "London child of Aberdeen-Scottish parents, 1851",
    speech_notes:
      "Short declarative answers in paraphrased Q-and-A. Extraordinary catechism-style exchange on religion ('God was God … He had heard he was good, but did not know what good he was to him') and geography ('Thought London was England and England was in London').",
    suggested_voice_model: "male, child (9y), London English with faint Aberdeen-Scottish inheritance, short-answer register",
    ssml_hints: null,
    pronunciation_overrides: [],
  },
  "08-seven-year-old-mud-lark": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "London child, 1851",
    speech_notes:
      "Very young voice, more fragmented than the nine-year-old. Elder brother also mud-larks.",
    suggested_voice_model: "male, child (7y), London English, short fragmentary phrasing",
    ssml_hints: null,
    pronunciation_overrides: [],
  },
  "09-jc-coalwhipper-son-mud-lark": {
    gender: "male",
    dialect_level: "moderate",
    accent_hint: "London, son of a coalwhipper — post-rescue speech cleaner than pre-rescue",
    speech_notes:
      "Teenager who has passed through the Wapping Ragged School and is now at Bradbury & Evans printers. Register shifts between gang-era London dialect and clerk-style English as he describes his arc.",
    suggested_voice_model: "male, youth (14y), London English, code-switches between street-slang and schooled-clerk register — model as two sub-profiles if the TTS supports style-tags",
    ssml_hints: "Consider a style-break around his rescue narrative — pre-rescue heavier dialect, post-rescue cleaner, per his own arc.",
    pronunciation_overrides: [],
  },
  "10-dustman-and-sall": {
    gender: "male",
    dialect_level: "heavy",
    accent_hint: "East-end London dustman, mid-19th-century, very heavy",
    speech_notes:
      "The strongest dialect in the extract. 'V' for 'w' throughout — 'vos' for 'was', 'vouldn't' for 'wouldn't', 'wery' for 'very'. Cant lexicon: 'lush' for drink, 'beggar' as intensifier, 'half-a-bull' for 2s 6d, 'zactly' for 'exactly'. Never been as far west as Temple Bar.",
    suggested_voice_model: "male, adult, extreme East-end London working-class English (Dickensian 'V for W' substitution), confident, rough, mid-tempo",
    ssml_hints: "Critical: apply phoneme overrides for the V-for-W pattern — literal rendering of 'vos'/'vouldn't'/'wery' is completely wrong. The spelling is Mayhew's ear-transcription of /w/→/v/ (or more accurately a labio-dental approximant); model as /v/.",
    pronunciation_overrides: [
      { spelling: "vos", ipa: "vɒz", note: "for 'was' — the V-for-W inversion" },
      { spelling: "vouldn't", ipa: "ˈvʊdnt", note: "for 'wouldn't'" },
      { spelling: "wery", ipa: "ˈvɛɹi", note: "for 'very' — W-for-V inversion (same phenomenon, opposite direction)" },
      { spelling: "zactly", ipa: "ˈzæktli", note: "for 'exactly' — aphetic" },
      { spelling: "beggar", ipa: "ˈbɛɡə", note: "intensifier, not the literal meaning" },
    ],
  },
  "11-minor-voices-and-scenes": {
    gender: "unknown",
    dialect_level: "composite",
    accent_hint: "Mixed — six short vignettes with different speakers",
    speech_notes:
      "Composite file — not a single voice. Use list_characters for the individual main voices; this file is for narrated scenes and brief quotations that don't sustain their own testimony.",
    suggested_voice_model: "composite — route each vignette to the matching main character's voice model where possible; otherwise generic London working-class English",
    ssml_hints: null,
    pronunciation_overrides: [],
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
    pronunciation_overrides: override.pronunciation_overrides ?? [],
    suggested_voice_model: override.suggested_voice_model ?? "male, adult, London working-class English",
    ssml_hints: override.ssml_hints ?? null,
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
