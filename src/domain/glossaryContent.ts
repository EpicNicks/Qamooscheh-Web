// Per-course reference glossary — frontend-only, unlike course content
// (CourseManifest et al., types/content.ts), which is CDN-hosted and version-
// pinned so a learner's progress stays stable against a specific manifest.
// A glossary isn't graded and carries no progress to protect, so it has
// nothing for a version to pin: it just ships with the app and updates on
// redeploy, keyed by course code the same way domain/language.ts is.
//
// The tree nests to whatever depth an entry actually needs — a chapter
// ("Counting") holding sub-units ("Ordinal", "Cardinal") is just a node
// whose children are themselves leaves. GlossaryPage renders any node with
// children as an in-place accordion; a leaf (no children) is its own page,
// rendered as one continuous table of `terms` — no sub-headings splitting
// it up, so a repeating range (21-29, 31-39, ...) collapses into a single
// row showing the pattern rather than becoming its own break in the table.
//
// Romanization uses macron diacritics for long vowels (ā/ī/ū), the standard
// Persian transliteration convention, not the circumflex (â) an earlier
// pass used.

export interface GlossaryTerm {
  term: string;
  romanization?: string;
  definition: string;
}

export interface GlossaryEntry {
  /** URL-safe segment — must be unique among siblings, not globally (findGlossaryEntry matches a full path, not a bare id). */
  id: string;
  title: string;
  /** Present and non-empty exactly when this node is a folder rendered as an accordion; absent/empty means it's a leaf page of `terms`. */
  children?: GlossaryEntry[];
  terms?: GlossaryTerm[];
  /** Explanatory prose shown above a leaf's table — for a rule the table itself demonstrates but doesn't state (e.g. how ordinals are formed). */
  note?: string;
}

// Persian numbers 1-9, needed both on their own (1-10, 21-29, ...) and as the
// trailing digit of every compound (21 = "20 و 1"), so they're kept as one
// table rather than repeated at each place that needs them.
const ONES_CARDINAL = [
  { native: "یک", romanization: "yek", word: "one" },
  { native: "دو", romanization: "do", word: "two" },
  { native: "سه", romanization: "se", word: "three" },
  { native: "چهار", romanization: "chahār", word: "four" },
  { native: "پنج", romanization: "panj", word: "five" },
  { native: "شش", romanization: "shesh", word: "six" },
  { native: "هفت", romanization: "haft", word: "seven" },
  { native: "هشت", romanization: "hasht", word: "eight" },
  { native: "نه", romanization: "noh", word: "nine" },
];

// Just enough of the ordinal series (1st-5th) for the Ordinal page's note to
// point at — the rest follows the same rule against Cardinal's own numbers.
const ONES_ORDINAL = [
  { native: "اول", romanization: "avval", word: "first" },
  { native: "دوم", romanization: "dovom", word: "second" },
  { native: "سوم", romanization: "sevom", word: "third" },
  { native: "چهارم", romanization: "chahārom", word: "fourth" },
  { native: "پنجم", romanization: "panjom", word: "fifth" },
];

const ZERO = { native: "صفر", romanization: "sefr", word: "zero" };
// صفرم ("sefrom") follows the regular cardinal+om pattern like any consonant-
// ending root (chahārom, panjom, ...) — Persian rarely needs an ordinal
// "zeroth" in everyday speech, but it's standard in math/technical usage.
const ZEROTH = { native: "صفرم", romanization: "sefrom", word: "zeroth" };

const TEN = { native: "ده", romanization: "dah", word: "ten" };

const TEENS_CARDINAL = [
  { native: "یازده", romanization: "yāzdah", word: "eleven" },
  { native: "دوازده", romanization: "davāzdah", word: "twelve" },
  { native: "سیزده", romanization: "sizdah", word: "thirteen" },
  { native: "چهارده", romanization: "chahārdah", word: "fourteen" },
  { native: "پانزده", romanization: "pānzdah", word: "fifteen" },
  { native: "شانزده", romanization: "shānzdah", word: "sixteen" },
  { native: "هفده", romanization: "hifdah", word: "seventeen" },
  { native: "هجده", romanization: "hejdah", word: "eighteen" },
  { native: "نوزده", romanization: "nuzdah", word: "nineteen" },
];

