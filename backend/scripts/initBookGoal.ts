import { GoalsDB } from '../db/goalsStore.js';

// Initialize the book reading goal - read a book every week for the whole year
async function initBookGoal() {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  // One period for the entire year with weekly frequency
  const goal = await GoalsDB.create({
    name: 'Read a book every week',
    start: yearStart,
    end: yearEnd,
    frequency: 'weekly',
    entries: []
  });

  console.log('Book reading goal created:', goal._id);
  return goal;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initBookGoal()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { initBookGoal };
