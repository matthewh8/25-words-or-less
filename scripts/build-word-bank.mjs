#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_OUTPUT_PATH = 'data/words/word-bank.json'
const DEFAULT_TARGET_TOTAL = 50000
const DEFAULT_MONEY_TARGET = 2000
const SINGLE_DECK_TARGET_WEIGHTS = {
  green: 16000,
  yellow: 16000,
  red: 16000,
}
const SINGLE_DECK_TARGET_WEIGHT_TOTAL = Object.values(SINGLE_DECK_TARGET_WEIGHTS)
  .reduce((total, weight) => total + weight, 0)
const RAW_DIR = 'data/words/raw'
const SEED_PATH = 'data/words/seed-decks.json'

const ESDB_VERSION = '2026.02.25'
const ESDB_RELEASE_REF = 'rel-2026.02.25'
const ESDB_DEFAULT_URL = `https://raw.githubusercontent.com/en-wl/wordlist-diff/${ESDB_RELEASE_REF}/en_US.txt`
const ESDB_LARGE_URL = `https://raw.githubusercontent.com/en-wl/wordlist-diff/${ESDB_RELEASE_REF}/en_US-large.txt`
const CMUDICT_URL = 'https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict'
const OEWN_URL = 'https://en-word.net/static/english-wordnet-2025.zip'

const WORD_ENTRY_PATTERN = /^[A-Z0-9][A-Z0-9 ]*$/
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

const BLOCKED_WORDS = new Set([
  'ABORT',
  'ABORTED',
  'ABORTING',
  'ABORTION',
  'ABORTIONS',
  'ABUSE',
  'ABUSED',
  'ABUSES',
  'ABUSING',
  'ABUSIVE',
  'ASSAULT',
  'ASSAULTED',
  'ASSAULTING',
  'ASSAULTS',
  'ANAL',
  'AMPHETAMINE',
  'BITCH',
  'COCK',
  'CUNT',
  'DICK',
  'DICKHEAD',
  'DISMEMBER',
  'DISMEMBERED',
  'DISMEMBERING',
  'DISMEMBERS',
  'DRUG',
  'DRUGGED',
  'DRUGGING',
  'DRUGS',
  'FAG',
  'FAGGOT',
  'FASCISM',
  'FASCIST',
  'FASCISTS',
  'FUCK',
  'FUCKED',
  'FUCKER',
  'FUCKING',
  'GANGBANGER',
  'GANGBANGERS',
  'GENOCIDE',
  'GOOK',
  'GUN',
  'GUNFIGHTER',
  'GUNFIGHTERS',
  'GUNMAN',
  'GUNMEN',
  'GUNS',
  'GYP',
  'GYPPED',
  'GYPPING',
  'GYPSY',
  'HOLOCAUST',
  'HOMICIDE',
  'INCEST',
  'INTERCOURSE',
  'MAIM',
  'MAIMED',
  'MAIMING',
  'MAIMS',
  'MASSACRE',
  'MASTURBATE',
  'MASTURBATED',
  'MASTURBATES',
  'MASTURBATING',
  'MASTURBATION',
  'MOLEST',
  'MOLESTED',
  'MOLESTING',
  'MOLESTS',
  'MURDER',
  'MURDERED',
  'MURDERER',
  'MURDERERS',
  'MURDERING',
  'MURDERS',
  'NAZI',
  'NAZIS',
  'NIGGA',
  'NIGGER',
  'ORGY',
  'ORGIES',
  'PORN',
  'PORNO',
  'PORNOGRAPHY',
  'PISS',
  'PISSED',
  'PISSING',
  'PSYCHOSIS',
  'PSYCHOTIC',
  'RAPE',
  'RAPED',
  'RAPIST',
  'RAPISTS',
  'RAPING',
  'RACISM',
  'RACIST',
  'RACISTS',
  'RETARD',
  'SEX',
  'CONTRACEPTION',
  'CONTRACEPTIVE',
  'CONTRACEPTIVES',
  'SEXUAL',
  'SEXUALLY',
  'SHIT',
  'SLAVE',
  'SLAVERY',
  'SLUT',
  'SUICIDE',
  'SUICIDES',
  'SUICIDAL',
  'SUPREMACIST',
  'SUPREMACISTS',
  'TERRORISM',
  'TERRORIST',
  'TERRORISTS',
  'TORTURE',
  'TORTURED',
  'TORTURES',
  'TORTURING',
  'TRAFFICKER',
  'TRAFFICKERS',
  'TRAFFICKING',
  'VIBRATOR',
  'VIBRATORS',
  'WHORE',
])

const BLOCKED_PATTERNS = [
  /^PEDOPHIL/,
]

const EASY_WORDS = new Set([
  'APPLE', 'BABY', 'BALL', 'BANK', 'BEACH', 'BED', 'BIKE', 'BIRD', 'BOOK', 'BREAD',
  'BUS', 'CAKE', 'CAR', 'CAT', 'CHAIR', 'CHEESE', 'CITY', 'CLOCK', 'CLOUD', 'COAT',
  'COFFEE', 'COLD', 'COOK', 'DANCE', 'DOG', 'DOOR', 'DRINK', 'EAGLE', 'EAR', 'EGG',
  'FAMILY', 'FARM', 'FIRE', 'FISH', 'FOOD', 'FOOT', 'FORK', 'FRIEND', 'GAME', 'GARDEN',
  'GIRL', 'GLASS', 'GOLD', 'HAND', 'HAPPY', 'HAT', 'HOME', 'HOUSE', 'ICE', 'JOB',
  'KEY', 'KING', 'KITCHEN', 'LAKE', 'LAMP', 'LEG', 'LIGHT', 'LOVE', 'MAN', 'MILK',
  'MONEY', 'MOON', 'MOTHER', 'MOUNTAIN', 'MOUSE', 'MUSIC', 'NIGHT', 'NOSE', 'PAPER', 'PARK',
  'PARTY', 'PHONE', 'PIZZA', 'RAIN', 'RICE', 'ROAD', 'ROOM', 'SCHOOL', 'SHOE', 'SHOP',
  'SONG', 'STAR', 'STREET', 'SUN', 'TABLE', 'TEAM', 'TREE', 'WATER', 'WOMAN', 'WORD',
  'AIRPLANE', 'BACKPACK', 'BASEBALL', 'BIRTHDAY', 'BUTTERFLY', 'CASTLE', 'COWBOY',
  'COWGIRL', 'CUPCAKE', 'DINOSAUR', 'DRAGON', 'ELEPHANT', 'FOOTBALL', 'GIRAFFE',
  'HAMBURGER', 'MERMAID', 'MONSTER', 'NOTEBOOK', 'PANCAKE', 'PINEAPPLE', 'PUMPKIN',
  'RAINBOW', 'ROBOT', 'SANDWICH', 'SNOWMAN', 'SPAGHETTI', 'TEACHER', 'TORNADO',
  'TREASURE', 'UMBRELLA', 'VOLCANO', 'WATERMELON',
])

const ABSTRACT_SUFFIXES = [
  'ABILITY',
  'ANCE',
  'ENCE',
  'HOOD',
  'ISM',
  'ITY',
  'MENT',
  'NESS',
  'OLOGY',
  'SHIP',
  'SION',
  'TION',
]