// The decades, 20-90. Each is its own memorizable root (30 "si" isn't built
// from 3 "se" the way 21-29 are built from 20), so — like 1-10 — every one
// gets its own row rather than being folded into a shortcut range. Also
// doubles as the base every 21-29/31-39/... compound is built from below.
const DECADES = [
  { native: "بیست", romanization: "bist", cardinalWord: "twenty" },
  { native: "سی", romanization: "si", cardinalWord: "thirty" },
  { native: "چهل", romanization: "chehel", cardinalWord: "forty" },
  { native: "پنجاه", romanization: "panjāh", cardinalWord: "fifty" },
  { native: "شصت", romanization: "shast", cardinalWord: "sixty" },
  { native: "هفتاد", romanization: "haftād", cardinalWord: "seventy" },
  { native: "هشتاد", romanization: "hashtād", cardinalWord: "eighty" },
  { native: "نود", romanization: "navad", cardinalWord: "ninety" },
];

/**
 * One row standing in for a whole 9-number compound run (21-29, 31-39, ...):
 * "bist-o-yek, bist-o-do, ..., bist-o-noh" — first two spelled out so the
 * "[decade] و [unit]" pattern is legible, then an ellipsis, then the last
 * one, rather than nine near-identical rows.
 */
function patternRow(decade: (typeof DECADES)[number], from: number): GlossaryTerm {
  const to = from + 8;
  const shown = [ONES_CARDINAL[0], ONES_CARDINAL[1], ONES_CARDINAL[8]];
  const join = (build: (one: (typeof ONES_CARDINAL)[number]) => string, sep: string) => `${build(shown[0])}${sep}${build(shown[1])}${sep}...${sep}${build(shown[2])}`;
  return {
    term: join((one) => `${decade.native} و ${one.native}`, "، "),
    romanization: join((one) => `${decade.romanization}-o-${one.romanization}`, ", "),
    definition: `${join((one) => `${decade.cardinalWord}-${one.word}`, ", ")} (${from}-${to})`,
  };
}

/** The decade's own row plus its collapsed "N1-N9" pattern row — e.g. "twenty" then one row for "21-29". */
function decadeRows(decade: (typeof DECADES)[number], startingAt: number): GlossaryTerm[] {
  return [{ term: decade.native, romanization: decade.romanization, definition: decade.cardinalWord }, patternRow(decade, startingAt)];
}

// Short-scale magnitude names, 10^3 through 10^39. Persian doesn't have
// native roots for these beyond هزار/میلیون/میلیارد/تریلیون — everything
// past trillion is the same Latinate loanword scientific Persian borrows
// from English/French, just transliterated into Perso-Arabic script.
const MAGNITUDES = [
  { native: "هزار", romanization: "hezār", word: "one thousand", numeral: "1,000" },
  { native: "میلیون", romanization: "milyon", word: "one million", numeral: "1,000,000" },
  { native: "میلیارد", romanization: "milyārd", word: "one billion", numeral: "1,000,000,000" },
  { native: "تریلیون", romanization: "trilyon", word: "one trillion", numeral: "10^12" },
  { native: "کوادریلیون", romanization: "kuādrilyon", word: "one quadrillion", numeral: "10^15" },
  { native: "کوینتیلیون", romanization: "kuintilyon", word: "one quintillion", numeral: "10^18" },
  { native: "سکستیلیون", romanization: "sekstilyon", word: "one sextillion", numeral: "10^21" },
  { native: "سپتیلیون", romanization: "septilyon", word: "one septillion", numeral: "10^24" },
  { native: "اکتیلیون", romanization: "oktilyon", word: "one octillion", numeral: "10^27" },
  { native: "نونیلیون", romanization: "nonilyon", word: "one nonillion", numeral: "10^30" },
  { native: "دسیلیون", romanization: "desilyon", word: "one decillion", numeral: "10^33" },
  { native: "آندسیلیون", romanization: "āndesilyon", word: "one undecillion", numeral: "10^36" },
  { native: "دودسیلیون", romanization: "dodesilyon", word: "one duodecillion", numeral: "10^39" },
];

const CARDINAL_ENTRY: GlossaryEntry = {
  id: "cardinal",
  title: "Cardinal",
  terms: [
    ...[ZERO, ...ONES_CARDINAL, TEN].map((n) => ({ term: n.native, romanization: n.romanization, definition: n.word })),
    ...TEENS_CARDINAL.map((n) => ({ term: n.native, romanization: n.romanization, definition: n.word })),
    ...DECADES.flatMap((decade, i) => decadeRows(decade, 20 + i * 10 + 1)),
    { term: "صد", romanization: "sad", definition: "one hundred" },
    ...MAGNITUDES.map((m) => ({ term: m.native, romanization: m.romanization, definition: `${m.word} (${m.numeral})` })),
  ],
};

