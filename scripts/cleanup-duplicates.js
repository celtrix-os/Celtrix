import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = process.env.PINECONE_INDEX;

// Add delay to respect API rate limits
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupDuplicates() {
  console.log(`\n=== Cleaning up duplicate vectors in Pinecone ===`);
  console.log(`Pinecone Index: ${indexName}`);

  try {
    const index = pinecone.Index(indexName);
    console.log("✅ Connected to Pinecone index");

    // Get all vectors
    console.log("📥 Fetching all vectors...");
    const allVectors = await index.query({
      vector: Array(1024).fill(0.1),
      topK: 1000, // Should be enough for all vectors
      includeMetadata: true,
      includeValues: false
    });

    if (!allVectors.matches || allVectors.matches.length === 0) {
      console.log("ℹ️  No vectors found in the index.");
      return;
    }

    console.log(`📊 Found ${allVectors.matches.length} total vectors`);

    // Group vectors by issue number
    const vectorsByIssue = new Map();
    
    for (const vector of allVectors.matches) {
      const issueNumber = vector.metadata?.issue_number;
      if (issueNumber) {
        if (!vectorsByIssue.has(issueNumber)) {
          vectorsByIssue.set(issueNumber, []);
        }
        vectorsByIssue.get(issueNumber).push(vector);
      }
    }

    console.log(`🔍 Found vectors for ${vectorsByIssue.size} different issues`);

    // Find duplicates and decide which to keep
    const vectorsToDelete = [];
    const vectorsToKeep = [];

    for (const [issueNumber, vectors] of vectorsByIssue) {
      console.log(`\n📋 Issue #${issueNumber}: ${vectors.length} vector(s)`);
      
      if (vectors.length === 1) {
        console.log(`  ✅ No duplicates for issue #${issueNumber}`);
        vectorsToKeep.push(vectors[0]);
      } else {
        console.log(`  🔍 Found ${vectors.length} vectors, selecting which to keep...`);
        
        // Sort vectors: prefer non-timestamped IDs (clean format)
        vectors.sort((a, b) => {
          const aHasTimestamp = /-\d{13}/.test(a.id);
          const bHasTimestamp = /-\d{13}/.test(b.id);
          
          if (!aHasTimestamp && bHasTimestamp) return -1; // a comes first (keep a)
          if (aHasTimestamp && !bHasTimestamp) return 1;  // b comes first (keep b)
          return a.id.localeCompare(b.id); // alphabetical if both same type
        });
        
        const toKeep = vectors[0];
        const toDelete = vectors.slice(1);
        
        console.log(`    ✅ Keeping: ${toKeep.id}`);
        vectorsToKeep.push(toKeep);
        
        toDelete.forEach(v => {
          console.log(`    🗑️  Deleting: ${v.id}`);
          vectorsToDelete.push(v.id);
        });
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Vectors to keep: ${vectorsToKeep.length}`);
    console.log(`  🗑️  Vectors to delete: ${vectorsToDelete.length}`);

    if (vectorsToDelete.length === 0) {
      console.log("🎉 No cleanup needed! All vectors are unique.");
      return;
    }

    // Confirm before deletion
    console.log(`\n⚠️  About to delete ${vectorsToDelete.length} duplicate vectors.`);
    console.log("🔍 Vectors to delete:");
    vectorsToDelete.forEach(id => console.log(`  - ${id}`));
    
    // Delete in batches
    console.log("\n🧹 Starting cleanup...");
    const batchSize = 100; // Pinecone delete limit
    let deleted = 0;

    for (let i = 0; i < vectorsToDelete.length; i += batchSize) {
      const batch = vectorsToDelete.slice(i, i + batchSize);
      
      try {
        await index.deleteMany(batch);
        deleted += batch.length;
        console.log(`  🗑️  Deleted batch: ${batch.length} vectors (total: ${deleted}/${vectorsToDelete.length})`);
        
        // Add delay between batches
        await delay(1000);
      } catch (error) {
        console.error(`  ❌ Failed to delete batch:`, error.message);
        console.error(`     Batch IDs: ${batch.join(', ')}`);
      }
    }

    console.log(`\n🎉 Cleanup completed!`);
    console.log(`✅ Deleted: ${deleted}/${vectorsToDelete.length} duplicate vectors`);
    console.log(`📊 Remaining vectors: ${vectorsToKeep.length} (one per issue)`);
    
    // Verify cleanup
    console.log("\n🔍 Verifying cleanup...");
    await delay(2000); // Wait for Pinecone to sync
    
    const finalStats = await index.describeIndexStats();
    const finalCount = finalStats.totalRecordCount || 0;
    console.log(`📊 Final vector count: ${finalCount}`);
    
    if (finalCount === vectorsToKeep.length) {
      console.log("✅ Cleanup verification successful!");
    } else {
      console.log(`⚠️  Expected ${vectorsToKeep.length} vectors, but found ${finalCount}`);
    }

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📖 Usage: node scripts/cleanup-duplicates.js

🔧 Required Environment Variables:
  - PINECONE_API_KEY: Pinecone API key
  - PINECONE_INDEX: Pinecone index name

📝 This script will:
  1. Find all vectors in your Pinecone index
  2. Group them by issue number  
  3. Identify and remove duplicate vectors
  4. Keep only one vector per issue (preferring clean IDs)
  
⚠️  WARNING: This will permanently delete duplicate vectors!
  `);
  process.exit(0);
}

// Confirmation prompt for safety
if (!args.includes('--force')) {
  console.log(`
⚠️  WARNING: This script will delete duplicate vectors from your Pinecone index!

📋 What it will do:
  • Find all vectors with the same issue_number
  • Keep the vector with the cleanest ID format (without timestamp)
  • Delete all other duplicate vectors

🚨 This action cannot be undone!

To proceed, run: node scripts/cleanup-duplicates.js --force
To see help: node scripts/cleanup-duplicates.js --help
  `);
  process.exit(0);
}

// Run the cleanup
cleanupDuplicates().catch(error => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});