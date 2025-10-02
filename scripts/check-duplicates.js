import { Octokit } from "@octokit/rest";
import fetch from "node-fetch";
import { Pinecone } from "@pinecone-database/pinecone";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = process.env.GITHUB_REPOSITORY.split("/")[0];
const REPO = process.env.GITHUB_REPOSITORY.split("/")[1];
const ISSUE_NUMBER = Number(process.env.ISSUE_NUMBER);
const SIMILARITY_THRESHOLD = parseFloat(
  process.env.SIMILARITY_THRESHOLD || "0.5"
);

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = process.env.PINECONE_INDEX;

// Retry logic for API calls
async function retryApiCall(apiCall, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.status === 429 || error.status >= 500) {
        console.log(
          `API call failed (attempt ${i + 1}), retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
}

// Safe vector operation with fallback
async function safeVectorOperation(operation, fallbackMessage) {
  try {
    return await operation();
  } catch (error) {
    console.error("❌ Vector database error:", error.message);

    await octokit.issues.createComment({
      owner: OWNER,
      repo: REPO,
      issue_number: ISSUE_NUMBER,
      body:
        `🔧 **Temporary Service Issue** 🔧\n\n` +
        `${fallbackMessage}\n\n` +
        `Our duplicate detection service is temporarily unavailable. ` +
        `A maintainer will review this issue manually.\n\n` +
        `*This comment was generated automatically by Seroski-DupBot 🤖*` +
        `\n\nCheck out the developer: [Portfolio](https://portfolio.rosk.dev)`,
    });

    throw error;
  }
}

