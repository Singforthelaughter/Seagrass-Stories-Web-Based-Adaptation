/**
 * Server-side prompt safety filter for the kids' wetsuit designer.
 *
 * The game is for children, so a player's free-text idea is scrubbed before it
 * ever reaches the prompt-enhancer or the image model: known profanity, slurs,
 * and sexual/violent/drug terms are redacted. It catches common evasions —
 * letter repetition ("fuuuck"), simple leetspeak ("sh1t", "f@ck"), and
 * separators ("f.u.c.k", "s e x") — while staying word-boundary anchored so
 * innocent words are never touched (e.g. "grass" and "bass" keep their "ass",
 * "class" is fine).
 *
 * This is a pragmatic baseline, not exhaustive moderation; the enhancer's system
 * instruction is also hardened to keep output wholesome as a second layer.
 */

// Base forms only — variants (plurals, leet, separators) are handled by the
// matcher below. Keep lowercase.
const BAD_WORDS = [
  "anal", "anus", "arse", "ass", "asshole", "bastard", "bitch", "blowjob",
  "boner", "boob", "boobs", "bollocks", "bukkake", "cock", "coon", "crap",
  "cum", "cunt", "dick", "dildo", "dyke", "ejaculate", "erection", "fag",
  "faggot", "fellatio", "fuck", "fucker", "fucking", "gangbang", "genital",
  "genitals", "handjob", "hentai", "heroin", "hooker", "horny", "incest",
  "jizz", "kike", "labia", "masturbate", "molest", "nazi", "nigga", "nigger",
  "nipple", "nude", "nudes", "orgasm", "orgy", "penis", "porn", "porno",
  "prick", "pussy", "queer", "rape", "rapist", "retard", "scrotum", "semen",
  "sex", "sexy", "shit", "slut", "spunk", "testicle", "tit", "tits", "twat",
  "vagina", "viagra", "vulva", "wank", "whore",
];

// Per-character leet alternates. The key is the canonical letter; the value is
// the extra characters that should also match it.
const LEET: Record<string, string> = {
  a: "a4@",
  b: "b8",
  c: "c(",
  e: "e3",
  g: "g9",
  i: "i1!|",
  l: "l1|",
  o: "o0",
  s: "s5$",
  t: "t7+",
  z: "z2",
};

const escapeClass = (s: string) => s.replace(/[\\\]^-]/g, "\\$&");

// Between letters, allow a few common "spacers" used to dodge filters.
const SEP = "[\\s._*\\-]*";

function buildPattern(words: string[]): RegExp {
  const parts = words.map((word) => {
    const chars = [...word].map((ch) => {
      const set = LEET[ch] ?? ch;
      // Allow the letter (and leet variants) to repeat: "fuuuck", "shiiit".
      return `[${escapeClass(set)}]+`;
    });
    return `\\b${chars.join(SEP)}\\b`;
  });
  return new RegExp(`(${parts.join("|")})`, "gi");
}

const PATTERN = buildPattern(BAD_WORDS);

/**
 * Redact bad words from a prompt.
 * @returns the cleaned prompt and whether anything was filtered.
 */
export function sanitizePrompt(input: string): { clean: string; hadBadWords: boolean } {
  let hadBadWords = false;
  const clean = input
    .replace(PATTERN, () => {
      hadBadWords = true;
      return " ";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
  return { clean, hadBadWords };
}
