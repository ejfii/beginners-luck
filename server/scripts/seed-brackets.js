const { getConnection, createBracket, createMediatorProposal } = require('../database');

console.log('Seeding brackets and mediator proposals...');

// Demo user credentials: demo / demo123
const demoUserId = 1; // Assumes user with ID 1 exists from previous seed

const connection = getConnection();

// Helper to execute query as a Promise
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    connection.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function seedData() {
  try {
    // Find negotiations for the demo user
    const negotiations = await query(
      'SELECT id, name FROM negotiations WHERE user_id = ? LIMIT 2',
      [demoUserId]
    );

    if (negotiations.length === 0) {
      console.log('⚠️  No negotiations found. Run seed.js first to create demo cases.');
      process.exit(1);
    }

    console.log(`Found ${negotiations.length} negotiations for demo user`);

    // Seed bracket proposals for each negotiation
    for (const negotiation of negotiations) {
      console.log(`\nSeeding brackets for: ${negotiation.name}`);

      // Bracket 1: Initial conservative proposal
      await new Promise((resolve, reject) => {
        createBracket({
          negotiation_id: negotiation.id,
          plaintiff_low: 150000,
          plaintiff_high: 250000,
          defendant_low: 50000,
          defendant_high: 100000,
          notes: 'Initial bracket proposal - conservative ranges',
          status: 'active'
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✓ Created bracket 1: P: $150k-$250k, D: $50k-$100k (active)');

      // Bracket 2: More aggressive proposal
      await new Promise((resolve, reject) => {
        createBracket({
          negotiation_id: negotiation.id,
          plaintiff_low: 200000,
          plaintiff_high: 300000,
          defendant_low: 75000,
          defendant_high: 150000,
          notes: 'Second bracket - narrower ranges to push toward settlement',
          status: 'active'
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✓ Created bracket 2: P: $200k-$300k, D: $75k-$150k (active)');

      // Bracket 3: Rejected proposal (for demonstration)
      await new Promise((resolve, reject) => {
        createBracket({
          negotiation_id: negotiation.id,
          plaintiff_low: 100000,
          plaintiff_high: 150000,
          defendant_low: 25000,
          defendant_high: 50000,
          notes: 'Earlier proposal that was rejected - ranges too far apart',
          status: 'rejected'
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('  ✓ Created bracket 3: P: $100k-$150k, D: $25k-$50k (rejected)');

      // Add mediator proposal with deadline 7 days from now
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);

      await new Promise((resolve, reject) => {
        createMediatorProposal({
          negotiation_id: negotiation.id,
          amount: 175000,
          deadline: deadline.toISOString(),
          notes: 'Mediator proposes split-the-difference settlement. Both parties have 7 days to respond.',
          status: 'pending',
          plaintiff_response: 'pending',
          defendant_response: 'pending'
        }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log(`  ✓ Created mediator proposal: $175k (deadline: ${deadline.toLocaleDateString()})`);
    }

    console.log('\n✅ Seeding complete!');
    console.log('\nYou can now:');
    console.log('  1. Login as demo/demo123');
    console.log('  2. View any case to see bracket proposals');
    console.log('  3. View the mediator\'s proposal with countdown timer');
    console.log('  4. Create new brackets or mediator proposals');
    console.log('  5. Accept/reject as plaintiff or defendant');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seed
seedData();
