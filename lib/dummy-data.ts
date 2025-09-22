export type ProfileCardData = {
  id: string;
  name: string;
  email: string;
  cohort_number?: string;
  avatar_url?: string;
  bio?: string;
  skills?: string[];
  background?: string;
  years_of_experience?: number;
  location?: string;
  twitter_url?: string;
  linkedin_url?: string;
};

export const dummyProfiles: ProfileCardData[] = [
  {
    id: "profile-1",
    name: "Alice Smith",
    email: "alice.smith@example.com",
    cohort_number: "Fall 2023",
    avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=Alice",
    bio: "Passionate full-stack developer with expertise in React and Node.js.",
    skills: ["React", "Node.js", "JavaScript", "TypeScript", "SQL"],
    background: "Industry Professional",
    years_of_experience: 5,
    location: "San Francisco, CA",
    linkedin_url: "https://linkedin.com/in/alicesmith",
  },
  {
    id: "profile-2",
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    cohort_number: "Spring 2024",
    avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=Bob",
    bio: "Frontend enthusiast with a keen eye for UI/UX design.",
    skills: ["Vue.js", "HTML", "CSS", "JavaScript", "Figma"],
    background: "Student",
    location: "New York, NY",
    twitter_url: "https://twitter.com/bobj",
  },
  {
    id: "profile-3",
    name: "Charlie Brown",
    email: "charlie.brown@example.com",
    cohort_number: "Fall 2023",
    avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=Charlie",
    bio: "Backend engineer specializing in scalable microservices and cloud infrastructure.",
    skills: ["Python", "Django", "AWS", "Docker", "Kubernetes"],
    background: "Industry Professional",
    years_of_experience: 8,
    location: "Seattle, WA",
    twitter_url: "https://twitter.com/charlieb",
  },
  {
    id: "profile-4",
    name: "Diana Prince",
    email: "diana.prince@example.com",
    cohort_number: "Spring 2024",
    avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=Diana",
    bio: "Data scientist passionate about machine learning and data visualization.",
    skills: ["Python", "R", "Machine Learning", "Data Analysis", "Tableau"],
    background: "Industry Professional",
    years_of_experience: 3,
    location: "Austin, TX",
    linkedin_url: "https://linkedin.com/in/dianap",
  },
];