const HARD_SUFFIXES = [
  'CIAL',
  'CIENT',
  'GRAPHY',
  'ICAL',
  'IZATION',
  'OLOGICAL',
  'SOPHY',
  'TATIVE',
]

const PREFIX_PENALTIES = [
  /^ANTI[A-Z]{5,}/,
  /^COUNTER[A-Z]{5,}/,
  /^HYPER[A-Z]{5,}/,
  /^INTER[A-Z]{6,}/,
  /^MIS[A-Z]{6,}/,
  /^MULTI[A-Z]{5,}/,
  /^NON[A-Z]{6,}/,
  /^OVER[A-Z]{6,}/,
  /^PRE[A-Z]{7,}/,
  /^RE[A-Z]{8,}/,
  /^SUB[A-Z]{6,}/,
  /^SUPER[A-Z]{5,}/,
  /^TRANS[A-Z]{5,}/,
  /^UNDER[A-Z]{5,}/,
  /^UN[A-Z]{7,}/,
]

const INFLECTION_PATTERNS = [
  /[A-Z]{5,}INGS$/,
  /[A-Z]{5,}ING$/,
  /[A-Z]{5,}ED$/,
  /[A-Z]{5,}IES$/,
  /[A-Z]{5,}ES$/,
  /[A-Z]{5,}S$/,
]

const PHRASE_JARGON_COMPONENTS = new Set([
  'ABDOMINAL',
  'ACCOUNTING',
  'ACADEMIC',
  'ACCELERATION',
  'ACETATE',
  'ACID',
  'ACIDIC',
  'ADRENERGIC',
  'ADAPTER',
  'ADJUDICATION',
  'ADJUTANT',
  'ADMINISTRATIVE',
  'AERIAL',
  'AERONAUTICAL',
  'AEROSPACE',
  'AGRICULTURAL',
  'ALGEBRA',
  'ALGEBRAIC',
  'ALGORITHM',
  'ANATOMY',
  'ANEURYSM',
  'ANNUAL',
  'ANTIBODY',
  'ANTIGEN',
  'ANTENNA',
  'AORTA',
  'AORTIC',
  'ARTERIAL',
  'ARTERY',
  'BACTERIA',
  'BIOLOGICAL',
  'BOTANICAL',
  'BOTANY',
  'BUREAU',
  'CALCULUS',
  'CAPITAL',
  'CARRIER',
  'CARDIAC',
  'CASE',
  'CELL',
  'CHEMICAL',
  'CHEMISTRY',
  'CIVIL',
  'CLINICAL',
  'COEFFICIENT',
  'COMMITTEE',
  'COMPUTATIONAL',
  'COMPUTER',
  'CONDENSER',
  'CONSTITUTIONAL',
  'CORPORATION',
  'CRANIAL',
  'DAMAGES',
  'DEPARTMENT',
  'DETERGENT',
  'DEVICE',
  'DIAGRAM',
  'DIGITAL',
  'DIODE',
  'DISEASE',
  'DISEASED',
  'ECONOMIC',
  'ELECTRICAL',
  'ENCODER',
  'ENGINEERING',
  'ENGINEER',
  'FACTOR',
  'FEDERAL',
  'FREQUENCY',
  'GENUS',
  'GOVERNMENT',
  'GROUP',
  'INDICATOR',
  'INDUSTRIAL',
  'INTEGRAL',
  'INSTITUTE',
  'JUDICIAL',
  'LANGUAGE',
  'LEGAL',
  'LEGISLATIVE',
  'MATERIAL',
  'MEDICAL',
  'MEMBRANE',
  'MODEM',
  'MILITARY',
  'MUSCLE',
  'NERVE',
  'NEURAL',
  'ORGANIC',
  'OSCILLATOR',
  'PARLIAMENTARY',
  'PLACEBO',
  'PHYSICS',
  'POLITICAL',
  'PROCEDURE',
  'PROPELLER',
  'PROGRAM',
  'PSYCHOLOGY',
  'QUANTUM',
  'RADIAL',
  'RADIANT',
  'RADIUS',
  'RECEIVER',
  'REFLEX',
  'RECESSIVE',
  'REGULATION',
  'ROUTINE',
  'SCANNER',
  'SCIENTIFIC',
  'SEIZURE',
  'SPECTRUM',
  'STORAGE',
  'STATISTICAL',
  'SYNDROME',
  'SYSTEM',
  'TEMPERATURE',
  'TERMINAL',
  'THEOREM',
  'TRANSMITTER',
  'UNIT',
  'VEIN',
  'VERTEBRAL',
  'VISCOSITY',
])

const MONEY_SOURCE_ANCHOR_WORDS = new Set([
  'AIR', 'AIRPLANE', 'ANCHOVY', 'APRICOT', 'AUDIO', 'AWARD',
  'BACKSTAGE', 'BACKYARD', 'BALLOON', 'BARBECUE', 'BASS', 'BATTERY',
  'BEACH', 'BILLIARD', 'BIRTHDAY', 'BLACK', 'BOARD', 'BOBA', 'BOTTLE',
  'BRAIN', 'BRUNCH', 'CALENDAR', 'CAMPER', 'CAMPUS', 'CARD', 'CELERY',
  'CENTER', 'CEREAL', 'CHAMPAGNE', 'CHEESE', 'CHOCOLATE', 'CLASS',
  'CLOWN', 'COCONUT', 'COFFEE', 'COLLEGE', 'COMIC', 'COSTUME',
  'COUNTDOWN', 'CRASH', 'CREAM', 'DANCE', 'DESSERT', 'DORM', 'DRAMA',
  'ELECTRIC', 'EMAIL', 'ENERGY', 'ESCAPE', 'FAIRY', 'FAMILY',
  'FANTASY', 'FASHION', 'FEEDING', 'FILM', 'FINAL', 'FIRE', 'FLYING',
  'FOAM', 'FOOD', 'FOOTBALL', 'FRAT', 'FRIEND', 'FROZEN', 'FUNNY',
  'GAME', 'GELATIN', 'GENERAL', 'GHOST', 'GRAD', 'GREETING',
  'GROCERY', 'GROUP', 'GUIDING', 'GUITAR', 'HALL', 'HAUNTED',
  'HIDDEN', 'HOMECOMING', 'HOT', 'HOUSE', 'ICE', 'INSIDE', 'INSTANT',
  'JAZZ', 'JUKEBOX', 'KARAOKE', 'KETCHUP', 'KITCHEN', 'LAUNDRY',
  'LASER', 'LIBRARY', 'LIVE', 'LOCKER', 'MAGIC', 'MARCHING', 'MASCOT',
  'MIDNIGHT', 'MIDTERM', 'MOVIE', 'MUSIC', 'MYSTERY', 'NERVOUS',
  'NURSING', 'OPEN', 'OUTDOOR', 'OUTER', 'PARKING', 'PARTY', 'PASTRY',
  'PEP', 'PHONE', 'PHOTO', 'PILLOW', 'PINBALL', 'PIZZA', 'PODCAST',
  'POOL', 'POP', 'PRANK', 'PROM', 'RADIO', 'RAIN', 'RED', 'ROAD',
  'ROLLER', 'ROOFTOP', 'SCHOOL', 'SELFIE', 'SHOPPING', 'SKATING',
  'SLEEPOVER', 'SNACK', 'SNOW', 'SOAP', 'SODA', 'SPACE', 'SPEECH',
  'SPORTS', 'SPRING', 'SUMMER', 'SURPRISE', 'TACO', 'TAILGATE',
  'TALENT', 'TEAM', 'TEXT', 'THEATER', 'THEME', 'THRIFT', 'TIKTOK',
  'TOGA', 'TOMATO', 'TRIVIA', 'UGLY', 'URBAN', 'VENDING', 'VICTORY',
  'VIDEO', 'VIP', 'VISUAL', 'VOICE', 'WATER', 'WEEKEND', 'WIFI',
  'YEARBOOK', 'YOGA', 'ZIP', 'ZOOM',
])