async function run() {
  console.log(`\n=== Checking issue #${ISSUE_NUMBER} for duplicates ===`);

  const { data: newIssue } = await retryApiCall(async () => {
    return await octokit.issues.get({
      owner: OWNER,
      repo: REPO,
      issue_number: ISSUE_NUMBER,
    });
  });

  if (newIssue.pull_request) {
    console.log("⏭️ Skipping pull request - not an issue");
    return;
  }

  const newText = `${newIssue.title} ${newIssue.body || ""}`.trim();
  console.log(`Issue text: ${newText.substring(0, 100)}...`);

  if (newText.length < 10) {
    console.log("⚠️ Issue text too short for meaningful duplicate detection");
    await octokit.issues.createComment({
      owner: OWNER,
      repo: REPO,
      issue_number: ISSUE_NUMBER,
      body:
        `📝 **Issue Too Short for Analysis** 📝\n\n` +
        `This issue appears to have very little content. For better duplicate detection, please consider:\n\n` +
        `- Adding more details about the problem\n` +
        `- Including steps to reproduce\n` +
        `- Describing expected vs actual behavior\n\n` +
        `*This comment was generated automatically by Seroski-DupBot 🤖*` +
        `\n\nCheck out the developer: [Portfolio](https://portfolio.rosk.dev)`,
    });
    return;
  }

  console.log("Generating embedding for the new issue...");

  const generateEmbedding = async (text) => {
    return await retryApiCall(async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: text }] },
          }),
        }
      );
      const data = await response.json();

      if (data.error || !data.embedding || !data.embedding.values) {
        console.error("Embedding error:", data.error || "Invalid response");
        return Array(1024).fill(0.01);
      }

      let embedding = data.embedding.values;
      if (embedding.length < 1024) {
        embedding = [...embedding, ...Array(1024 - embedding.length).fill(0)];
      } else if (embedding.length > 1024) {
        embedding = embedding.slice(0, 1024);
      }

      return embedding;
    });
  };

  const newEmbedding = await generateEmbedding(newText);
  console.log("✅ Generated embedding for new issue");

  const index = pinecone.Index(indexName);
  console.log("Checking if issue already exists in vector database...");

  let existingVectorIds = [];
  let isEditingExistingIssue = false;

  try {
    await safeVectorOperation(async () => {
      // Try to find existing vectors using metadata filter
      const queryResponse = await index.query({
        vector: Array(1024).fill(0.1),
        topK: 100,
        includeValues: false,
        includeMetadata: true,
        filter: {
          issue_number: ISSUE_NUMBER,
        },
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        for (const match of queryResponse.matches) {
          existingVectorIds.push(match.id);
          console.log(`   📌 Found existing vector via filter: ${match.id}`);
        }
      } else {
        console.log(
          "   🔄 Filter query returned no results, trying list approach..."
        );
        let paginationToken = null;

        do {
          const listOptions = { limit: 100 };
          if (paginationToken) {
            listOptions.paginationToken = paginationToken;
          }

          const listResponse = await index.listPaginated(listOptions);

          if (listResponse.vectors) {
            for (const vector of listResponse.vectors) {
              if (vector.metadata?.issue_number === ISSUE_NUMBER) {
                existingVectorIds.push(vector.id);
                console.log(
                  `   📌 Found existing vector via list: ${vector.id}`
                );
              }
            }
          }

          paginationToken = listResponse.pagination?.next;
        } while (paginationToken);
      }

      isEditingExistingIssue = existingVectorIds.length > 0;
      console.log(
        `Issue exists in DB: ${isEditingExistingIssue ? "YES" : "NO"} (${
          existingVectorIds.length
        } vectors found)`
      );
    }, "Could not check for existing issue vectors in the database.");
  } catch (error) {
    console.error(
      "Vector database check failed, continuing with basic processing..."
    );
  }

  let results = [];
  let filteredResults = [];
  let duplicates = [];

  try {
    await safeVectorOperation(async () => {
      console.log("Querying Pinecone for similar issues...");
      const queryResponse = await index.query({
        vector: newEmbedding,
        topK: 10,
        includeValues: false,
        includeMetadata: true,
      });

      results = queryResponse.matches || [];
      console.log(`Found ${results.length} potential matches`);

      filteredResults = results.filter(
        (r) => r.metadata?.issue_number !== ISSUE_NUMBER
      );

      console.log(
        `After filtering out current issue: ${filteredResults.length} matches`
      );

      // Get all potential duplicates above 0.55 threshold for 3-tier system
      duplicates = filteredResults
        .filter((r) => r.score >= 0.55)
        .map((r) => ({
          number: r.metadata?.issue_number || "Unknown",
          similarity: r.score,
          title: r.metadata?.title || "Unknown",
        }))
        .sort((a, b) => b.similarity - a.similarity); // Sort by highest similarity first

      console.log(
        `Found ${duplicates.length} potential matches above 0.55 similarity threshold`
      );

      filteredResults.forEach((result, index) => {
        const score = result.score || 0;
        let category = "✅ Below threshold";
        if (score >= 0.85) category = "🚨 HIGH DUPLICATE";
        else if (score >= 0.55) category = "🤔 POTENTIALLY RELATED";
        
        console.log(
          `  ${index + 1}. Issue #${
            result.metadata?.issue_number || "Unknown"
          } - Score: ${score.toFixed(4)} ${category}`
        );
        console.log(`     Title: "${result.metadata?.title || "No title"}"`);
      });
    }, "Could not query the vector database for similar issues.");
  } catch (error) {
    console.error("Duplicate detection failed, treating as unique issue...");
  }

  // 3-tier duplicate detection system
  let commentBody = "";
  let shouldUpdateVector = true;
  let shouldAutoClose = false;
  let duplicateAction = "none";

  // Categorize duplicates by similarity score
  const highSimilarityDuplicates = duplicates.filter(d => d.similarity >= 0.85);
  const mediumSimilarityDuplicates = duplicates.filter(d => d.similarity >= 0.55 && d.similarity < 0.85);
  
  if (highSimilarityDuplicates.length > 0) {
    // TIER 1: High similarity (>= 0.85) - Auto-close as duplicate
    duplicateAction = "auto-close";
    shouldUpdateVector = false;
    shouldAutoClose = !isEditingExistingIssue;
    
    const topMatch = highSimilarityDuplicates[0];
    const similarityPercent = (topMatch.similarity * 100).toFixed(1);
    
    if (isEditingExistingIssue) {
      commentBody = `🚨 **Warning: Edited Issue Now Appears as Duplicate** 🚨\n\n`;
      commentBody += `After your recent edit, this issue appears to be a duplicate of:\n\n`;
      commentBody += `- Issue #${topMatch.number}: "${topMatch.title}" (${similarityPercent}% similar)\n`;
      commentBody += `  Link: https://github.com/${OWNER}/${REPO}/issues/${topMatch.number}\n\n`;
      commentBody += `⚠️ **Note**: Since this was previously a unique issue, we've kept it open but flagged this high similarity for your attention.\n\n`;
    } else {
      commentBody = `🚨 **Duplicate Detected** 🚨\n\n`;
      commentBody += `This issue appears to be a duplicate of:\n\n`;
      commentBody += `- Issue #${topMatch.number}: "${topMatch.title}" (${similarityPercent}% similar)\n`;
      commentBody += `  Link: https://github.com/${OWNER}/${REPO}/issues/${topMatch.number}\n\n`;
      commentBody += `🔒 **This issue has been automatically closed as a duplicate.**\n\n`;
      commentBody += `Please continue the discussion in the original issue above. If your problem is different, please open a new issue with more specific details.\n\n`;
    }

    console.log(`🚨 HIGH SIMILARITY DUPLICATE detected! Similarity: ${similarityPercent}% with issue #${topMatch.number}`);
    
  } else if (mediumSimilarityDuplicates.length > 0) {
    // TIER 2: Medium similarity (0.55-0.84) - Flag as potentially related
    duplicateAction = "flag-related";
    shouldUpdateVector = true; // Still add to vector DB for unique issues
    shouldAutoClose = false;
    
    const topMatch = mediumSimilarityDuplicates[0];
    const similarityPercent = (topMatch.similarity * 100).toFixed(1);
    
    if (isEditingExistingIssue) {
      commentBody = `🤔 **Potentially Related Issue After Edit** 🤔\n\n`;
      commentBody += `After your recent edit, this issue seems related to:\n\n`;
    } else {
      commentBody = `🤔 **Potentially Related Issue Found** 🤔\n\n`;
      commentBody += `This issue seems related to:\n\n`;
    }
    
    commentBody += `- Issue #${topMatch.number}: "${topMatch.title}" (${similarityPercent}% similar)\n`;
    commentBody += `  Link: https://github.com/${OWNER}/${REPO}/issues/${topMatch.number}\n\n`;
    commentBody += `This issue is not identical but may be related. A maintainer will review to determine if they should be linked or if this is indeed a separate issue.\n\n`;
    
    console.log(`🤔 POTENTIALLY RELATED issue detected! Similarity: ${similarityPercent}% with issue #${topMatch.number}`);
    
  } else {
    // TIER 3: Low similarity (< 0.55) - Treat as unique
    duplicateAction = "unique";
    shouldUpdateVector = true;
    shouldAutoClose = false;

    if (isEditingExistingIssue) {
      commentBody = `✅ **Issue Updated Successfully** ✅\n\n`;
      commentBody += `Your edit has been processed and the issue still appears to be unique. Our duplicate detection database has been updated with your changes.\n\n`;
      commentBody += `Thank you for keeping your issue up to date! 🔄\n\n`;
    } else {
      commentBody = `✅ **Unique Issue Detected** ✅\n\n`;
      commentBody += `Thank you for finding and contributing this unique issue! This appears to be a new problem that hasn't been reported before.\n\n`;
      commentBody += `Your contribution helps make this project better. We appreciate you taking the time to report this! 🙏\n\n`;
    }

    console.log(`✅ UNIQUE issue confirmed. No similar issues found above 0.55 threshold.`);
  }

  commentBody += `*This comment was generated automatically by Seroski-DupBot 🤖*\n\nCheck out the developer: [Portfolio](https://portfolio.rosk.dev)`;

  console.log(`📊 Duplicate Detection Summary:`);
  console.log(`   Action: ${duplicateAction}`);
  console.log(`   Will auto-close: ${shouldAutoClose}`);
  console.log(`   Will update vectors: ${shouldUpdateVector}`);

  // Post the comment first
  await retryApiCall(async () => {
    return await octokit.issues.createComment({
      owner: OWNER,
      repo: REPO,
      issue_number: ISSUE_NUMBER,
      body: commentBody,
    });
  });
  console.log("Comment posted on the issue.");

  // Handle auto-closure for high similarity duplicates (>= 0.85)
  if (shouldAutoClose && duplicateAction === "auto-close") {
    try {
      console.log(`🔄 Auto-closing issue #${ISSUE_NUMBER} as duplicate...`);
      
      // First add the duplicate label
      await retryApiCall(async () => {
        return await octokit.issues.addLabels({
          owner: OWNER,
          repo: REPO,
          issue_number: ISSUE_NUMBER,
          labels: ['duplicate']
        });
      });
      
      console.log(`🏷️  Added 'duplicate' label to issue #${ISSUE_NUMBER}`);
      
      // Then close the issue with 'not_planned' state reason
      await retryApiCall(async () => {
        return await octokit.issues.update({
          owner: OWNER,
          repo: REPO,
          issue_number: ISSUE_NUMBER,
          state: 'closed',
          state_reason: 'duplicate'
        });
      });
      
      console.log(`🔒 Issue #${ISSUE_NUMBER} has been auto-closed as duplicate`);
      
    } catch (error) {
      console.error(`❌ Failed to auto-close issue #${ISSUE_NUMBER}:`, error.message);
      
      // Post error comment if automatic closure fails
      try {
        await retryApiCall(async () => {
          return await octokit.issues.createComment({
            owner: OWNER,
            repo: REPO,
            issue_number: ISSUE_NUMBER,
            body: `⚠️ **Auto-close Failed** ⚠️\n\nThis issue was detected as a high-confidence duplicate but could not be automatically closed. A maintainer will review this manually.\n\n*Error: ${error.message}*`
          });
        });
      } catch (commentError) {
        console.error(`❌ Failed to post error comment: ${commentError.message}`);
      }
    }
  } else if (duplicateAction === "flag-related") {
    console.log(`🤔 Issue #${ISSUE_NUMBER} flagged as potentially related - no auto-action taken`);
  } else if (duplicateAction === "unique") {
    console.log(`✅ Issue #${ISSUE_NUMBER} confirmed as unique - will process normally`);
  }

  // Continue with vector database updates only for unique issues
  if (shouldUpdateVector) {
    try {
      await safeVectorOperation(async () => {
        if (isEditingExistingIssue) {
          console.log("Updating existing issue vectors in Pinecone...");

          if (existingVectorIds.length > 0) {
            await index.deleteMany(existingVectorIds);
            console.log(
              `🗑️  Deleted ${existingVectorIds.length} old vector(s)`
            );
          }

          const vectorId = `issue-${ISSUE_NUMBER}-${Date.now()}`;
          await index.upsert([
            {
              id: vectorId,
              values: newEmbedding,
              metadata: {
                issue_number: ISSUE_NUMBER,
                title: newIssue.title,
                content: newText,
                created_at: newIssue.created_at,
                updated_at: newIssue.updated_at,
                url: newIssue.html_url,
              },
            },
          ]);

          console.log(
            "✅ Updated issue embedding in Pinecone with new content."
          );
        } else {
          console.log("Adding new issue embedding to Pinecone...");

          const vectorId = `issue-${ISSUE_NUMBER}-${Date.now()}`;
          await index.upsert([
            {
              id: vectorId,
              values: newEmbedding,
              metadata: {
                issue_number: ISSUE_NUMBER,
                title: newIssue.title,
                content: newText,
                created_at: newIssue.created_at,
                url: newIssue.html_url,
              },
            },
          ]);

          console.log(
            "✅ New issue embedding stored in Pinecone for future duplicate detection."
          );
        }
      }, "Could not update the vector database.");
    } catch (error) {
      console.error(
        "Failed to update vector database, but issue processing completed."
      );
    }
  } else {
    if (duplicateAction === "auto-close") {
      console.log("⏭️  Skipped adding to Pinecone due to high-confidence duplicate detection and auto-closure.");
    } else if (duplicateAction === "flag-related") {
      console.log("✅ Added to Pinecone despite potential relation - issue treated as separate.");
    } else if (isEditingExistingIssue) {
      console.log("⚠️  Keeping existing vectors unchanged due to similarity detected after edit.");
    }
  }

  console.log(
    `\n=== Duplicate check completed for issue #${ISSUE_NUMBER} ===\n`
  );
}

run().catch((err) => console.error(err));
