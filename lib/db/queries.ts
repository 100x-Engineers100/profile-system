interface IkigaiData {
  what_you_love: string;
  what_you_are_good_at: string;
  what_world_needs: string;
  what_you_can_be_paid_for: string;
  status: string;
  your_ikigai: string;
  explanation: string;
  next_steps?: string;
  strength_map?: {
    core_strengths: string[];
    supporting_skills: string[];
    proof: string;
  };
  weakness_map?: {
    skill_gaps: string[];
    risks: string[];
    blocks: string[];
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
}

import { supabase } from "@/lib/supabase";

export async function createOrUpdateUserIkigaiData(
  userId: string,
  chatNumber: number,
  ikigaiDetails: IkigaiData,
  chatHistory: ChatMessage[]
) {
  // First, try to update the existing record
  const { data: updateData, error: updateError } = await supabase
    .from("user_ikigai_data")
    .update({
      ikigai_details: ikigaiDetails,
      chat_history: chatHistory,
    })
    .eq("user_id", userId)
    .eq("chat_number", chatNumber)
    .select();

  if (updateError) {
    console.error("Error updating user ikigai data:", updateError);
    throw updateError;
  }

  // If the update affected 0 rows, it means the record doesn't exist. So, insert it.
  if (updateData && updateData.length === 0) {
    const { data: insertData, error: insertError } = await supabase
      .from("user_ikigai_data")
      .insert([
        {
          user_id: userId,
          chat_number: chatNumber,
          ikigai_details: ikigaiDetails,
          chat_history: chatHistory,
        },
      ])
      .select();

    if (insertError) {
      console.error("Error inserting user ikigai data:", insertError);
      throw insertError;
    }
    return { data: insertData[0] };
  }

  return { data: updateData[0] };
}

export async function getUserIkigaiDataByUserId(userId: string) {
  const { data, error } = await supabase
    .from("user_ikigai_data")
    .select("ikigai_details, chat_history, chat_number")
    .eq("user_id", userId);
  if (error) {
    if (error.code === "PGRST116") {
      // No rows found
      return null;
    }
    throw error;
  }

  return data;
}

export async function deleteUserIkigaiDataByUserId(userId: string) {
  const { error } = await supabase
    .from("user_ikigai_data")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
  return { message: "Ikigai data deleted successfully" };
}

// Profile Message Count
export async function incrementMessageCount(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ message_count: "message_count + 1" })
    .eq("id", userId);

  if (error) {
    console.error("Error incrementing message count:", error);
    throw error;
  }
  return data;
}

export async function getDocumentsById({ id }: { id: string }) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id);

  if (error) {
    console.error("Error getting documents by id:", error);
    throw error;
  }
  return data;
}

export async function saveDocument({
  id,
  content,
  title,
  kind,
  userId,
}: {
  id: string;
  content: string;
  title: string;
  kind: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("documents")
    .upsert({ id, content, title, kind, user_id: userId }, { onConflict: "id" })
    .select();

  if (error) {
    console.error("Error saving document:", error);
    throw error;
  }
  return data;
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  const { data, error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .gt("created_at", timestamp.toISOString());

  if (error) {
    console.error("Error deleting documents by id and timestamp:", error);
    throw error;
  }
  return data;
}

// Project Ideas CRUD
export const createProjectIdea = async (data: {
  user_id: string;
  module_name: string;
  problem_statement: string | null;
  solution: string | null;
  chat_history: any;
  features: string[] | null;
  is_accepted?: boolean; // Add is_accepted field
  user_name?: string; // Add user_name field
}) => {
  const { data: newIdea, error } = await supabase
    .from("project_ideas")
    .insert({
      user_id: data.user_id,
      module_name: data.module_name,
      problem_statement: data.problem_statement,
      solution: data.solution,
      chat_history: data.chat_history,
      features: data.features,
      is_accepted: data.is_accepted || false, // Default to false if not provided
      user_name: data.user_name,
    })
    .select();

  if (error) {
    console.error("Error creating project idea:", error);
    throw error;
  }
  return newIdea[0];
};

export async function getPendingProjectIdeas(cohortName?: string) {
  let query = supabase
    .from("project_ideas")
    .select("*, profiles!project_ideas_user_id_fkey(cohort_number, name)")
    .eq("is_accepted", false);

  if (cohortName) {
    const cohortNumber = parseInt(cohortName, 10);
    query = query.not("profiles.cohort_number", "is", null);
    query = query.eq("profiles.cohort_number", cohortNumber);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getting pending project ideas:", error);
    throw error;
  }
  return data;
}

export async function updateProjectIdeaStatus(id: string, isAccepted: boolean) {
  const { data, error } = await supabase
    .from("project_ideas")
    .update({ is_accepted: isAccepted, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error updating project idea status:", error);
    throw error;
  }
  return data[0];
}

export async function getProjectIdeasByUserId(
  userId: string,
  moduleName?: string
) {
  let query = supabase.from("project_ideas").select("*").eq("user_id", userId);

  if (moduleName) {
    query = query.eq("module_name", moduleName);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error getting project ideas by user ID:", error);
    throw error;
  }
  return data;
}

export async function updateProjectIdea(
  id: string,
  updates: {
    problem_statement?: string | null;
    solution?: string | null;
    chat_history?: any;
    is_accepted?: boolean;
    features?: string[] | null;
    user_name?: string; // Add user_name to updateable fields
  }
) {
  const { data, error } = await supabase
    .from("project_ideas")
    .update(updates)
    .eq("id", id)
    .select();
  if (error) {
    console.error("Error updating project idea:", error);
    throw error;
  }
  return data[0];
}

// Roadmaps CRUD
export async function createRoadmap(roadmap: {
  userId: string;
  sessionName: string;
  weekNumber: number;
  lectureNumber: number;
  moduleName: string;
  projectBasedMessage: string;
  outcomeBasedMessage: string;
}) {
  const { data, error } = await supabase
    .from("roadmaps")
    .insert({
      user_id: roadmap.userId,
      session_name: roadmap.sessionName,
      week_number: roadmap.weekNumber,
      lecture_number: roadmap.lectureNumber,
      module_name: roadmap.moduleName,
      project_based_msg: roadmap.projectBasedMessage,
      outcome_based_msg: roadmap.outcomeBasedMessage,
    })
    .select();
  if (error) throw error;
  return data[0];
}

export async function getRoadmapsByUserId(userId: string) {
  const { data, error } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function getUserIdeationBalance(
  userId: string,
  balanceType: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(balanceType)
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error getting ideation balance:", error);
    throw error;
  }
  return (data as any)?.[balanceType] || 0;
}

export async function updateUserIdeationBalance(
  userId: string,
  amount: number,
  balanceType: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ [balanceType]: amount })
    .eq("id", userId);

  if (error) {
    console.error("Error updating ideation balance:", error);
    throw error;
  }
  return data;
}

export async function getIkigaiBalanceByUserId(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("ikigai_balance")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error getting ikigai balance:", error);
    throw error;
  }
  return data?.ikigai_balance || 0;
}

