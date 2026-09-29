import { z } from 'zod';
import { DSA_TOPICS } from '../models/DSAProblem.js';
import { INTERVIEW_ROUNDS } from '../models/Interview.js';

export const profileUpdateSchema = z.object({
  headline: z.string().trim().max(160).optional(),
  graduationYear: z.number().int().min(2000).max(2100).optional().nullable(),
  education: z.array(z.object({
    degree: z.string().trim().min(1),
    field: z.string().trim().optional(),
    institution: z.string().trim().optional(),
    startYear: z.number().int().optional().nullable(),
    endYear: z.number().int().optional().nullable(),
    cgpa: z.number().min(0).max(10).optional().nullable(),
  })).optional(),
  targetRoles: z.array(z.string().trim().min(1).max(80)).max(5).optional(),
  programmingLanguages: z.array(z.object({
    name: z.string().trim().min(1).max(50),
    proficiency: z.number().int().min(1).max(5).optional(),
  })).optional(),
  frameworks: z.array(z.object({
    name: z.string().trim().min(1).max(50),
    proficiency: z.number().int().min(1).max(5).optional(),
  })).optional(),
  databases: z.array(z.object({
    name: z.string().trim().min(1).max(50),
    proficiency: z.number().int().min(1).max(5).optional(),
  })).optional(),
  tools: z.array(z.string().trim().min(1).max(50)).optional(),
  projects: z.array(z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    techStack: z.array(z.string().trim().max(50)).optional(),
    link: z.string().trim().max(300).optional(),
  })).optional(),
  certifications: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    issuer: z.string().trim().max(200).optional(),
    year: z.number().int().optional().nullable(),
  })).optional(),
  links: z.object({
    github: z.string().trim().max(300).optional().or(z.literal('')),
    linkedin: z.string().trim().max(300).optional().or(z.literal('')),
    portfolio: z.string().trim().max(300).optional().or(z.literal('')),
  }).optional(),
});

export const jobCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  company: z.string().trim().max(200).optional().or(z.literal('')),
  role: z.string().trim().max(120).optional().or(z.literal('')),
  location: z.string().trim().max(120).optional().or(z.literal('')),
  type: z.enum(['internship', 'full-time', 'placement', 'other']).optional(),
  description: z.string().trim().min(50, 'Paste the full job description (at least 50 characters)'),
  requiredSkills: z.array(z.string().trim().min(1).max(50)).optional(),
  niceToHaveSkills: z.array(z.string().trim().min(1).max(50)).optional(),
  minSalary: z.number().min(0).optional().nullable(),
  maxSalary: z.number().min(0).optional().nullable(),
  experienceLevel: z.enum(['fresher', 'intern', 'junior', 'mid', 'any']).optional(),
});

export const jobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  type: z.enum(['internship', 'full-time', 'placement', 'other']).optional(),
  role: z.string().trim().max(120).optional(),
  skill: z.string().trim().max(50).optional(),
  experienceLevel: z.enum(['fresher', 'intern', 'junior', 'mid', 'any']).optional(),
  sortBy: z.enum(['posted', 'title']).optional(),
  mine: z.enum(['true', 'false']).optional(),
});

export const dsaProblemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  platform: z.enum(['leetcode', 'geeksforgeeks', 'codeforces', 'hackerrank', 'other']).optional(),
  url: z.string().trim().max(500).optional().or(z.literal('')),
  topic: z.enum(DSA_TOPICS),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  status: z.enum(['solved', 'attempted', 'revisit']).optional(),
  attempts: z.number().int().min(1).max(50).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  solvedAt: z.coerce.date().optional(),
});

export const dsaProblemUpdateSchema = dsaProblemSchema.partial();

export const dsaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  topic: z.enum(DSA_TOPICS).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  status: z.enum(['solved', 'attempted', 'revisit']).optional(),
  platform: z.enum(['leetcode', 'geeksforgeeks', 'codeforces', 'hackerrank', 'other']).optional(),
});

export const taskUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']),
});

export const roadmapRequestSchema = z.object({
  jobId: z.string().trim().optional().nullable(),
  weeksAvailable: z.number().int().min(1).max(24).optional(),
});

export const skillGapRequestSchema = z.object({
  jobId: z.string().trim().min(1),
});

export const interviewCreateSchema = z.object({
  targetRole: z.string().trim().min(2).max(120),
  rounds: z.array(z.enum(INTERVIEW_ROUNDS)).min(1).max(INTERVIEW_ROUNDS.length),
  settings: z.object({
    maxQuestionsPerRound: z.number().int().min(1).max(8).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
    allowFollowUps: z.boolean().optional(),
  }).optional(),
});

export const explainTopicSchema = z.object({
  topic: z.string().trim().min(2).max(120),
});

export const idParamSchema = z.object({
  id: z.string().trim().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});
