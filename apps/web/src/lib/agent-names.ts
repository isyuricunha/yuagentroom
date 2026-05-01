const ADJECTIVES = [
  'Smart',
  'Creative',
  'Efficient',
  'Quick',
  'Clever',
  'Brilliant',
  'Swift',
  'Bold',
  'Wise',
  'Curious',
];

const NOUNS = [
  'Agent',
  'Assistant',
  'Helper',
  'Worker',
  'Bot',
  'Partner',
  'Guide',
  'Advisor',
  'Analyst',
  'Expert',
];

export function generateRandomAgentName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}