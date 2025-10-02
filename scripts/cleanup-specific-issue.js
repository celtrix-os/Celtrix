import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = process.env.PINECONE_INDEX;
const ISSUE_TO_DELETE = process.env.ISSUE_NUMBER || process.argv[2];

async function deleteIssueVectors() {
  console.log(`\n=== Deleting vectors for Issue #${ISSUE_TO_DELETE} ===`);
  console.log(`Pinecone Index: ${indexName}`);

  if (!ISSUE_TO_DELETE) {
    console.error("❌ Please provide an issue number:");
    console.error("   Usage: ISSUE_NUMBER=6 node scripts/cleanup-specific-issue.js");
    console.error("   Or:    node scripts/cleanup-specific-issue.js 6");
    process.exit(1);
  }

  try {
    const index = pinecone.Index(indexName);
    console.log("✅ Connected to Pinecone index");

    // Find all vectors for this issue
    console.log(`🔍 Searching for vectors related to issue #${ISSUE_TO_DELETE}...`);
    
    const vectorsToDelete = [];
    
    try {
      // First, try using metadata filter
      const queryResponse = await index.query({
        vector: Array(1024).fill(0.1), // dummy vector for metadata filtering
        topK: 100,
        includeValues: false,
        includeMetadata: true,
        filter: {
          issue_number: parseInt(ISSUE_TO_DELETE)
        }
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        for (const match of queryResponse.matches) {
          vectorsToDelete.push(match.id);
          console.log(`   📌 Found vector via filter: ${match.id}`);
          console.log(`      Metadata:`, JSON.stringify(match.metadata, null, 2));
        }
      } else {
        console.log("   🔄 Filter query returned no results, trying list approach...");
        
        // Fallback: List all vectors and filter
        let paginationToken = null;
        
        do {
          const listOptions = { limit: 100 };
          if (paginationToken) {
            listOptions.paginationToken = paginationToken;
          }
          
          const listResponse = await index.listPaginated(listOptions);
          
          if (listResponse.vectors) {
            for (const vector of listResponse.vectors) {
              if (vector.metadata?.issue_number === parseInt(ISSUE_TO_DELETE)) {
                vectorsToDelete.push(vector.id);
                console.log(`   📌 Found vector via list: ${vector.id}`);
                console.log(`      Metadata:`, JSON.stringify(vector.metadata, null, 2));
              }
            }
          }
          
          paginationToken = listResponse.pagination?.next;
        } while (paginationToken);
      }
    } catch (searchError) {
      console.error("❌ Error searching for vectors:", searchError.message);
      throw searchError;
    }

    console.log(`\nFound ${vectorsToDelete.length} vector(s) to delete for Issue #${ISSUE_TO_DELETE}`);

    if (vectorsToDelete.length === 0) {
      console.log(`ℹ️  No vectors found for Issue #${ISSUE_TO_DELETE}. Nothing to delete.`);
      return;
    }

    // Show what we're about to delete
    console.log(`\n🗑️  About to delete the following vectors:`);
    vectorsToDelete.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });

    // Confirm deletion
    console.log(`\n⚠️  This action cannot be undone!`);
    
    // Delete the vectors
    console.log(`\n🗑️  Deleting ${vectorsToDelete.length} vector(s)...`);
    
    try {
      await index.deleteMany(vectorsToDelete);
      console.log(`✅ Successfully deleted ${vectorsToDelete.length} vector(s) for Issue #${ISSUE_TO_DELETE}`);
    } catch (deleteError) {
      console.error(`❌ Error deleting vectors:`, deleteError.message);
      throw deleteError;
    }

    console.log(`\n=== Cleanup Summary ===`);
    console.log(`📊 Issue #${ISSUE_TO_DELETE} vectors deleted: ${vectorsToDelete.length}`);
    console.log(`✅ Database cleanup completed successfully`);
    console.log(`\n🎯 You can now edit Issue #${ISSUE_TO_DELETE} to test the update functionality!`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📖 Usage: 
  ISSUE_NUMBER=6 node scripts/cleanup-specific-issue.js
  node scripts/cleanup-specific-issue.js 6

🔧 Required Environment Variables:
  - PINECONE_API_KEY: Pinecone API key
  - PINECONE_INDEX: Pinecone index name

📝 This script will:
  1. Find all vectors in Pinecone related to the specified issue number
  2. Delete those vectors from the Pinecone index
  3. Show a summary of what was deleted
  
⚠️  Note: This action cannot be undone! Use carefully.
  `);
  process.exit(0);
}

// Run the cleanup script
deleteIssueVectors().catch(error => {
  console.error("💥 Cleanup script failed:", error);
  process.exit(1);
});