const MONEY_SOURCE_ALLOWLIST = new Set([
  'AIRPLANE LANDING',
  'AIRPLANE PILOT',
  'ANCHOVY PIZZA',
  'ANCHOVY SAUCE',
  'APRICOT SAUCE',
  'ARENA THEATER',
  'AUDIO DRAMA',
  'BARBECUE SAUCE',
  'BASEBALL CARD',
  'BASS GUITAR',
  'BATHING COSTUME',
  'BATTERY CHARGER',
  'BILLIARD HALL',
  'BLACK COMEDY',
  'BLACK PEPPER',
  'BOTTLE OPENER',
  'CALENDAR WEEK',
  'CALLING CARD',
  'CAMPER TRAILER',
  'CARD TRICK',
  'CELERY STICK',
  'CENTER STAGE',
  'CEREAL BOWL',
  'CHAMPAGNE FLUTE',
  'CHICKEN TACO',
  'CHOCOLATE CANDY',
  'CHOCOLATE FONDUE',
  'CHOCOLATE FUDGE',
  'CHOCOLATE KISS',
  'CHOCOLATE MOUSSE',
  'CHOCOLATE PUDDING',
  'CHOCOLATE SAUCE',
  'CHOCOLATE SYRUP',
  'CHOCOLATE TRUFFLE',
  'CLOTTED CREAM',
  'COCONUT CREAM',
  'COCONUT MEAT',
  'COLLEGE STUDENT',
  'COSTUME DESIGNER',
  'CREDIT CARD',
  'CUTTING BOARD',
  'DANISH PASTRY',
  'DINNER THEATER',
  'DIVING BOARD',
  'DRAWING BOARD',
  'DRIED APRICOT',
  'ELECTRIC BATTERY',
  'ELECTRIC BELL',
  'ELECTRIC BILL',
  'ELECTRIC BLANKET',
  'ELECTRIC CORD',
  'ELECTRIC DRILL',
  'ELECTRIC GUITAR',
  'ELECTRIC HEATER',
  'ELECTRIC IRON',
  'ELECTRIC LIGHT',
  'ELECTRIC MIXER',
  'ELECTRIC OUTLET',
  'ELECTRIC OVEN',
  'ELECTRIC RAZOR',
  'ELECTRIC SHAVER',
  'EMAIL ADDRESS',
  'EMAIL MESSAGE',
  'FAIRY STORY',
  'FAMILY DOCTOR',
  'FASHION DESIGNER',
  'FASHION MODEL',
  'FEEDING BOTTLE',
  'FIGURE SKATING',
  'FILM DIRECTOR',
  'FILM EDITING',
  'FILM FESTIVAL',
  'FOOTBALL COACH',
  'FOOTBALL FIELD',
  'FOOTBALL HELMET',
  'FOOTBALL HERO',
  'FOOTBALL SEASON',
  'FROZEN CUSTARD',
  'FROZEN DESSERT',
  'FROZEN YOGURT',
  'FUNNY REMARK',
  'FUNNY STORY',
  'GELATIN DESSERT',
  'GENERAL STORE',
  'GHOST STORY',
  'GREETING CARD',
  'GROCERY LIST',
  'GROCERY STORE',
  'GUIDING LIGHT',
  'GUITAR PLAYER',
  'HEAVY CREAM',
  'INSIDE TRACK',
  'INSTANT REPLAY',
  'IRONING BOARD',
  'JAZZ FESTIVAL',
  'JAZZ MUSICIAN',
  'KETCHUP BOTTLE',
  'KEYNOTE SPEECH',
  'KITCHEN UTENSIL',
  'LASER PRINTER',
  'LAUNDRY BASKET',
  'LAUNDRY CART',
  'LAUNDRY TRUCK',
  'LIBRARY CARD',
  'MAGIC LANTERN',
  'MARCHING MUSIC',
  'MIDTERM EXAM',
  'MODERN JAZZ',
  'MOVIE ACTOR',
  'MOVIE CAMERA',
  'MOVIE MAKER',
  'MOVIE THEATER',
  'MUSIC DIRECTOR',
  'MYSTERY NOVEL',
  'MYSTERY STORY',
  'NARROW ESCAPE',
  'NURSING BOTTLE',
  'ORANGE SODA',
  'OUTDOOR SPORT',
  'OUTDOOR STAGE',
  'OUTER SPACE',
  'PARKING METER',
  'PARKING ZONE',
  'PASTRY CART',
  'PASTRY DOUGH',
  'PHOTO FINISH',
  'PLUM TOMATO',
  'POPULAR MUSIC',
  'POSTAL CARD',
  'RADIO BROADCAST',
  'RADIO DRAMA',
  'RADIO NEWS',
  'RADIO THEATER',
  'ROLLER COASTER',
  'ROLLER SKATE',
  'ROLLER SKATING',
  'RUGBY FOOTBALL',
  'SANDWICH BOARD',
  'SAUSAGE BALLOON',
  'SHAVING FOAM',
  'SHOPPING BASKET',
  'SHOPPING CENTER',
  'SHOPPING LIST',
  'SHOPPING MALL',
  'SINGING VOICE',
  'SKATING RINK',
  'SNACK COUNTER',
  'SODA BOTTLE',
  'SODA CRACKER',
  'SOLAR CALENDAR',
  'SPACE CADET',
  'SPACE SHUTTLE',
  'SPACE TRAVEL',
  'SPEECH BALLOON',
  'SPEECH BUBBLE',
  'SPEED SKATING',
  'SPORTS ARENA',
  'SPRING ONION',
  'STUDENT CENTER',
  'SUMMER SQUASH',
  'SWIMMING COSTUME',
  'SWIMMING POOL',
  'SYMPATHY CARD',
  'THEATER CURTAIN',
  'THEATER DIRECTOR',
  'THEATER LIGHT',
  'THEATER STAGE',
  'THERMOS BOTTLE',
  'THROW PILLOW',
  'TOMATO JUICE',
  'TOMATO KETCHUP',
  'TOMATO PASTE',
  'TOMATO SAUCE',
  'TOOTH FAIRY',
  'TOUCH FOOTBALL',
  'UGLY DUCKLING',
  'URBAN LEGEND',
  'VALET PARKING',
  'VAUDEVILLE THEATER',
  'VISUAL JOKE',
  'VOICE OVER',
  'WRITING BOARD',
])

