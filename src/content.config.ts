import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const editorial = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date().optional(),
  updated: z.coerce.date().optional(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  author: z.string().default('Zexun Lai'),
  image: z.string().optional()
});

const insights = defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/insights' }), schema: editorial });
const research = defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }), schema: editorial });
const projects = defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }), schema: editorial.extend({ status: z.string().default('Ongoing') }) });
const methodologies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/methodologies' }),
  schema: z.object({
    title: z.string(), description: z.string(), methodologyId: z.string(), registry: z.string(), version: z.string(),
    sector: z.string(), projectType: z.string(), status: z.string(), publicationDate: z.coerce.date().optional(),
    applicableGeography: z.string(), baseline: z.string(), additionality: z.string(), mrv: z.string(),
    leakage: z.string(), permanence: z.string(), creditingPeriod: z.string(), dataRequirements: z.array(z.string()),
    strengths: z.array(z.string()), limitations: z.array(z.string()), officialSource: z.url().optional(),
    lastReviewed: z.coerce.date().optional(), draft: z.boolean().default(false), image: z.string().optional()
  })
});

export const collections = { insights, methodologies, research, projects };
