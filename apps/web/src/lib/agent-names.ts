// Human first names (diverse, common names)
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Charlie', 'Sage', 'Reese', 'Phoenix', 'Dakota', 'Finley', 'River',
  'Skyler', 'Jamie', 'Kendall', 'Parker', 'Cameron', 'Emerson', 'Hayden',
  'Logan', 'Peyton', 'Blake', 'Ellis', 'Lennox', 'Marlowe', 'Rowan',
  'Sawyer', 'Spencer', 'Sydney'
];

// Last names for variety
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson'
];

export function generateRandomAgentName(): string {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}