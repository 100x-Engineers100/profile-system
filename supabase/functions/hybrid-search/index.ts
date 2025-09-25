import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "npm:openai@4.8.0";
import { Client } from "npm:@elastic/elasticsearch@8";
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    const { query, k, match_threshold, llm_config } = await req.json();
    if (!query) {
      return new Response(
        JSON.stringify({
          error: "Missing query",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      );
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization"),
          },
        },
      }
    );
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });
    const elasticsearchClient = new Client({
      node: Deno.env.get("ELASTICSEARCH_URL"),
      auth: {
        apiKey: Deno.env.get("ELASTICSEARCH_API_KEY"),
      },
    });
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.replace(/\n/g, " "),
    });
    const [{ embedding: queryEmbedding }] = embeddingResponse.data;
    // --- Dynamic Weighting (LLM-based) ---
    let bioWeight = 1.0;
    let skillsWeight = 1.0;
    let experienceWeight = 1.0;
    let fullTextWeight = 1.0;
    if (llm_config && llm_config.enabled) {
      try {
        const llmPrompt = `Given the search query: "${query}", assign a weight (between 0.1 and 2.0) to 'bio', 'skills', 'experience', and 'full_text' based on their relevance to the query. The sum of weights should ideally be around 4.0, but can vary. Respond with a JSON object like this: { "bio": 1.0, "skills": 1.0, "experience": 1.0, "full_text": 1.0 }`;
        const chatCompletion = await openai.chat.completions.create({
          model: llm_config.model || "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: llmPrompt,
            },
          ],
          temperature: 0.2,
        });
        const llmResponse = chatCompletion.choices[0].message.content;
        if (llmResponse) {
          const parsedWeights = JSON.parse(llmResponse);
          bioWeight = parsedWeights.bio || bioWeight;
          skillsWeight = parsedWeights.skills || skillsWeight;
          experienceWeight = parsedWeights.experience || experienceWeight;
          fullTextWeight = parsedWeights.full_text || fullTextWeight;
          console.log("LLM-assigned weights:", {
            bioWeight,
            skillsWeight,
            experienceWeight,
            fullTextWeight,
          });
        }
      } catch (llmError) {
        console.error(
          "Error getting LLM weights, falling back to default:",
          llmError
        );
      }
    }
    // --- Semantic Search (pgvector) ---
    // We will call a new RPC function that can handle field-wise embeddings
    const { data: semanticSearchResults, error: semanticSearchError } =
      await supabase.rpc("match_profiles_field_wise", {
        query_embedding: queryEmbedding,
        match_threshold: match_threshold || 0.78,
        match_count: k || 10,
        bio_weight: bioWeight,
        skills_weight: skillsWeight,
        experience_weight: experienceWeight,
        full_text_weight: fullTextWeight,
      });
    console.log(
      `semanticSearchResults length: ${semanticSearchResults.length}`
    );
    if (semanticSearchError) {
      console.error("Semantic search error:", semanticSearchError);
      return new Response(
        JSON.stringify({
          error: "Semantic search failed",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 500,
        }
      );
    }
    // --- Keyword Search (Elasticsearch) ---
    let keywordSearchResults = [];
    try {
      const esQuery = {
        index: "profiles",
        body: {
          query: {
            multi_match: {
              query: query,
              fields: [
                "name^3",
                "bio^2",
                "skills^2",
                "designation^2",
                "target_industries",
                "full_text_content",
              ],
              fuzziness: "AUTO",
            },
          },
        },
      };
      const esResponse = await elasticsearchClient.search(esQuery);
      keywordSearchResults = esResponse.hits.hits.map((hit) => ({
        profile_id: hit._id,
        score: hit._score,
        source: hit._source,
      }));
      console.log(
        "Elasticsearch keyword search results length:",
        keywordSearchResults.length
      );
    } catch (esError) {
      console.error("Elasticsearch keyword search error:", esError);
      // Continue without keyword results if ES fails
    }
    // --- Combine and Re-rank Results ---
    const combinedResultsMap = new Map();
    // Add semantic search results
    semanticSearchResults.forEach((result) => {
      const existing = combinedResultsMap.get(result.profile_id);
      if (existing) {
        existing.semantic_similarity = result.similarity;
      } else {
        combinedResultsMap.set(result.profile_id, {
          profile_id: result.profile_id,
          semantic_similarity: result.similarity,
          keyword_score: 0,
        });
      }
    });
    // Add keyword search results, updating if already present
    keywordSearchResults.forEach((result) => {
      const existing = combinedResultsMap.get(result.profile_id);
      if (existing) {
        existing.keyword_score = result.score;
      } else {
        combinedResultsMap.set(result.profile_id, {
          profile_id: result.profile_id,
          semantic_similarity: 0,
          keyword_score: result.score,
        });
      }
    });
    // Simple re-ranking: prioritize semantic similarity, then keyword score
    // This can be made more sophisticated with weighted sums or other algorithms
    const finalResults = Array.from(combinedResultsMap.values())
      .filter(
        (result) => result.keyword_score > 0 || result.semantic_similarity > 1
      ) // Keep profiles with either keyword score > 0 or semantic similarity > 0
      .sort((a, b) => {
        // Prioritize keyword score first
        if (a.keyword_score !== b.keyword_score) {
          return b.keyword_score - a.keyword_score;
        }
        // Then semantic similarity
        return b.semantic_similarity - a.semantic_similarity;
      });
    return new Response(JSON.stringify(finalResults), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error processing request:", err.message);
      return new Response(
        JSON.stringify({
          error: err.message,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 500,
        }
      );
    }
  }
});
