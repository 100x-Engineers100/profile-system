import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""; // Assuming generate-embeddings uses anon key
    // Fetch all profile IDs and content
    const { data: profiles, error: fetchError } = await supabaseClient
      .from("profiles")
      .select(
        "id, user_id, email, role, name, cohort_number, bio, skills, designation, years_of_experience, location, is_student, working_professional, study_stream, company, expected_outcomes, track, founder, founder_details, code_type, current_industry, domain, target_industries, industry_interest, interest_areas, open_to_work, house"
      );
    if (fetchError) {
      console.error("Error fetching profiles:", fetchError);
      return new Response(
        JSON.stringify({
          error: fetchError.message,
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
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No profiles found to reindex.",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        }
      );
    }
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const generateEmbeddingsUrl = `${Deno.env.get(
      "SUPABASE_URL"
    )}/functions/v1/generate-embeddings`;
    const BATCH_SIZE = 10; // Process 10 profiles at a time
    let currentBatch = [];
    for (const profile of profiles) {
      // Check if embedding already exists for this profile
      const { data: existingEmbedding, error: embeddingError } =
        await supabaseClient
          .from("profile_embeddings")
          .select("id")
          .eq("id", profile.id)
          .single();
      if (embeddingError && embeddingError.code !== "PGRST116") {
        console.error(
          `Error checking existing embedding for profile ${profile.id}:`,
          embeddingError.message
        );
        errorCount++;
        errors.push(
          `Profile ${profile.id}: Error checking existing embedding - ${embeddingError.message}`
        );
        continue;
      }
      if (existingEmbedding) {
        console.log(
          `Embedding already exists for profile ${profile.id}, skipping.`
        );
        successCount++; // Consider it a success as it's already processed
        continue;
      }
      currentBatch.push(profile);
      // If batch is full or it's the last profile, process the batch
      if (
        currentBatch.length === BATCH_SIZE ||
        profile === profiles[profiles.length - 1]
      ) {
        try {
          const batchContents = currentBatch
            .map((p) => {
              const content = [
                p.name ? `Name: ${p.name}` : "",
                p.bio ? `Bio: ${p.bio}` : "",
                p.designation ? `Designation: ${p.designation}` : "",
                p.company ? `Company: ${p.company}` : "",
                p.location ? `Location: ${p.location}` : "",
                p.skills ? `Skills: ${p.skills}` : "",
                p.years_of_experience
                  ? `Years of Experience: ${p.years_of_experience}`
                  : "",
                p.cohort_number ? `Cohort Number: ${p.cohort_number}` : "",
                p.is_student ? `Is Student: ${p.is_student}` : "",
                p.working_professional
                  ? `Working Professional: ${p.working_professional}`
                  : "",
                p.study_stream ? `Study Stream: ${p.study_stream}` : "",
                p.expected_outcomes
                  ? `Expected Outcomes: ${p.expected_outcomes}`
                  : "",
                p.track ? `Track: ${p.track}` : "",
                p.founder ? `Founder: ${p.founder}` : "",
                p.founder_details
                  ? `Founder Details: ${p.founder_details}`
                  : "",
                p.code_type ? `Code Type: ${p.code_type}` : "",
                p.current_industry
                  ? `Current Industry: ${p.current_industry}`
                  : "",
                p.domain ? `Domain: ${p.domain}` : "",
                p.target_industries
                  ? `Target Industries: ${p.target_industries}`
                  : "",
                p.industry_interest
                  ? `Industry Interest: ${p.industry_interest}`
                  : "",
                p.interest_areas ? `Interest Areas: ${p.interest_areas}` : "",
                p.open_to_work ? `Open to Work: ${p.open_to_work}` : "",
                p.house ? `House: ${p.house}` : "",
              ]
                .filter(Boolean)
                .join(" \n ");
              return {
                profile_id: p.id,
                content: content,
              };
            })
            .filter((item) => item.content.trim()); // Filter out profiles with no meaningful content
          if (batchContents.length === 0) {
            console.warn(
              `Batch has no meaningful content after filtering, skipping embedding generation.`
            );
            errorCount += currentBatch.length; // Count all profiles in the batch as errors if no content
            currentBatch.forEach((p) =>
              errors.push(`Profile ${p.id}: No meaningful content to embed.`)
            );
            currentBatch = [];
            continue;
          }
          const response = await fetch(generateEmbeddingsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              profiles: currentBatch.map((p) => ({
                profile_id: p.id,
                content: [
                  p.name ? `Name: ${p.name}` : "",
                  p.bio ? `Bio: ${p.bio}` : "",
                  p.designation ? `Designation: ${p.designation}` : "",
                  p.company ? `Company: ${p.company}` : "",
                  p.location ? `Location: ${p.location}` : "",
                  p.skills ? `Skills: ${p.skills}` : "",
                  p.years_of_experience
                    ? `Years of Experience: ${p.years_of_experience}`
                    : "",
                  p.cohort_number ? `Cohort Number: ${p.cohort_number}` : "",
                  p.is_student ? `Is Student: ${p.is_student}` : "",
                  p.working_professional
                    ? `Working Professional: ${p.working_professional}`
                    : "",
                  p.study_stream ? `Study Stream: ${p.study_stream}` : "",
                  p.expected_outcomes
                    ? `Expected Outcomes: ${p.expected_outcomes}`
                    : "",
                  p.track ? `Track: ${p.track}` : "",
                  p.founder ? `Founder: ${p.founder}` : "",
                  p.founder_details
                    ? `Founder Details: ${p.founder_details}`
                    : "",
                  p.code_type ? `Code Type: ${p.code_type}` : "",
                  p.current_industry
                    ? `Current Industry: ${p.current_industry}`
                    : "",
                  p.domain ? `Domain: ${p.domain}` : "",
                  p.target_industries
                    ? `Target Industries: ${p.target_industries}`
                    : "",
                  p.industry_interest
                    ? `Industry Interest: ${p.industry_interest}`
                    : "",
                  p.interest_areas ? `Interest Areas: ${p.interest_areas}` : "",
                  p.open_to_work ? `Open to Work: ${p.open_to_work}` : "",
                  p.house ? `House: ${p.house}` : "",
                ]
                  .filter(Boolean)
                  .join(" \n "),
                // Pass all relevant fields for Elasticsearch indexing
                name: p.name,
                bio: p.bio,
                skills: p.skills,
                years_of_experience: p.years_of_experience,
                location: p.location,
                target_industries: p.target_industries,
                designation: p.designation,
                house: p.house,
                cohort_number: p.cohort_number,
              })),
            }), // Send an array of profiles
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `HTTP error! status: ${response.status}, body: ${errorText}`
            );
          }
          const result = await response.json();
          successCount += result.successCount || 0;
          errorCount += result.errorCount || 0;
          if (result.errors) {
            errors.push(...result.errors);
          }
        } catch (callError: unknown) {
          console.error(
            `Error calling generate-embeddings for a batch:`,
            callError instanceof Error ? callError.message : String(callError)
          );
          errorCount += currentBatch.length;
          currentBatch.forEach((p) =>
            errors.push(
              `Profile ${p.id}: ${
                callError instanceof Error
                  ? callError.message
                  : String(callError)
              }`
            )
          );
        }
        currentBatch = []; // Clear the batch after processing
      }
    }
    console.log(
      `Reindexing complete. Successfully processed ${successCount} profiles. Failed to process ${errorCount} profiles.`
    );
    return new Response(
      JSON.stringify({
        message: `Reindexing complete. Successfully processed ${successCount} profiles. Failed to process ${errorCount} profiles.`,
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
  } catch (e: unknown) {
    console.error(
      "Unhandled error:",
      e instanceof Error ? e.message : String(e)
    );
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
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
});