const MONEY_AUTO_BLOCKED_COMPONENTS = new Set([
  'ABDUCTION',
  'ACCOUNT',
  'AGENT',
  'ALTAR',
  'APPROVAL',
  'ARBITER',
  'AXLE',
  'BALLOT',
  'BARRAGE',
  'BASSOON',
  'BATTLE',
  'BEARING',
  'BINARY',
  'BOMB',
  'BOMBING',
  'BUTLER',
  'CALIPER',
  'CASSOCK',
  'CANNON',
  'CHAMBER',
  'CHECK',
  'CINNAMON',
  'CLEANSER',
  'CLINCH',
  'CLOAK',
  'CLOAKROOM',
  'CLOSET',
  'COBALT',
  'CONSORT',
  'CRIMINAL',
  'CRITIC',
  'CROCHET',
  'DAGGER',
  'DAMAGE',
  'DIPPER',
  'DIPOLE',
  'DODGER',
  'DOWAGER',
  'DRAFT',
  'DRAFTING',
  'DUDGEON',
  'ENTRY',
  'EXPERT',
  'FLAT',
  'FODDER',
  'FRANKING',
  'HANGAR',
  'HURRAH',
  'JINKS',
  'LAPPING',
  'LATENCY',
  'LIEN',
  'LIQUOR',
  'MACHINE',
  'GUN',
  'GUNNER',
  'GYPSUM',
  'MEGATON',
  'MILLING',
  'MOORING',
  'MOURNING',
  'NUCLEAR',
  'PARDON',
  'PARTICLE',
  'PAWN',
  'PHALLIC',
  'PISTOL',
  'PLANNING',
  'PLASTER',
  'POLICY',
  'PRIMARY',
  'PROJECT',
  'PYLON',
  'QUEEN',
  'REACTOR',
  'REFLEX',
  'REGENT',
  'RELIEF',
  'RESERVE',
  'RESORT',
  'RESPECTS',
  'REVERSE',
  'RIFLE',
  'ROCKET',
  'SAUCEPAN',
  'SCANNING',
  'SHAPING',
  'SHARP',
  'SHOVEL',
  'SIMPLEX',
  'SPIRIT',
  'STANDARD',
  'STOPPING',
  'SURGERY',
  'TAKEOFF',
  'TELEX',
  'THERAPY',
  'TICKET',
  'TOUT',
  'TRADER',
  'VALVE',
  'VEHICLE',
  'VOTING',
  'WARPING',
  'WEIGHING',
  'WHISKEY',
  'WORKER',
])

const MONEY_AUTO_BAD_PHRASE_PATTERNS = [
  /\b(ABDUCTION|AEROSOL|ATOMIC|BOMBING|BRIEFCASE|CARPET BOMB|CRIMINAL|GUNNER|MEGATON|NUCLEAR|PHALLIC|PISTOL|RIFLE|SURGERY|WARHEAD)\b/,
  /\bCOMFORT WOMAN\b/,
  /\b(BATTLE|BOMB|CANNON|MACHINE|REACTOR|ROCKET)\b.*\b(BATTLE|BOMB|CANNON|MACHINE|REACTOR|ROCKET)\b/,
  /\b(DOUBLE|FREE|HIGH|LAST|LOWER|OPEN|POWER|SECRET|SILENT|TICKET|UPPER)\b/,
]

const BAD_PHRASE_GLOSS_PATTERNS = [
  /\b(accounting|acidosis|adapter|algebra|algorithm|anesthetic|anatomy|antibody|antigen|aphasia|artery|assay|audit|bacteria|calculus|chemical|chemistry|circuit|clause|coefficient|colon|computer|consonant|controller|diagnostic|diode|disease|disk|disorder|electronic|enzyme|fracture|frequency|gastritis|geometry|grammar|hepatitis|infection|integral|leukemia|linguistic|machine|matrix|medical|medicine|molecule|nerve|oscillator|pathology|physics|pronoun|protein|quantum|renal|retina|seizure|software|spectrum|surgery|syndrome|syntax|terminal|theorem|transmitter|variable|vertebral|viscosity|vowel)\b/i,
  /\b(assets|attorney|ballot|capital|court|criminal|damages|diplomacy|dividend|income|legal|liability|litigation|pardon|plea|revenue|tax|tariff|verdict|voting|warrant)\b/i,
  /\b(flower|genus|herb|orchid|plant|shrub|species|tree|vine)\b/i,
  /\b(atom|atomic|bomb|explosive|gun|military|missile|nuclear|pistol|reactor|rifle|weapon)\b/i,
  /\b(alcohol|intercourse|liquor|phallic|sexual|whiskey)\b/i,
]

const PHRASE_LEX_FILE_PENALTIES = new Map([
  [4, -1],
  [5, 1],
  [6, -1],
  [9, 1.5],
  [10, -0.5],
  [11, -0.5],
  [12, -0.5],
  [13, -1],
  [14, 0.75],
  [15, -0.25],
  [17, -1],
  [18, -0.5],
  [21, 0],
  [28, 0],
])

