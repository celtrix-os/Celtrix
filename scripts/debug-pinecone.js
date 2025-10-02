import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = process.env.PINECONE_INDEX;

async function debugPinecone() {
  console.log("=== Pinecone Debug Information ===");
  console.log(`Index: ${indexName}`);

  try {
    const index = pinecone.Index(indexName);
    
    // Get index stats
    console.log("\n1. Index Statistics:");
    const stats = await index.describeIndexStats();
    console.log("Full stats object:", JSON.stringify(stats, null, 2));
    
    // Try to query some vectors
    console.log("\n2. Sample Query (first 10 vectors):");
    try {
      const queryResult = await index.query({
        vector: Array(1024).fill(0.1),
        topK: 10,
        includeMetadata: true,
        includeValues: false
      });
      
      console.log(`Found ${queryResult.matches?.length || 0} vectors`);
      if (queryResult.matches && queryResult.matches.length > 0) {
        queryResult.matches.forEach((match, i) => {
          console.log(`  ${i + 1}. ID: ${match.id}, Score: ${match.score}`);
          if (match.metadata) {
            console.log(`     Metadata:`, match.metadata);
          }
        });
      }
    } catch (queryError) {
      console.error("Query failed:", queryError.message);
    }
    
    // Try specific fetch for known IDs
    console.log("\n3. Testing specific ID fetch:");
    const testIds = ['issue-1', 'issue-3', 'issue-4', 'issue-5', 'issue-6', 'issue-7', 'issue-8'];
    
    try {
      const fetchResult = await index.fetch(testIds);
      console.log(`Fetch result keys: ${Object.keys(fetchResult.vectors || {}).join(', ')}`);
      
      if (fetchResult.vectors) {
        Object.entries(fetchResult.vectors).forEach(([id, vector]) => {
          console.log(`  Found: ${id}`);
          if (vector.metadata) {
            console.log(`    Issue #: ${vector.metadata.issue_number}`);
            console.log(`    Title: ${vector.metadata.title?.substring(0, 50)}...`);
          }
        });
      }
    } catch (fetchError) {
      console.error("Fetch failed:", fetchError.message);
    }
    
    // Try with different ID patterns (in case they have timestamps)
    console.log("\n4. Checking for timestamped IDs:");
    try {
      const allQuery = await index.query({
        vector: Array(1024).fill(0.1),
        topK: 100,
        includeMetadata: true,
        includeValues: false
      });
      
      if (allQuery.matches && allQuery.matches.length > 0) {
        console.log("All vector IDs found:");
        allQuery.matches.forEach(match => {
          console.log(`  - ${match.id} (issue #${match.metadata?.issue_number || 'unknown'})`);
        });
      } else {
        console.log("No vectors found in query");
      }
    } catch (allQueryError) {
      console.error("All query failed:", allQueryError.message);
    }
    
  } catch (error) {
    console.error("Debug failed:", error);
  }
}

debugPinecone().catch(console.error);