const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const WEAK_WORDS = new Set([
  'good','bad','nice','big','small','very','really','just','many','few',
  'a lot','thing','stuff','get','got','make','do','use','used','said','say',
  'like','okay','ok','fine','great','cool','awesome','terrible','horrible'
]);

const STRONG_ALTERNATIVES = {
  good: ['exemplary','commendable','meritorious','proficient'],
  bad: ['detrimental','deleterious','pernicious','adverse'],
  nice: ['laudable','admirable','praiseworthy','commendable'],
  big: ['substantial','considerable','extensive','monumental'],
  small: ['minuscule','negligible','diminutive','marginal'],
  very: ['exceedingly','remarkably','substantially','considerably'],
  really: ['genuinely','evidently','demonstrably','verifiably'],
  just: ['merely','solely','exclusively','simply'],
  many: ['numerous','multitudinous','abundant','plentiful'],
  few: ['scant','sparse','limited','minimal'],
  thing: ['element','aspect','component','factor'],
  stuff: ['material','substance','content','matter'],
  get: ['obtain','acquire','achieve','attain'],
  make: ['construct','formulate','generate','produce'],
  like: ['similar to','akin to','analogous to','comparable to'],
  great: ['outstanding','exceptional','distinguished','remarkable'],
  cool: ['innovative','sophisticated','compelling','noteworthy'],
  awesome: ['extraordinary','remarkable','impressive','astounding'],
  terrible: ['deplorable','abysmal','egregious','catastrophic'],
  horrible: ['atrocious','appalling','dreadful','execrable'],
  okay: ['acceptable','adequate','sufficient','satisfactory'],
  fine: ['adequate','satisfactory','acceptable','reasonable']
};

function tokenize(text) {
  return text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
}

function calculateLexicalDiversity(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  const unique = new Set(tokens);
  const ttr = unique.size / tokens.length;
  return Math.round(Math.min(ttr * 150, 100));
}

function findWeakWords(text) {
  const tokens = tokenize(text);
  const found = new Set();
  tokens.forEach(t => { if (WEAK_WORDS.has(t)) found.add(t); });
  return [...found].slice(0, 8);
}

function getSuggestions(weakWords) {
  return weakWords.map(w => {
    const alts = STRONG_ALTERNATIVES[w];
    if (alts) return `Instead of "${w}", try: ${alts.slice(0, 2).join(', ')}`;
    return `Consider a stronger alternative for "${w}"`;
  });
}

function analyzeSentiment(text) {
  const result = sentiment.analyze(text);
  if (result.score > 3) return 'positive';
  if (result.score < -3) return 'negative';
  if (result.score > 0) return 'slightly positive';
  if (result.score < 0) return 'slightly negative';
  return 'neutral';
}

function generateSummary(text, weakWords, lexScore) {
  const wordCount = tokenize(text).length;
  const grade = lexScore >= 70 ? 'strong' : lexScore >= 45 ? 'moderate' : 'developing';
  const weakNote = weakWords.length > 0
    ? ` Watch out for overused words: ${weakWords.slice(0, 3).join(', ')}.`
    : ' Excellent vocabulary variety!';
  return `You used ${wordCount} words with a ${grade} lexical diversity score of ${lexScore}/100.${weakNote}`;
}

exports.analyzeDebate = function (transcriptA, transcriptB) {
  const textA = transcriptA.map(m => m.content).join(' ');
  const textB = transcriptB.map(m => m.content).join(' ');

  const lexA = calculateLexicalDiversity(textA);
  const lexB = calculateLexicalDiversity(textB);
  const weakA = findWeakWords(textA);
  const weakB = findWeakWords(textB);
  const sentA = analyzeSentiment(textA);
  const sentB = analyzeSentiment(textB);
  const sugA = getSuggestions(weakA);
  const sugB = getSuggestions(weakB);

  const vocabScoreA = Math.round((lexA * 0.7) + ((10 - weakA.length) * 3));
  const vocabScoreB = Math.round((lexB * 0.7) + ((10 - weakB.length) * 3));

  let winner = 'draw';
  if (vocabScoreA > vocabScoreB + 5) winner = 'A';
  else if (vocabScoreB > vocabScoreA + 5) winner = 'B';

  return {
    lexicalDiversityA: lexA,
    lexicalDiversityB: lexB,
    sentimentA: sentA,
    sentimentB: sentB,
    vocabScoreA,
    vocabScoreB,
    weakWordsA: weakA,
    weakWordsB: weakB,
    suggestionsA: sugA,
    suggestionsB: sugB,
    summaryA: generateSummary(textA, weakA, lexA),
    summaryB: generateSummary(textB, weakB, lexB),
    winner
  };
};

exports.filterProfanity = function (text) {
  const profanityList = ['fuck','shit','damn','crap','ass','bitch','bastard','idiot','stupid','moron'];
  let filtered = text;
  profanityList.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  const wasFiltered = filtered !== text;
  return { filtered, wasFiltered };
};

exports.calculateEloChange = function (winnerRating, loserRating) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const winnerChange = Math.round(K * (1 - expected));
  const loserChange = Math.round(K * (0 - expected));
  return { winnerChange, loserChange };
};