const ORDINAL_ENTRY: GlossaryEntry = {
  id: "ordinal",
  title: "Ordinal",
  note:
    "Other than \"first\" (اول/avval, a loanword from Arabic أول), the rule is exceptionless: the cardinal, plus a linking \"v\" if the cardinal ends in a vowel, plus \"-om\" — دو (do) becomes دوم (dovom), سه (se) becomes سوم (sevom), چهار (chahār, ending in a consonant) becomes چهارم (chahārom) with no linking v needed.",
  // Zeroth plus the first 5 demonstrate the plain rule; 21st/22nd demonstrate
  // it inside a compound (only the trailing piece inflects, and it's the
  // regular یکم "yekom", not the irregular اول "avval" — see ONES_ORDINAL's
  // sibling note in ORDINAL comments elsewhere); 100th shows it holding at a
  // higher magnitude with nothing in between; the "..." row is just that —
  // the rule never stops, there's no second table needed for the rest.
  terms: [
    ...[ZEROTH, ...ONES_ORDINAL].map((n) => ({ term: n.native, romanization: n.romanization, definition: n.word })),
    { term: "بیست و یکم", romanization: "bist-o-yekom", definition: "twenty-first" },
    { term: "بیست و دوم", romanization: "bist-o-dovom", definition: "twenty-second" },
    { term: "صدم", romanization: "sadom", definition: "hundredth" },
    { term: "...", definition: "" },
  ],
};

// Vocabulary around numbers rather than numbers themselves — "negative" is a
// word here (منفی on its own), not a prefix applied across a table of values.
const TERMS_ENTRY: GlossaryEntry = {
  id: "terms",
  title: "Number Terms",
  terms: [
    { term: "مثبت", romanization: "mosbat", definition: "positive" },
    { term: "منفی", romanization: "menfi", definition: "negative" },
    { term: "جمع", romanization: "jam", definition: "addition / sum" },
    { term: "تفریق", romanization: "tafrigh", definition: "subtraction" },
    { term: "ضرب", romanization: "zarb", definition: "multiplication" },
    { term: "تقسیم", romanization: "taghsim", definition: "division" },
    { term: "برابر", romanization: "barābar", definition: "equal" },
    { term: "نصف", romanization: "nesf", definition: "half" },
    { term: "زوج", romanization: "zoj", definition: "even" },
    { term: "فرد", romanization: "fard", definition: "odd" },
    { term: "درصد", romanization: "darsad", definition: "percent (literally: per hundred)" },
    { term: "بی‌نهایت", romanization: "bi-nahāyat", definition: "infinity" },
  ],
};

const HOURS_MINUTES_ENTRY: GlossaryEntry = {
  id: "hours-minutes",
  title: "Hours & Minutes",
  terms: [
    { term: "ساعت", romanization: "sāat", definition: "hour / o'clock" },
    { term: "دقیقه", romanization: "daqiqe", definition: "minute" },
    { term: "ثانیه", romanization: "sāniye", definition: "second" },
    { term: "نیم", romanization: "nim", definition: "half" },
    { term: "ربع", romanization: "rob", definition: "quarter" },
    { term: "ساعت چنده؟", romanization: "sāat chande?", definition: "what time is it?" },
    { term: "ساعت پنج", romanization: "sāat panj", definition: "five o'clock" },
    { term: "پنج و نیم", romanization: "panj-o-nim", definition: "half past five (5:30)" },
    { term: "پنج و ربع", romanization: "panj-o-rob", definition: "quarter past five (5:15)" },
    { term: "ربع به پنج", romanization: "rob be panj", definition: "quarter to five (4:45)" },
  ],
};

const TIME_EXPRESSIONS_ENTRY: GlossaryEntry = {
  id: "time-expressions",
  title: "Time Expressions",
  terms: [
    { term: "صبح", romanization: "sobh", definition: "morning" },
    { term: "ظهر", romanization: "zohr", definition: "noon" },
    { term: "عصر", romanization: "asr", definition: "afternoon" },
    { term: "غروب", romanization: "gorub", definition: "sunset / evening" },
    { term: "شب", romanization: "shab", definition: "night" },
    { term: "نیمه‌شب", romanization: "nime-shab", definition: "midnight" },
    { term: "امروز", romanization: "emrooz", definition: "today" },
    { term: "فردا", romanization: "fardā", definition: "tomorrow" },
    { term: "دیروز", romanization: "dirooz", definition: "yesterday" },
    { term: "هفته", romanization: "hafte", definition: "week" },
    { term: "ماه", romanization: "māh", definition: "month" },
    { term: "سال", romanization: "sāl", definition: "year" },
  ],
};

