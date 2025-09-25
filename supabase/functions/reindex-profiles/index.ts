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

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const payload = await req.json();
    const record = payload.record; // New or updated record from Supabase webhook

    if (!record || !record.id) {
      return new Response(
        JSON.stringify({ error: "Missing record or record ID in webhook payload" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const profile_id = record.id;
    const name = record.name || "";
    const bio = record.bio || "";
    const skills = record.skills ? record.skills.join(" ") : ""; // Assuming skills is an array
    const years_of_experience = record.years_of_experience || 0;
    const location = record.location || "";
    const target_industries = record.target_industries
      ? record.target_industries.join(" ")
      : ""; // Assuming target_industries is an array
    const designation = record.designation || "";
    const house = record.house || "";
    const cohort_number = record.cohort_number || 0;

    // Concatenate relevant fields for embedding
    const content = [
      name,
      bio,
      skills,
      designation,
      location,
      target_industries,
      `Years of experience: ${years_of_experience}`,
      `House: ${house}`,
      `Cohort: ${cohort_number}`,
    ]
      .filter(Boolean)
      .join(" . ");

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content generated for embedding" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // OpenAI recommends replacing newlines with spaces for best results
    const input = content.replace(/\n/g, " ");

    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input,
    });
    const [{ embedding }] = embeddingResponse.data;

    // --- Store embedding in Supabase (pgvector) ---
    const { error: supabaseError } = await supabase.from("profile_embeddings").upsert(
      {
        id: profile_id,
        content,
        embedding,
      },
      {
        onConflict: "id",
      }
    );

    if (supabaseError) {
      console.error(
        `Error upserting embedding for profile ${profile_id}:`,
        supabaseError.message
      );
      return new Response(
        JSON.stringify({ error: `Supabase upsert failed: ${supabaseError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // --- Index document in Elasticsearch ---
    const esDocument = {
      id: profile_id,
      name: name,
      bio: bio,
      skills: record.skills, // Send as array to ES if it's an array
      years_of_experience: years_of_experience,
      location: location,
      target_industries: record.target_industries, // Send as array to ES if it's an array
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
        return new Response(
          JSON.stringify({ error: `Elasticsearch indexing failed: ${esError.message}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        message: `Profile ${profile_id} reindexed successfully.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error processing reindex request:", err.message);
      return new Response(
        JSON.stringify({
          error: err.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  }
});