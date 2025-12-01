"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

type AuthContextType = {
  user: User | null;
  loading: boolean;
  profile: any | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split("@")[0],
          });
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split("@")[0],
        });
      } else {
        setUser(null);
      }
      setLoading(false); // Set loading to false after initial user check
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function ensureProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      // 1. Check for a profile with the current UID
      let existing = null;
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // No profile found by ID, proceed to check by email
        existing = null;
      } else if (fetchError) {
        console.error("Error fetching profile by ID:", fetchError);
        setLoading(false);
        return;
      } else {
        existing = data;
      }

      // 2. If not found, check for a profile with the same email (old UUID)
      if (!existing) {
        const { data: oldProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();

        if (oldProfile) {
            // We found an old profile by email, but the user's auth.users.id has changed.
            // We need to associate this old profile with the new user.id.
            // The profiles.id (which profile_embeddings references) should remain the same.

            // Update the profiles table's user_id to the new user.id
            const { error: profileUpdateError } = await supabase
              .from("profiles")
              .update({ user_id: user.id })
              .eq("id", oldProfile.id);

            if (profileUpdateError) {
              console.error("Error migrating profile user_id:", profileUpdateError);
              setLoading(false);
              return;
            }

            // If update is successful, update existing
            existing = { ...oldProfile, user_id: user.id };
          } else {
          // 4. If no profile, create a new one
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              email: user.email,
              user_id: user.id,
              role: "user",
              public_email: true,
              name: user.user_metadata?.name || user.email?.split("@")[0],
            });
          if (insertError) {
            console.error("Error creating profile:", insertError);
          } else {
            existing = {
              id: user.id,
              email: user.email,
              user_id: user.id,
              role: "user",
              public_email: true,
              name: user.user_metadata?.name || user.email?.split("@")[0],
            };
          }
        }
      }

      setProfile(existing);
      setLoading(false);
    }

    if (!loading) { // Only run ensureProfile if initial loading is complete
      ensureProfile();
    }
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