const RELATIVE_TIME_ENTRY: GlossaryEntry = {
  id: "relative-time",
  title: "Relative Time",
  terms: [
    { term: "زود", romanization: "zud", definition: "early" },
    { term: "دیر", romanization: "dir", definition: "late" },
    { term: "به‌زودی", romanization: "be-zudi", definition: "soon" },
    { term: "به‌موقع", romanization: "be-moghe", definition: "on time" },
    { term: "مهلت", romanization: "mohlat", definition: "deadline" },
    { term: "قبل", romanization: "ghabl", definition: "before" },
    { term: "بعد", romanization: "ba'd", definition: "after" },
    { term: "هنوز", romanization: "hanuz", definition: "still / yet" },
    { term: "قبلاً", romanization: "ghablan", definition: "already" },
    { term: "الان", romanization: "alān", definition: "now" },
    { term: "بعداً", romanization: "ba'dan", definition: "later / afterwards" },
  ],
};

const COLORS_ENTRY: GlossaryEntry = {
  id: "colors",
  title: "Colors",
  note:
    "A color follows its noun with ezafe, like any other adjective: ماشین قرمز (māshin-e ghermez, \"red car\"). Several colors — نارنجی، صورتی، طلایی، نقره‌ای، خاکستری — are themselves nouns (orange the fruit, silver the metal, ...) with the ی suffix that turns a noun into \"of/like [that thing]\", the same pattern نارنج (nāranj, bitter orange) → نارنجی follows.",
  terms: [
    { term: "قرمز", romanization: "ghermez", definition: "red" },
    { term: "آبی", romanization: "ābi", definition: "blue" },
    { term: "سبز", romanization: "sabz", definition: "green" },
    { term: "سفید", romanization: "sefid", definition: "white" },
    { term: "سیاه", romanization: "siāh", definition: "black" },
    { term: "زرد", romanization: "zard", definition: "yellow" },
    { term: "بنفش", romanization: "banafsh", definition: "purple" },
    { term: "قهوه‌ای", romanization: "ghahve-i", definition: "brown (literally: \"coffee-colored\")" },
    { term: "نارنجی", romanization: "nārenji", definition: "orange" },
    { term: "صورتی", romanization: "surati", definition: "pink" },
    { term: "خاکستری", romanization: "khākestari", definition: "gray" },
    { term: "طلایی", romanization: "talāyi", definition: "gold" },
    { term: "نقره‌ای", romanization: "noghre-i", definition: "silver" },
    { term: "روشن", romanization: "roshan", definition: "light (as in \"light blue\", آبی روشن)" },
    { term: "تیره", romanization: "tire", definition: "dark (as in \"dark green\", سبز تیره)" },
  ],
};

const GLOSSARY_BY_COURSE: Record<string, GlossaryEntry[]> = {
  fa: [
    {
      id: "counting",
      title: "Counting",
      children: [CARDINAL_ENTRY, ORDINAL_ENTRY, TERMS_ENTRY],
    },
    {
      id: "time",
      title: "Time",
      children: [HOURS_MINUTES_ENTRY, TIME_EXPRESSIONS_ENTRY, RELATIVE_TIME_ENTRY],
    },
    COLORS_ENTRY,
  ],
};

/** This course's glossary tree, or empty when the course hasn't authored one yet — same shape as Sidebar's per-category derivation, so an empty course just shows no Glossary link at all. */
export function glossaryForCourse(courseCode: string | null | undefined): GlossaryEntry[] {
  if (!courseCode) return [];
  return GLOSSARY_BY_COURSE[courseCode] ?? [];
}

/** Walks `path` (leading-to-trailing id segments) down the tree. Returns null on any miss, so a stale/typo'd URL renders "not found" rather than the wrong entry. */
export function findGlossaryEntry(entries: GlossaryEntry[], path: string[]): GlossaryEntry | null {
  if (path.length === 0) return null;
  const [head, ...rest] = path;
  const match = entries.find((entry) => entry.id === head);
  if (!match) return null;
  if (rest.length === 0) return match;
  return match.children ? findGlossaryEntry(match.children, rest) : null;
}