export async function updateIkigaiBalance(userId: string, amount: number) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ikigai_balance: amount })
    .eq("id", userId);

  if (error) {
    console.error("Error updating ikigai balance:", error);
    throw error;
  }
  return data;
}

export async function getRechargeRequests() {
  const { data: requests, error: requestsError } = await supabase
    .from("recharge_requests")
    .select("*")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  if (requestsError) {
    console.error("Error getting recharge requests:", requestsError);
    throw requestsError;
  }

  // Fetch approved counts for each mentee_id and type
  const { data: approvedRequestsData, error: countsError } = await supabase
    .from("recharge_requests")
    .select("mentee_id, type")
    .eq("status", "approved");

  if (countsError) {
    console.error("Error getting approved counts:", countsError);
    throw countsError;
  }

  // Map approved counts for easy lookup
  const approvedCountsMap = new Map<string, number>();
  approvedRequestsData.forEach((item: any) => {
    // Create a unique key for mentee_id and type
    const key = `${item.mentee_id}-${item.type}`;
    approvedCountsMap.set(key, (approvedCountsMap.get(key) || 0) + 1);
  });

  // Enrich the requests with the approved count
  const enrichedRequests = requests.map((request: any) => {
    const key = `${request.mentee_id}-${request.type}`;
    const approvedCount = approvedCountsMap.get(key) || 0;
    return {
      ...request,
      approved_count_for_type: approvedCount,
    };
  });

  return enrichedRequests;
}

export async function updateRechargeRequestStatus(
  id: string,
  status: "approved" | "rejected",
  menteeId: string,
  amount: number,
  balanceType: string
) {
  const { data, error } = await supabase
    .from("recharge_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error updating recharge request status:", error);
    throw error;
  }

  if (status === "approved") {
    // Fetch current balance
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(balanceType)
      .eq("id", menteeId)
      .single();

    if (profileError) {
      console.error("Error fetching profile balance:", profileError);
      throw profileError;
    }

    const currentBalance = (profileData as any)[balanceType] || 0;
    const newBalance = currentBalance + amount;

    // Update balance
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ [balanceType]: newBalance })
      .eq("id", menteeId);

    if (updateError) {
      console.error("Error updating mentee balance:", updateError);
      throw updateError;
    }
  }

  return data[0];
}

export async function createRechargeRequest(
  menteeId: string,
  amount: number,
  chatHistory: ChatMessage[],
  balanceType: string,
  menteeName: string
) {
  const { data, error } = await supabase
    .from("recharge_requests")
    .upsert({
      mentee_id: menteeId,
      amount,
      status: "pending",
      created_at: new Date().toISOString(),
      chat_history: chatHistory,
      type: balanceType,
      mentee_name: menteeName,
    })
    .select();

  if (error) {
    console.error("Error inserting recharge request:", error);
    throw new Error("Failed to create recharge request");
  }
  return data[0];
}

export async function getProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found
      return null;
    }
    console.error("Error getting profile by email:", error);
    throw error;
  }
  return data;
}

export async function getProfilesByCohort(cohortName: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("cohort_number", cohortName);

  if (error) {
    console.error("Error getting profiles by cohort:", error);
    throw error;
  }
  return data;
}