const args = process.argv.slice(2)
const options = { refresh: false }

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--refresh') {
    options.refresh = true
    continue
  }

  if (!['--output', '--target'].includes(arg)) {
    console.error(`Unknown option: ${arg}`)
    process.exit(1)
  }

  const value = args[i + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${arg}`)
    process.exit(1)
  }

  options[arg.slice(2)] = value
  i++
}

const outputPath = options.output ?? DEFAULT_OUTPUT_PATH
const targetTotal = Number(options.target ?? DEFAULT_TARGET_TOTAL)
if (!Number.isInteger(targetTotal) || targetTotal <= 0) {
  console.error('--target must be a positive integer')
  process.exit(1)
}

function cleanWord(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function spacingInsensitiveKey(value) {
  return cleanWord(value).replace(/\s/g, '')
}

function isRomanNumeralArtifact(word) {
  return word.length > 1
    && /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(word)
}

function isBlocked(word) {
  if (isRomanNumeralArtifact(word)) return true
  if (BLOCKED_WORDS.has(word)) return true
  return word.split(' ').some(part => (
    BLOCKED_WORDS.has(part)
    || BLOCKED_PATTERNS.some(pattern => pattern.test(part))
  ))
}

function isValidEntry(word) {
  return Boolean(word)
    && word.length <= 32
    && WORD_ENTRY_PATTERN.test(word)
    && !isBlocked(word)
}

function estimateSyllables(word) {
  const cleaned = word.replace(/[^A-Z]/g, '').toLowerCase()
  if (!cleaned) return 0
  const groups = cleaned.match(/[aeiouy]+/g) ?? []
  let count = groups.length
  if (cleaned.length > 3 && cleaned.endsWith('e')) count -= 1
  if (cleaned.endsWith('le') && cleaned.length > 2 && !/[aeiouy]/.test(cleaned.at(-3) ?? '')) count += 1
  return Math.max(1, count)
}

function cmuSyllables(phones) {
  if (!phones) return null
  const count = phones.filter(phone => /\d$/.test(phone)).length
  return count > 0 ? count : null
}

function suffixHit(word, suffixes) {
  return suffixes.some(suffix => word.endsWith(suffix))
}

function hasPrefixPenalty(word) {
  return PREFIX_PENALTIES.some(pattern => pattern.test(word))
}

function hasInflectionPenalty(word) {
  return INFLECTION_PATTERNS.some(pattern => pattern.test(word))
}

function rareLetterCount(word) {
  return (word.match(/[JQXZ]/g) ?? []).length
}

function auditDifficultyScore(candidate) {
  const word = candidate.word
  const syllables = cmuSyllables(candidate.cmuPhones) ?? estimateSyllables(word)
  const wordNetPos = candidate.wordNetPos
  let score = 0

  if (candidate.seedDecks.has('green')) score -= 2
  if (candidate.seedDecks.has('yellow')) score -= 0.5
  if (candidate.seedDecks.has('red')) score += 2

  if (EASY_WORDS.has(word)) score -= 4
  if (candidate.inDefault) score -= 1
  if (candidate.inLarge && !candidate.inDefault) score += 1.5
  if (!candidate.cmuPhones) score += 2
  if (!wordNetPos.size && !candidate.seedDecks.size) score += 1
  if (!candidate.seedDecks.size && !EASY_WORDS.has(word)) {
    if (word.length <= 4) score += 3
    else if (word.length <= 5) score += 3
    else if (word.length <= 6 && syllables <= 1) score += 0.75
  }

  if (wordNetPos.has('noun')) score -= 0.75
  if (wordNetPos.has('verb')) score -= 0.25
  if (wordNetPos.has('adv')) score += 1
  if (wordNetPos.size === 1 && wordNetPos.has('adj')) score += 0.5

  if (word.length <= 4) score -= 2
  else if (word.length === 5) score -= 1
  else if (word.length >= 13) score += 4
  else if (word.length >= 11) score += 3
  else if (word.length >= 9) score += 2
  else if (word.length >= 8) score += 1

  if (syllables <= 1) score -= 1.5
  else if (syllables === 2) score -= 0.5
  else if (syllables === 3) score += 1
  else if (syllables === 4) score += 2.5
  else if (syllables >= 5) score += 4

  if (suffixHit(word, ABSTRACT_SUFFIXES)) score += 3
  if (suffixHit(word, HARD_SUFFIXES)) score += 4
  if (!candidate.seedDecks.size && word.length <= 5 && word.endsWith('S')) score += 1.5
  if (word.endsWith('LY') && word.length > 5) score += 1.5
  if (word.endsWith('OUS') && word.length > 6) score += 1
  if (word.endsWith('IVE') && word.length > 6) score += 1
  if (word.endsWith('LESS') && word.length > 7) score += 1
  if (hasPrefixPenalty(word)) score += 1
  if (hasInflectionPenalty(word)) score += 0.75

  score += Math.min(2, rareLetterCount(word) * 0.5)
  if (/[BCDFGHJKLMNPQRSTVWXZ]{4,}/.test(word)) score += 1.5
  if (!/[AEIOUY]/.test(word)) score += 3

  return score
}

function phraseLexPenalty(lexFileNums) {
  if (!lexFileNums?.size) return 4
  return Math.min(...[...lexFileNums].map(value => PHRASE_LEX_FILE_PENALTIES.get(value) ?? 8))
}

function phraseDifficultyScore(phrase, components, seedPhrase, lexFileNums) {
  const words = phrase.split(' ')
  const totalChars = phrase.replace(/\s/g, '').length
  const componentScores = components.map(component => component.difficultyScore)
  const averageScore = componentScores.reduce((total, score) => total + score, 0) / componentScores.length
  const maxScore = Math.max(...componentScores)
  let score = averageScore + (words.length - 1) * 1.25

  if (seedPhrase) score -= 0.5
  else score += phraseLexPenalty(lexFileNums) * 0.5
  if (words.length === 3) score += 0.75
  if (words.length === 4) score += 2
  if (totalChars >= 24) score += 2
  else if (totalChars >= 20) score += 1
  if (maxScore >= 6) score += 2
  else if (maxScore >= 4) score += 1
  if (words.some(word => PHRASE_JARGON_COMPONENTS.has(word))) score += 2

  return score
}

function phraseQualityScore(phrase, components, seedPhrase, lexFileNums) {
  const words = phrase.split(' ')
  const totalChars = phrase.replace(/\s/g, '').length
  const maxComponentScore = Math.max(...components.map(component => component.difficultyScore))
  let score = seedPhrase ? -10 : 0

  score += words.length === 2 ? 0 : words.length === 3 ? 1 : 4
  if (!seedPhrase && MONEY_SOURCE_ALLOWLIST.has(phrase)) score -= 5
  if (!seedPhrase) score += Math.max(0, phraseLexPenalty(lexFileNums))
  if (totalChars > 26) score += 6
  else if (totalChars > 22) score += 3
  if (maxComponentScore > 8) score += 8
  else if (maxComponentScore > 6) score += 4
  else if (maxComponentScore > 4) score += 1
  score += components.filter(component => !component.cmuPhones).length * 5
  score += components.filter(component => !component.inDefault && !component.seedDecks.size).length
  score += words.filter(word => PHRASE_JARGON_COMPONENTS.has(word)).length * 4
  score += words.filter(word => suffixHit(word, ABSTRACT_SUFFIXES) || suffixHit(word, HARD_SUFFIXES)).length * 2
  if (/[BCDFGHJKLMNPQRSTVWXZ]{4,}/.test(phrase.replace(/\s/g, ''))) score += 2

  return score
}

function qualityScore(candidate) {
  let score = 0
  if (!candidate.seedDecks.size) score += 1
  if (!candidate.cmuPhones) score += 4
  if (!candidate.wordNetPos.size) score += 2
  if (!candidate.inDefault) score += 2
  if (candidate.inLarge && !candidate.inDefault) score += 1
  if (candidate.word.length < 4 && !EASY_WORDS.has(candidate.word)) score += 5
  if (candidate.word.length > 14) score += 1
  return score
}

async function downloadIfNeeded(targetPath, url) {
  if (!options.refresh && existsSync(targetPath)) return

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(targetPath, buffer)
}

function parseSeedBank(raw) {
  const value = JSON.parse(raw)
  const decks = value.decks
  if (!decks || typeof decks !== 'object') throw new Error(`${SEED_PATH} must include decks`)
  for (const deck of ['green', 'yellow', 'red', 'money']) {
    if (!Array.isArray(decks[deck])) throw new Error(`${SEED_PATH} decks.${deck} must be an array`)
  }
  return value
}

function parseScowl(raw, tier) {
  const candidates = []
  for (const line of raw.replace(/\r/g, '').split('\n')) {
    const original = line.trim()
    if (!/^[a-z]+$/.test(original)) continue
    if (original.length < 3 || original.length > 16) continue

    const word = original.toUpperCase()
    if (word.length < 4 && !EASY_WORDS.has(word)) continue
    if (!isValidEntry(word)) continue

    candidates.push({ word, tier })
  }
  return candidates
}

function parseCmu(raw) {
  const pronunciations = new Map()
  for (const line of raw.split(/\r?\n/)) {
    const [headword, ...phones] = line.trim().split(/\s+/)
    if (!headword || !/^[a-z]+(?:\(\d+\))?$/.test(headword)) continue
    const word = headword.replace(/\(\d+\)$/, '').toUpperCase()
    if (!pronunciations.has(word)) pronunciations.set(word, phones)
  }
  return pronunciations
}

function unzipText(zipPath, entryPath) {
  return execFileSync('unzip', ['-p', zipPath, entryPath], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  })
}

function addPos(map, word, pos) {
  const entry = map.get(word) ?? new Set()
  entry.add(pos)
  map.set(word, entry)
}

function addPhraseLex(map, phrase, lexFileNum) {
  const entry = map.get(phrase) ?? { phrase, lexFileNums: new Set(), glosses: [] }
  entry.lexFileNums.add(lexFileNum)
  map.set(phrase, entry)
}

function addPhraseGloss(map, phrase, gloss) {
  const entry = map.get(phrase)
  if (entry && gloss) entry.glosses.push(gloss)
}

function hasBadPhraseGloss(glosses) {
  return glosses.some(gloss => BAD_PHRASE_GLOSS_PATTERNS.some(pattern => pattern.test(gloss)))
}

function hasAutoMoneyPhraseBlock(phrase, words) {
  return words.some(word => MONEY_AUTO_BLOCKED_COMPONENTS.has(word))
    || MONEY_AUTO_BAD_PHRASE_PATTERNS.some(pattern => pattern.test(phrase))
}

function isPlayableMoneySourceComponent(component) {
  return Boolean(component.cmuPhones || component.seedDecks.size)
    && component.qualityScore <= 4
    && component.difficultyScore <= 2.5
    && (component.inDefault || component.seedDecks.size || EASY_WORDS.has(component.word))
}

function parseOpenEnglishWordNet(zipPath) {
  const words = new Map()
  const phrases = new Map()
  const indexFiles = [
    ['index.noun', 'noun'],
    ['index.verb', 'verb'],
    ['index.adj', 'adj'],
    ['index.adv', 'adv'],
  ]

  for (const [file, pos] of indexFiles) {
    const text = unzipText(zipPath, `oewn2025/${file}`)
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith(' ')) continue
      const lemma = line.split(/\s+/)[0]
      if (!/^[a-z_]+$/.test(lemma)) continue
      const word = lemma.replace(/_/g, ' ').toUpperCase()
      if (!word.includes(' ') && word.length >= 3 && word.length <= 16 && isValidEntry(word)) {
        addPos(words, word, pos)
      }
    }
  }

  const nounData = unzipText(zipPath, 'oewn2025/data.noun')
  for (const line of nounData.split(/\r?\n/)) {
    if (!/^\d/.test(line)) continue
    const [sourcePart, glossPart = ''] = line.split('|')
    const source = sourcePart?.trim()
    if (!source) continue
    const fields = source.split(/\s+/)
    const lexFileNum = Number(fields[1])
    const wordCount = Number.parseInt(fields[3] ?? '', 16)
    if (!Number.isFinite(lexFileNum) || !Number.isInteger(wordCount)) continue

    for (let i = 0; i < wordCount; i++) {
      const lemma = fields[4 + i * 2]
      if (!/^[a-z_]+$/.test(lemma) || !lemma.includes('_')) continue
      const phrase = lemma.replace(/_/g, ' ').toUpperCase()
      const parts = phrase.split(' ')
      if (parts.length >= 2 && parts.length <= 4 && isValidEntry(phrase)) {
        addPhraseLex(phrases, phrase, lexFileNum)
        addPhraseGloss(phrases, phrase, glossPart.trim())
      }
    }
  }

  return { words, phrases }
}

function upsertCandidate(candidates, rawWord) {
  const word = cleanWord(rawWord)
  if (!isValidEntry(word)) return null
  const nearKey = spacingInsensitiveKey(word)
  if (candidates.blockedNearKeys.has(nearKey)) return null
  const existing = candidates.byNearKey.get(nearKey)
  if (existing && existing !== word) return null

  let candidate = candidates.byWord.get(word)
  if (!candidate) {
    candidate = {
      word,
      seedDecks: new Set(),
      inDefault: false,
      inLarge: false,
      cmuPhones: null,
      wordNetPos: new Set(),
      difficultyScore: 0,
      qualityScore: 0,
    }
    candidates.byWord.set(word, candidate)
    candidates.byNearKey.set(nearKey, word)
  }
  return candidate
}

function assertSource(source) {
  if (!SOURCE_ID_PATTERN.test(source.id)) throw new Error(`Invalid source id: ${source.id}`)
  if (!/^(https?:\/\/|local:)/.test(source.url)) throw new Error(`Invalid source url: ${source.url}`)
}

function deckSourceIds(words) {
  const ids = new Set()
  for (const candidate of words) {
    if (candidate.seedDecks.size) {
      ids.add('cefr-j-olp')
      ids.add('curated-party')
    }
    if (candidate.inDefault || candidate.inLarge) ids.add('esdb-en-us-2026-02-25')
    if (candidate.cmuPhones) ids.add('cmudict')
    if (candidate.wordNetPos.size) ids.add('open-english-wordnet-2025')
  }
  return [...ids]
}

function asSortedWords(candidates) {
  return candidates.map(candidate => candidate.word).sort((a, b) => a.localeCompare(b))
}

function fallbackPhraseComponent(word) {
  return {
    word,
    seedDecks: new Set(),
    inDefault: false,
    inLarge: false,
    cmuPhones: null,
    wordNetPos: new Set(),
    difficultyScore: word.length <= 4 ? -1 : word.length >= 8 ? 2 : 0,
    qualityScore: word.length <= 4 ? 0 : 2,
  }
}

function buildMoneyCandidates(seedPhrases, sourcePhrases, singleCandidates) {
  const candidates = []
  const seen = new Set()

  function addPhrase(rawPhrase, seedPhrase, lexFileNums = new Set(), glosses = []) {
    const phrase = cleanWord(rawPhrase)
    const nearKey = spacingInsensitiveKey(phrase)
    if (seen.has(nearKey) || !isValidEntry(phrase)) return
    const words = phrase.split(' ')
    if (words.length < 2 || words.length > 4) return
    if (words.some(word => word.length < 2 || !isValidEntry(word))) return
    if (!seedPhrase && words.length > 3) return
    if (!seedPhrase && !words.some(word => MONEY_SOURCE_ANCHOR_WORDS.has(word) || EASY_WORDS.has(word))) return
    if (!seedPhrase && hasAutoMoneyPhraseBlock(phrase, words)) return
    if (!seedPhrase && phraseLexPenalty(lexFileNums) >= 8) return
    if (!seedPhrase && hasBadPhraseGloss(glosses)) return

    const components = words.map(word => singleCandidates.byWord.get(word) ?? (seedPhrase ? fallbackPhraseComponent(word) : null))
    if (components.some(component => !component)) return
    const resolvedComponents = components
    if (!seedPhrase && resolvedComponents.some(component => !isPlayableMoneySourceComponent(component))) return
    if (!seedPhrase && words.some(word => PHRASE_JARGON_COMPONENTS.has(word))) return

    const difficultyScore = phraseDifficultyScore(phrase, resolvedComponents, seedPhrase, lexFileNums)
    const qualityScoreValue = phraseQualityScore(phrase, resolvedComponents, seedPhrase, lexFileNums)
    candidates.push({
      phrase,
      seedPhrase,
      difficultyScore,
      qualityScore: qualityScoreValue,
      sourceIds: seedPhrase ? ['curated-party'] : ['open-english-wordnet-2025'],
    })
    seen.add(nearKey)
  }

  seedPhrases.forEach(phrase => addPhrase(phrase, true))
  sourcePhrases.forEach(sourcePhrase => addPhrase(sourcePhrase.phrase, false, sourcePhrase.lexFileNums, sourcePhrase.glosses))

  candidates.sort((a, b) => (
    a.qualityScore - b.qualityScore
    || Math.abs(a.difficultyScore - 4.25) - Math.abs(b.difficultyScore - 4.25)
    || a.phrase.split(' ').length - b.phrase.split(' ').length
    || a.phrase.length - b.phrase.length
    || a.phrase.localeCompare(b.phrase)
  ))

  return candidates
}

await mkdir(RAW_DIR, { recursive: true })

const rawPaths = {
  esdbDefault: path.join(RAW_DIR, `wordlist-en_US-${ESDB_VERSION}.txt`),
  esdbLarge: path.join(RAW_DIR, `wordlist-en_US-large-${ESDB_VERSION}.txt`),
  cmu: path.join(RAW_DIR, 'cmudict-master.dict'),
  oewn: path.join(RAW_DIR, 'english-wordnet-2025.zip'),
}

try {
  await Promise.all([
    downloadIfNeeded(rawPaths.esdbDefault, ESDB_DEFAULT_URL),
    downloadIfNeeded(rawPaths.esdbLarge, ESDB_LARGE_URL),
    downloadIfNeeded(rawPaths.cmu, CMUDICT_URL),
    downloadIfNeeded(rawPaths.oewn, OEWN_URL),
  ])
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not download word sources')
  process.exit(1)
}

const seed = parseSeedBank(await readFile(SEED_PATH, 'utf8'))
const cmu = parseCmu(await readFile(rawPaths.cmu, 'utf8'))
const oewn = parseOpenEnglishWordNet(rawPaths.oewn)
const scowlCandidates = [
  ...parseScowl(await readFile(rawPaths.esdbDefault, 'utf8'), 'default'),
  ...parseScowl(await readFile(rawPaths.esdbLarge, 'utf8'), 'large'),
]

const candidates = {
  byWord: new Map(),
  byNearKey: new Map(),
  blockedNearKeys: new Set(),
}
const rejected = {
  invalidSeed: 0,
  duplicateSeed: 0,
  invalidMoney: 0,
  duplicateMoney: 0,
  insufficientMoney: 0,
  nearDuplicateSource: 0,
  noPronunciationOrWordNet: 0,
}

for (const deck of ['green', 'yellow', 'red']) {
  for (const rawWord of seed.decks[deck]) {
    const candidate = upsertCandidate(candidates, rawWord)
    if (!candidate) {
      rejected.invalidSeed += 1
      continue
    }
    candidate.seedDecks.add(deck)
  }
}

for (const sourceCandidate of scowlCandidates) {
  const candidate = upsertCandidate(candidates, sourceCandidate.word)
  if (!candidate) {
    rejected.nearDuplicateSource += 1
    continue
  }
  if (sourceCandidate.tier === 'default') candidate.inDefault = true
  if (sourceCandidate.tier === 'large') candidate.inLarge = true
}

for (const candidate of candidates.byWord.values()) {
  candidate.cmuPhones = cmu.get(candidate.word) ?? null
  candidate.wordNetPos = oewn.words.get(candidate.word) ?? new Set()
  candidate.difficultyScore = auditDifficultyScore(candidate)
  candidate.qualityScore = qualityScore(candidate)
}

const moneyCandidates = buildMoneyCandidates(seed.decks.money, oewn.phrases, candidates)
const moneyCandidatePhrases = new Set(moneyCandidates.map(candidate => candidate.phrase))
for (const rawPhrase of seed.decks.money) {
  const phrase = cleanWord(rawPhrase)
  const words = phrase.split(' ')
  if (
    !moneyCandidatePhrases.has(phrase)
    && isValidEntry(phrase)
    && words.length >= 2
    && words.length <= 4
    && words.every(word => word.length >= 2 && isValidEntry(word))
  ) {
    const components = words.map(word => candidates.byWord.get(word) ?? fallbackPhraseComponent(word))
    moneyCandidates.push({
      phrase,
      seedPhrase: true,
      difficultyScore: phraseDifficultyScore(phrase, components, true, new Set()),
      qualityScore: phraseQualityScore(phrase, components, true, new Set()),
      sourceIds: ['curated-party'],
    })
    moneyCandidatePhrases.add(phrase)
  }
}
moneyCandidates.sort((a, b) => (
  a.qualityScore - b.qualityScore
  || Math.abs(a.difficultyScore - 4.25) - Math.abs(b.difficultyScore - 4.25)
  || a.phrase.split(' ').length - b.phrase.split(' ').length
  || a.phrase.length - b.phrase.length
  || a.phrase.localeCompare(b.phrase)
))
const moneyTarget = Math.min(DEFAULT_MONEY_TARGET, targetTotal - 1)
if (moneyCandidates.length < moneyTarget) {
  rejected.insufficientMoney = moneyTarget - moneyCandidates.length
  console.error(`Only ${moneyCandidates.length} money phrase candidates available; need ${moneyTarget}`)
  process.exit(1)
}
const seedMoneyCandidates = moneyCandidates.filter(candidate => candidate.seedPhrase)
const sourceMoneyCandidates = moneyCandidates.filter(candidate => !candidate.seedPhrase)
if (seedMoneyCandidates.length > moneyTarget) {
  console.error(`Seed money deck has ${seedMoneyCandidates.length} valid entries, exceeding target ${moneyTarget}`)
  process.exit(1)
}
const selectedMoneyCandidates = [
  ...seedMoneyCandidates,
  ...sourceMoneyCandidates.slice(0, moneyTarget - seedMoneyCandidates.length),
]
const moneyWords = selectedMoneyCandidates.map(candidate => candidate.phrase)
const moneyNearSeen = new Set(moneyWords.map(spacingInsensitiveKey))

const eligibleSingles = []
for (const candidate of candidates.byWord.values()) {
  if (moneyNearSeen.has(spacingInsensitiveKey(candidate.word))) continue
  if (candidate.seedDecks.size || candidate.cmuPhones || candidate.wordNetPos.size) {
    eligibleSingles.push(candidate)
  } else {
    rejected.noPronunciationOrWordNet += 1
  }
}

const targetSingles = targetTotal - moneyWords.length
if (targetSingles <= 0) {
  console.error(`Money deck has ${moneyWords.length} entries, leaving no room for single-word decks`)
  process.exit(1)
}

const seedSingles = eligibleSingles.filter(candidate => candidate.seedDecks.size)
const nonSeedSingles = eligibleSingles.filter(candidate => !candidate.seedDecks.size)
nonSeedSingles.sort((a, b) => (
  a.qualityScore - b.qualityScore
  || Math.abs(a.difficultyScore - 3) - Math.abs(b.difficultyScore - 3)
  || a.word.length - b.word.length
  || a.word.localeCompare(b.word)
))

const remainingSlots = targetSingles - seedSingles.length
if (remainingSlots < 0) {
  console.error(`Seed bank has ${seedSingles.length} single words, exceeding target ${targetSingles}`)
  process.exit(1)
}
if (nonSeedSingles.length < remainingSlots) {
  console.error(`Only ${nonSeedSingles.length} non-seed candidates available; need ${remainingSlots}`)
  process.exit(1)
}

const selectedSingles = [...seedSingles, ...nonSeedSingles.slice(0, remainingSlots)]
selectedSingles.sort((a, b) => (
  a.difficultyScore - b.difficultyScore
  || a.qualityScore - b.qualityScore
  || a.word.length - b.word.length
  || a.word.localeCompare(b.word)
))

const greenTarget = Math.round(targetSingles * SINGLE_DECK_TARGET_WEIGHTS.green / SINGLE_DECK_TARGET_WEIGHT_TOTAL)
const redTarget = Math.round(targetSingles * SINGLE_DECK_TARGET_WEIGHTS.red / SINGLE_DECK_TARGET_WEIGHT_TOTAL)
const yellowTarget = targetSingles - greenTarget - redTarget

const greenCandidates = selectedSingles.slice(0, greenTarget)
const yellowCandidates = selectedSingles.slice(greenTarget, greenTarget + yellowTarget)
const redCandidates = selectedSingles.slice(greenTarget + yellowTarget)

const sources = [
  ...seed.sources,
  {
    id: 'esdb-en-us-2026-02-25',
    name: 'ESDB / SCOWL American English wordlists',
    url: 'https://wordlist.aspell.net/dicts/',
    licenseNote: 'SCOWLv2 permits use, copy, modification, distribution, and sale of word lists created from it when the copyright and permission notice are retained in supporting documentation.',
    importedAt: '2026-05-20',
    transform: 'Downloaded en_US and en_US-large 2026.02.25 from en-wl/wordlist-diff; kept lowercase alphabetic entries only; removed unsafe, duplicate, near-duplicate, too-short, and too-long entries; prioritized quality before audit-bucketing.',
  },
  {
    id: 'cmudict',
    name: 'CMU Pronouncing Dictionary',
    url: 'https://github.com/cmusphinx/cmudict',
    licenseNote: 'Use for research or commercial purposes is unrestricted; redistribution requests acknowledgement of Carnegie Mellon University origin.',
    importedAt: '2026-05-20',
    transform: 'Used as the primary pronounceability filter and syllable signal so generated entries are practical to say aloud during play.',
  },
  {
    id: 'open-english-wordnet-2025',
    name: 'Open English WordNet 2025',
    url: 'https://en-word.net/',
    licenseNote: 'Released under Creative Commons Attribution 4.0 International (CC-BY 4.0).',
    importedAt: '2026-05-20',
    transform: 'Used as a part-of-speech and semantic-attestation signal; also fills the remaining single-word target count after CMUdict-filtered ESDB entries and contributes only curated allowlisted money-round phrases.',
  },
]

sources.forEach(assertSource)

const decks = {
  green: asSortedWords(greenCandidates),
  yellow: asSortedWords(yellowCandidates),
  red: asSortedWords(redCandidates),
  money: moneyWords.sort((a, b) => a.localeCompare(b)),
}

const deckCounts = Object.fromEntries(Object.entries(decks).map(([deck, words]) => [deck, words.length]))
const totalPlayableWords = deckCounts.green + deckCounts.yellow + deckCounts.red + deckCounts.money
const deckSourceIdsValue = {
  green: deckSourceIds(greenCandidates),
  yellow: deckSourceIds(yellowCandidates),
  red: deckSourceIds(redCandidates),
  money: [...new Set(selectedMoneyCandidates.flatMap(candidate => candidate.sourceIds))],
}

const generatedSingles = selectedSingles.filter(candidate => !candidate.seedDecks.size)
const auditSummary = {
  ruleBasis: 'Sorted selected single-word candidates by a 25 Words or Less difficulty score: clueability under 5-word boards, tight clue-word budgets, stack point risk, pronunciation evidence, source commonness, length, syllables, abstract morphology, inflection noise, and part of speech. Money entries are phrase-only and capped to reviewed final-round phrases because the money round draws 10 high-pressure answers from a 25-word clue budget.',
  targetDeckSplit: {
    green: greenTarget,
    yellow: yellowTarget,
    red: redTarget,
    money: moneyWords.length,
  },
  scoreBreaks: {
    greenMax: greenCandidates.at(-1)?.difficultyScore ?? null,
    yellowMin: yellowCandidates[0]?.difficultyScore ?? null,
    yellowMax: yellowCandidates.at(-1)?.difficultyScore ?? null,
    redMin: redCandidates[0]?.difficultyScore ?? null,
  },
  sample: {
    green: greenCandidates.slice(0, 20).map(candidate => candidate.word),
    yellow: yellowCandidates.slice(0, 20).map(candidate => candidate.word),
    red: redCandidates.slice(0, 20).map(candidate => candidate.word),
  },
}

const output = {
  generatedAt: new Date().toISOString(),
  targetPlayableWords: targetTotal,
  sources,
  deckSourceIds: deckSourceIdsValue,
  summary: {
    totalPlayableWords,
    deckCounts,
    seedCounts: Object.fromEntries(Object.entries(seed.decks).map(([deck, words]) => [deck, words.length])),
    sourceCounts: {
      esdbCandidates: scowlCandidates.length,
      mergedCandidates: candidates.byWord.size,
      cmudictEntries: cmu.size,
      openEnglishWordNetLemmas: oewn.words.size,
      openEnglishWordNetPhrases: oewn.phrases.size,
      eligibleMoneyPhrases: moneyCandidates.length,
      eligibleSingles: eligibleSingles.length,
    },
    additions: {
      total: generatedSingles.length,
      cmudict: generatedSingles.filter(candidate => candidate.cmuPhones).length,
      openEnglishWordNetFallback: generatedSingles.filter(candidate => !candidate.cmuPhones && candidate.wordNetPos.size).length,
      defaultEsdb: generatedSingles.filter(candidate => candidate.inDefault).length,
      largeEsdb: generatedSingles.filter(candidate => candidate.inLarge && !candidate.inDefault).length,
    },
    rejected,
    audit: auditSummary,
    moneyAudit: {
      target: moneyTarget,
      seedPhrases: selectedMoneyCandidates.filter(candidate => candidate.seedPhrase).length,
      openEnglishWordNetPhrases: selectedMoneyCandidates.filter(candidate => !candidate.seedPhrase).length,
      scoreRange: {
        min: Math.min(...selectedMoneyCandidates.map(candidate => candidate.difficultyScore)),
        max: Math.max(...selectedMoneyCandidates.map(candidate => candidate.difficultyScore)),
      },
      sample: selectedMoneyCandidates.slice(0, 20).map(candidate => candidate.phrase),
    },
  },
  decks,
}

if (totalPlayableWords !== targetTotal) {
  console.error(`Expected ${targetTotal} playable words, generated ${totalPlayableWords}`)
  process.exit(1)
}

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${outputPath}`)
console.log(JSON.stringify(output.summary, null, 2))
