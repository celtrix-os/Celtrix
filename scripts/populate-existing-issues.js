import { Octokit } from "@octokit/rest";
import fetch from "node-fetch";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = process.env.GITHUB_REPOSITORY?.split("/")[0] || process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPOSITORY?.split("/")[1] || process.env.GITHUB_REPO;

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = process.env.PINECONE_INDEX;

// Gemini embedding function
async function generateEmbedding(text) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          model: "models/text-embedding-004",
          content: { parts: [{ text: text }] }
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return Array(1024).fill(0.01);
    }
    
    if (!data.embedding || !data.embedding.values) {
      console.error("Invalid embedding response:", data);
      return Array(1024).fill(0.01);
    }
    
    // Pad or truncate to match Pinecone index dimension (1024)
    let embedding = data.embedding.values;
    if (embedding.length < 1024) {
      embedding = [...embedding, ...Array(1024 - embedding.length).fill(0)];
    } else if (embedding.length > 1024) {
      embedding = embedding.slice(0, 1024);
    }
    
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return Array(1024).fill(0.01);
  }
}

// Add delay to respect API rate limits
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function populateExistingIssues() {
  console.log(`\n=== Populating Pinecone with existing open issues ===`);
  console.log(`Repository: ${OWNER}/${REPO}`);
  console.log(`Pinecone Index: ${indexName}`);

  if (!OWNER || !REPO) {
    console.error("❌ Repository owner and name must be specified via GITHUB_REPOSITORY or GITHUB_OWNER/GITHUB_REPO environment variables");
    process.exit(1);
  }

  try {
    // Initialize Pinecone index
    const index = pinecone.Index(indexName);
    console.log("✅ Connected to Pinecone index");

    // Fetch all open issues from the repository
    console.log("📥 Fetching open issues from GitHub...");
    
    let allIssues = [];
    let page = 1;
    const perPage = 100;
    
    while (true) {
      const { data: issues } = await octokit.issues.listForRepo({
        owner: OWNER,
        repo: REPO,
        state: 'open',
        per_page: perPage,
        page: page,
      });
      
      if (issues.length === 0) break;
      
      // Filter out pull requests (they show up in issues API)
      const actualIssues = issues.filter(issue => !issue.pull_request);
      allIssues = allIssues.concat(actualIssues);
      
      console.log(`  📄 Fetched page ${page} - ${actualIssues.length} issues`);
      page++;
      
      // Add delay to respect GitHub API rate limits
      await delay(1000);
    }

    console.log(`✅ Total open issues found: ${allIssues.length}`);

    if (allIssues.length === 0) {
      console.log("ℹ️  No open issues found. Nothing to populate.");
      return;
    }

    // Check if issues already exist in Pinecone to avoid duplicates
    console.log("🔍 Checking for existing issues in Pinecone...");
    
    const existingIssueNumbers = new Set();
    
    try {
      // Get index statistics first
      const stats = await index.describeIndexStats();
      const totalVectors = stats.totalRecordCount || 0;
      console.log(`  📊 Index contains ${totalVectors} total vectors`);
      
      if (totalVectors === 0) {
        console.log("  ℹ️  Index is empty, all issues will be processed");
      } else {
        // Use multiple approaches to check for existing vectors
        console.log("  🔍 Checking for existing issue vectors...");
        
        // Method 1: Try to query with a sample vector to get some existing vectors
        try {
          console.log("    🔍 Sampling existing vectors...");
          const sampleQuery = await index.query({
            vector: Array(1024).fill(0.1),
            topK: Math.min(100, totalVectors),
            includeMetadata: true
          });
          
          if (sampleQuery.matches && sampleQuery.matches.length > 0) {
            console.log(`    📋 Found ${sampleQuery.matches.length} sample vectors`);
            for (const match of sampleQuery.matches) {
              if (match.metadata?.issue_number) {
                existingIssueNumbers.add(match.metadata.issue_number);
                console.log(`      ✓ Found existing issue #${match.metadata.issue_number}`);
              }
            }
          }
        } catch (sampleError) {
          console.log("    ⚠️  Sample query failed, trying direct fetch approach");
        }
        
        // Method 2: Try to fetch vectors by their expected IDs
        console.log("    🔍 Checking by direct ID lookup...");
        for (let i = 0; i < allIssues.length; i += 10) {
          const batch = allIssues.slice(i, i + 10);
          
          // Try to fetch vectors by their expected IDs
          const vectorIds = batch.map(issue => `issue-${issue.number}`);
          
          try {
            const fetchResult = await index.fetch(vectorIds);
            
            if (fetchResult.vectors) {
              Object.keys(fetchResult.vectors).forEach(vectorId => {
                const match = vectorId.match(/issue-(\d+)/);
                if (match) {
                  const issueNum = parseInt(match[1]);
                  if (!existingIssueNumbers.has(issueNum)) {
                    existingIssueNumbers.add(issueNum);
                    console.log(`      ✓ Found existing issue #${issueNum} by ID`);
                  }
                }
              });
            }
          } catch (fetchError) {
            // If fetch fails, try metadata filter queries for this batch
            console.log(`      ⚠️  Fetch failed for batch, trying metadata queries...`);
            for (const issue of batch) {
              try {
                const queryResult = await index.query({
                  vector: Array(1024).fill(0.1),
                  filter: { issue_number: { $eq: issue.number } },
                  topK: 1,
                  includeMetadata: true
                });
                
                if (queryResult.matches && queryResult.matches.length > 0) {
                  if (!existingIssueNumbers.has(issue.number)) {
                    existingIssueNumbers.add(issue.number);
                    console.log(`      ✓ Found existing issue #${issue.number} by query`);
                  }
                }
              } catch (queryError) {
                // Silently continue - assume issue doesn't exist
              }
            }
          }
          
          // Small delay between batches
          await delay(300);
        }
      }
    } catch (error) {
      console.log("  ⚠️  Error checking existing issues:", error.message);
      console.log("  🔄 Will process all issues to be safe");
    }
    
    console.log(`Found ${existingIssueNumbers.size} existing issues in Pinecone`);

    // Filter out issues that already exist in Pinecone
    const newIssues = allIssues.filter(issue => !existingIssueNumbers.has(issue.number));
    const skippedCount = allIssues.length - newIssues.length;
    
    console.log(`📝 ${newIssues.length} new issues to process`);
    console.log(`⏭️  ${skippedCount} issues skipped (already exist in Pinecone)`);
    
    if (skippedCount > 0) {
      console.log(`   Skipped issues: ${Array.from(existingIssueNumbers).sort((a, b) => a - b).join(', ')}`);
    }

    if (newIssues.length === 0) {
      console.log("✅ All open issues are already in Pinecone. Nothing to add.");
      return;
    }

    // Process issues in batches to avoid overwhelming the APIs
    const batchSize = 10;
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < newIssues.length; i += batchSize) {
      const batch = newIssues.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newIssues.length / batchSize)}`);

      const vectors = [];

      for (const issue of batch) {
        try {
          console.log(`  🔄 Processing issue #${issue.number}: "${issue.title.substring(0, 50)}..."`);
          
          // Combine title and body for embedding
          const issueText = `${issue.title} ${issue.body || ""}`;
          
          // Generate embedding
          const embedding = await generateEmbedding(issueText);
          
          // Prepare vector for Pinecone - use consistent ID format
          const vectorId = `issue-${issue.number}`;
          vectors.push({
            id: vectorId,
            values: embedding,
            metadata: {
              issue_number: issue.number,
              title: issue.title,
              content: issueText,
              created_at: issue.created_at,
              updated_at: issue.updated_at,
              url: issue.html_url,
              state: issue.state,
              labels: issue.labels?.map(label => label.name).join(', ') || '',
              author: issue.user?.login || 'unknown'
            }
          });

          processed++;
          console.log(`    ✅ Issue #${issue.number} prepared`);
          
          // Add delay between API calls to respect rate limits
          await delay(500);
          
        } catch (error) {
          console.error(`    ❌ Failed to process issue #${issue.number}:`, error.message);
          failed++;
        }
      }

      // Upsert batch to Pinecone
      if (vectors.length > 0) {
        try {
          console.log(`  🔄 Upserting ${vectors.length} vectors to Pinecone...`);
          await index.upsert(vectors);
          successful += vectors.length;
          console.log(`  ✅ Batch upserted to Pinecone: ${vectors.length} vectors`);
        } catch (error) {
          console.error(`  ❌ Failed to upsert batch to Pinecone:`, error.message);
          // Log which specific issues failed
          console.error(`    Failed issues: ${vectors.map(v => v.metadata.issue_number).join(', ')}`);
          failed += vectors.length;
        }
      }

      // Add delay between batches
      await delay(2000);
    }

    console.log(`\n=== Population Summary ===`);
    console.log(`📊 Total issues processed: ${processed}`);
    console.log(`✅ Successfully added to Pinecone: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((successful / processed) * 100).toFixed(1)}%`);
    
    if (successful > 0) {
      console.log(`\n🎉 Successfully populated Pinecone with ${successful} issue embeddings!`);
      console.log(`🤖 Your duplicate detection bot is now ready to work with existing issues.`);
    }

  } catch (error) {
    console.error("❌ Error during population:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📖 Usage: node scripts/populate-existing-issues.js

🔧 Required Environment Variables:
  - GITHUB_TOKEN: GitHub personal access token
  - GITHUB_REPOSITORY: Repository in format "owner/repo" (or use GITHUB_OWNER + GITHUB_REPO)
  - PINECONE_API_KEY: Pinecone API key
  - PINECONE_INDEX: Pinecone index name
  - GEMINI_API_KEY: Google Gemini API key

📝 This script will:
  1. Fetch all open issues from your GitHub repository
  2. Generate embeddings using Google Gemini
  3. Store them in your Pinecone vector database
  4. Skip issues that already exist in Pinecone
  
⚠️  Note: This script respects API rate limits and processes issues in batches.
  `);
  process.exit(0);
}

// Run the population script
populateExistingIssues().catch(error => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});