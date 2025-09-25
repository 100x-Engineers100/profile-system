CREATE OR REPLACE FUNCTION match_profiles_field_wise(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  bio_weight float,
  skills_weight float,
  experience_weight float,
  full_text_weight float
)
RETURNS TABLE(profile_id uuid, similarity float)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id as profile_id,
    (
      COALESCE((1 - (pe.bio_embedding <#> query_embedding)), 0) * bio_weight +
      COALESCE((1 - (pe.skills_embedding <#> query_embedding)), 0) * skills_weight +
      COALESCE((1 - (pe.experience_embedding <#> query_embedding)), 0) * experience_weight +
      COALESCE((1 - (pe.full_text_embedding <#> query_embedding)), 0) * full_text_weight
    ) / (bio_weight + skills_weight + experience_weight + full_text_weight) AS similarity
  FROM profile_embeddings pe
  WHERE
    COALESCE((1 - (pe.bio_embedding <#> query_embedding)), 0) > match_threshold OR
    COALESCE((1 - (pe.skills_embedding <#> query_embedding)), 0) > match_threshold OR
    COALESCE((1 - (pe.experience_embedding <#> query_embedding)), 0) > match_threshold OR
    COALESCE((1 - (pe.full_text_embedding <#> query_embedding)), 0) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;