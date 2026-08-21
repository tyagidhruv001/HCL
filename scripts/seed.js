// Boilerplate script to seed the database with MOCK courses catalog data
const MOCK_COURSES = [
  { id: 'w01', title: 'HTML & CSS Fundamentals', provider: 'freeCodeCamp', domain: 'web', level: 'beginner' },
  { id: 'w02', title: 'JavaScript Essentials', provider: 'Codecademy', domain: 'web', level: 'beginner' }
];

async function seed() {
  console.log('=== Seeding Database ===');
  console.log(`Inserting ${MOCK_COURSES.length} mock courses...`);
  // Future database insert logic
  console.log('Database seeded successfully!');
}

seed().catch(console.error);
