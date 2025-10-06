# AI Search Feature Documentation

This document outlines the architecture and workflow of the AI Search feature implemented in the 100xEngineers platform, focusing on the `handleSearch()` function, embedding generation, hybrid search mechanisms, and cosine similarity calculations.

## 1. `handleSearch()` Function Workflow

The `handleSearch()` function in `app/page.tsx` orchestrates the entire AI search process, transforming a user's natural language query into a structured search request and presenting ranked results.

### 1.1. Natural Language Query to Structured JSON (LLM API Call)

1.  **Input**: The user's natural language search query (e.g., "full stack developer with 2 years of experience in React and Node.js, expecting 20 LPA").
2.  **LLM Processing**: The query is sent to an OpenAI LLM (specifically `gpt-3.5-turbo`) with a detailed system prompt. This prompt instructs the LLM to extract key information and format it into a structured JSON object.
    *   **Mandatory Fields**: `skills` (comma-separated list) and `bio` (concise description combining role and skills, avoiding adjectives, conjunctions, and specific terms like 'developer', 'professional'). If not explicitly mentioned, the LLM infers these based on the `role`.
    *   **Optional Fields**: `role`, `years_of_experience`, and `ctc` (expected salary range). These are included only if explicitly mentioned or clearly inferable from the query.
3.  **Output**: A JSON object containing the structured query parameters (e.g., `{"role": "full stack developer", "skills": "React, Node.js", "bio": "Full stack, React, Node.js.", "years_of_experience": "2 years", "ctc": "20 LPA"}`).

### 1.2. Hybrid Search Request to Edge Function

1.  **Query Construction**: The structured JSON object obtained from the LLM is stringified and used as the `query` parameter for the hybrid search.
2.  **API Call**: A `POST` request is made to the `NEXT_PUBLIC_SUPABASE_HYBRID_SEARCH_URL` edge function. The request body includes the structured query and a flag `llm_config: {enabled:true}`.
3.  **Purpose**: This edge function performs both semantic and keyword (elastic) searches based on the refined query, leveraging the embeddings and search indices.

### 1.3. Processing Hybrid Search Results (Combined Scoring and Sorting)

1.  **Response**: The edge function returns a list of potential profile matches, each containing `semantic_similarity` and `keyword_score`.
2.  **Combined Score Calculation**: For each profile, a `combined_score` is calculated by summing `semantic_similarity` and `keyword_score`. This simple sum currently serves as the ranking metric.
3.  **Sorting**: Profiles are then sorted in descending order based on their `combined_score` to prioritize the most relevant results.
4.  **Profile ID Extraction**: The `profile_id`s from the sorted results are extracted for further processing.

### 1.4. Fetching Profile Details

1.  **`profile_embeddings` Lookup**: The `profile_id`s are used to fetch `id` and `content` from the `profile_embeddings` table in Supabase.
2.  **`mentee_details` Lookup**: Concurrently, `profile_id`, `role`, `tech_stack`, `current_location`, `current_ctc`, and `expected_ctc` are fetched from the `mentee_details` table.
3.  **Data Consolidation**: The fetched data from both tables is mapped and consolidated to create a comprehensive view of each matched profile, including `profile_embedding_content`, `mentee_role`, `mentee_tech_stack`, etc.
4.  **Refined Profile IDs**: The `profile_id`s are then used to fetch the full profile details from the `profiles` table, including `name`, `avatar_url`, `cohort_number`, `bio`, `track`, `skills`, `designation`, `years_of_experience`, and `location`.
5.  **Ordering Results**: The final list of profiles is ordered according to the `refinedProfileIds` obtained from the combined scoring and sorting step, ensuring the most relevant profiles are displayed first.

### 1.5. Generating AI Description

1.  **Summary Generation**: After retrieving and formatting the search results, another OpenAI LLM call is made.
2.  **Prompt**: The LLM is prompted to summarize the search results based on the original structured query and the number of talent found.
3.  **Display**: The generated summary is then displayed to the user as `searchResultsDescription`, providing a natural language overview of the search outcome.

## 2. Embedding Generation

The embedding generation process is crucial for enabling semantic search. It involves:

*   **Content Extraction**: All relevant content from the `profiles` and `mentee_details` tables is extracted.
*   **Multiple Embeddings**: For each profile, the following embeddings are generated:
    *   `full_profile_content_embedding`: Represents the entire profile content.
    *   `bio_embedding`: Represents the profile's biography.
    *   `skills_embedding`: Represents the technical skills listed.
    *   `experience_embedding`: Represents the years of experience.
    *   `ctc_embedding`: Represents the expected CTC or salary.
*   **Elasticsearch Indexing**: Simultaneously, an index for keyword (elastic) search is created using `elasticSearchClient` to facilitate efficient keyword-based retrieval.

## 3. Cosine Similarity Function for Matching Profiles

The system uses a cosine similarity function to match profiles based on various embedded fields. The following SQL query demonstrates how similarity is calculated and weighted:

```sql
SELECT
    pe.id as profile_id,
    (
      COALESCE((1 - (pe.bio_embedding <#> query_embedding)), 0) * bio_weight +
      COALESCE((1 - (pe.skills_embedding <#> query_embedding)), 0) * skills_weight +
      COALESCE((1 - (pe.experience_embedding <#> query_embedding)), 0) * experience_weight +
      COALESCE((1 - (pe.full_text_embedding <#> query_embedding)), 0) * full_text_weight +
      COALESCE((1 - (pe.ctc_embedding <#> query_embedding)), 0) * ctc_weight
    ) / (bio_weight + skills_weight + experience_weight + full_text_weight + ctc_weight) AS similarity
  FROM profile_embeddings pe
  WHERE
    COALESCE((1 - (pe.bio_embedding <#> query_embedding)), 0) > match_threshold OR
    COALESCE((1 - (pe.skills_embedding <#> query_embedding)), 0) > match_threshold OR
    COALESCE((1 - (pe.experience_embedding <#> query_embedding)), 0) > match_threshold OR
    COALESCE((1 - (pe.full_text_embedding <#> query_embedding)), 0) > match_threshold OR
    COALESCE((1 - (pe.ctc_embedding <#> query_embedding)), 0) > match_threshold
  ORDER BY similarity DESC;
```

*   **Weighted Similarity**: The `similarity` score is a weighted average of the cosine similarity (calculated as `1 - (embedding <#> query_embedding)`) across `bio`, `skills`, `experience`, `full_text`, and `ctc` embeddings.
*   **`COALESCE`**: Handles cases where an embedding might be null, defaulting its contribution to 0.
*   **`match_threshold`**: Filters out profiles that do not meet a minimum similarity threshold in at least one of the specified fields.
*   **`ORDER BY similarity DESC`**: Ensures that the most similar profiles are returned first.

## 4. Hybrid Search Edge Function

The hybrid search edge function plays a pivotal role in combining different search methodologies:

*   **Input**: Receives the refined query from `handleSearch()`.
*   **Semantic Search**: Utilizes the generated embeddings and the cosine similarity function to find profiles semantically similar to the query.
*   **Elastic Search (Keyword Search)**: Performs a keyword-based search using the Elasticsearch index to find profiles matching specific terms in the query.
*   **Combined Results**: The edge function intelligently merges the results from both semantic and elastic searches, providing both a `keyword_score` and `semantic_similarity` for each matched profile. This allows for a comprehensive ranking that considers both the meaning and the exact terms of the search query.