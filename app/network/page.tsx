'use client';

import { useState, useMemo, useEffect } from 'react';
import { ProfileCard, ProfileCardData } from '@/components/profile-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

export default function NetworkPage() {
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [profiles, setProfiles] = useState<ProfileCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'mentors'>('members');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      let query = supabase.from('profiles').select('id, name, avatar_url, cohort_number, track, bio, skills, designation, years_of_experience, location');

      if (selectedCohort !== 'all') {
        query = query.eq('cohort_number', selectedCohort);
      }

      if (activeTab === 'mentors') {
        // query = query.eq('role', 'mentor');
      } else if (activeTab === 'members') {
        // query = query.eq('role', 'member');
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching profiles:', error);
        setProfiles([]);
      } else {
        setProfiles(data as ProfileCardData[]);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [selectedCohort]);

  const cohorts = useMemo(() => {
    const uniqueCohorts = new Set<string>();
    profiles.forEach(profile => {
      if (profile.cohort_number) {
              uniqueCohorts.add(profile.cohort_number);
            }
    });
    return ['all', ...Array.from(uniqueCohorts).sort()];
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    if (selectedCohort === 'all') {
      return profiles;
    }
    return profiles.filter(profile => profile.cohort_number === selectedCohort);
  }, [selectedCohort, profiles]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-extrabold mb-8 text-gray-900 dark:text-white text-center">Explore Our Network</h1>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex space-x-3">
            <button
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'members' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
            <button
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'mentors' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
              onClick={() => setActiveTab('mentors')}
            >
              Mentors
            </button>
            <Select onValueChange={setSelectedCohort} value={selectedCohort}>
              <SelectTrigger id="cohort-filter" className="w-[180px] rounded-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                <SelectValue placeholder="All Cohorts" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {cohorts.map(cohort => (
                  <SelectItem key={cohort} value={cohort}>
                    {cohort === 'all' ? 'All Cohorts' : cohort}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full md:w-auto">
            <Input
              type="text"
              placeholder="Search profiles..."
              className="pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card text-card-foreground shadow-md p-6 animate-pulse">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProfiles.map(profile => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}