import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "npm:openai@4.8.0";
import { Client } from "npm:@elastic/elasticsearch@8";

declare global {
  namespace Deno {
    function serve(handler: (req: Request) => Promise<Response>): void;
    const env: {
      get(key: string): string | undefined;
    };
  }
}

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
    // Expecting a POST request with an array of profiles in the body
    // The batchedProfiles should now include all fields needed for Elasticsearch indexing
    const { profiles: batchedProfiles } = await req.json();

    if (
      !batchedProfiles ||
      !Array.isArray(batchedProfiles) ||
      batchedProfiles.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: 'Missing or empty "profiles" array in request body',
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

    // Initialize Supabase client
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

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    // Initialize Elasticsearch client
    const elasticsearchClient = new Client({
      node: Deno.env.get("ELASTICSEARCH_URL"),
      auth: {
        apiKey: Deno.env.get("ELASTICSEARCH_API_KEY"),
      },
    });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const {
      profile_id,
      application_id,
      content, // This is the concatenated text for embedding
      name,
      bio,
      skills, // Assuming this is an array or string
      years_of_experience,
      location,
      target_industries, // Assuming this is an array or string
      designation,
      house,
      cohort_number,
    } of batchedProfiles) {
      if (!content || (!profile_id && !application_id)) {
        errorCount++;
        errors.push(
          `Missing profile_id/application_id or content for one of the batched items.`
        );
        continue;
      }

      try {
        // OpenAI recommends replacing newlines with spaces for best results
        const input = content.replace(/\n/g, " ");
        const bioInput = bio ? bio.replace(/\n/g, " ") : null;
        const skillsInput = skills ? skills.replace(/\n/g, " ") : null;
        const experienceInput = years_of_experience ? `${years_of_experience} years of experience` : null;

        // Generate embeddings for full content, bio, and skills
        const embeddingPromises = [];
        embeddingPromises.push(
          openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: input,
          })
        );
        if (bioInput) {
          embeddingPromises.push(
            openai.embeddings.create({
              model: "text-embedding-ada-002",
              input: bioInput,
            })
          );
        }
        if (skillsInput) {
          embeddingPromises.push(
            openai.embeddings.create({
              model: "text-embedding-ada-002",
              input: skillsInput,
            })
          );
        }
        if (experienceInput) {
          embeddingPromises.push(
            openai.embeddings.create({
              model: "text-embedding-ada-002",
              input: experienceInput,
            })
          );
        }

        const [fullTextEmbeddingResponse, bioEmbeddingResponse, skillsEmbeddingResponse, experienceEmbeddingResponse] = await Promise.all(embeddingPromises);

        const full_text_embedding = fullTextEmbeddingResponse.data[0].embedding;
        const bio_embedding = bioEmbeddingResponse ? bioEmbeddingResponse.data[0].embedding : null;
        const skills_embedding = skillsEmbeddingResponse ? skillsEmbeddingResponse.data[0].embedding : null;
        const experience_embedding = experienceEmbeddingResponse ? experienceEmbeddingResponse.data[0].embedding : null;

        // --- Store embedding in Supabase (pgvector) ---
        let supabaseError;
        if (profile_id) {
          ({ error: supabaseError } = await supabase.from("profile_embeddings").upsert(
            {
              id: profile_id,
              content, // Keep for now, might remove later
              embedding: full_text_embedding, // Keep for now, might remove later
              full_text_embedding,
              bio_embedding,
              skills_embedding,
              experience_embedding,
            },
            {
              onConflict: "id",
            }
          ));
        } else if (application_id) {
          ({ error: supabaseError } = await supabase.from("application_embeddings").upsert(
            {
              application_id,
              content,
              embedding: full_text_embedding,
            },
            {
              onConflict: "application_id",
            }
          ));
        }

        if (supabaseError) {
          console.error(
            `Error upserting embedding for ${profile_id || application_id}:`,
            supabaseError.message
          );
          errorCount++;
          errors.push(`${profile_id || application_id} (Supabase): ${supabaseError.message}`);
          continue; // Skip Elasticsearch indexing if Supabase failed
        }

        // --- Index document in Elasticsearch ---
        if (profile_id) {
          const esDocument = {
            id: profile_id,
            name: name,
            bio: bio,
            skills: skills,
            years_of_experience: years_of_experience,
            location: location,
            target_industries: target_industries,
            designation: designation,
            house: house,
            cohort_number: cohort_number,
            full_text_content: content, // Index the full content for general text search in ES
          };

          try {
            await elasticsearchClient.index({
              index: "profiles", // Use the index name you defined in Elasticsearch
              id: profile_id,
              document: esDocument,
            });
            console.log(`Indexed profile ${profile_id} in Elasticsearch.`);
          } catch (esError) {
            if (esError instanceof Error) {
              console.error(`Error indexing profile ${profile_id} in Elasticsearch:`, esError.message);
              errorCount++;
              errors.push(`${profile_id} (Elasticsearch): ${esError.message}`);
            }
            // Continue processing other profiles even if ES indexing fails for one
          }
        }
        // If application_id needs to be indexed in ES, add similar logic here

        successCount++; // Only increment success if both Supabase and ES (if applicable) were attempted
      } catch (itemError) {
        if (itemError instanceof Error) {
          console.error(`Error processing item ${profile_id || application_id}:`, itemError.message);
          errorCount++;
          errors.push(`${profile_id || application_id}: ${itemError.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Batch processing complete. Successfully processed ${successCount} items. Failed to process ${errorCount} items.`,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: errorCount > 0 ? 500 : 200,
      }
    );
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
