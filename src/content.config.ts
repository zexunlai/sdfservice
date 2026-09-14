import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const editorial = z.object({
  title: z.string(),
  description: z.string(),
  publicationDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  area: z.enum(['Sustainability & Climate Change','Geospatial Intelligence','Biodiversity & Nature','Circular Economy','Carbon Markets & Methodologies']),
  subtopic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  author: z.string().default('Ze-Xun Lai'),
  image: z.string().optional()
});

const insights = defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/insights' }), schema: editorial });
const supporting = z.object({ title:z.string(), description:z.string(), date:z.coerce.date().optional(), updated:z.coerce.date().optional(), category:z.string(), tags:z.array(z.string()).default([]), featured:z.boolean().default(false), draft:z.boolean().default(false), author:z.string().default('Ze-Xun Lai'), image:z.string().optional() });
const research = defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }), schema: supporting });
const projects = defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }), schema: supporting.extend({ status:z.string().default('Ongoing') }) });
const library = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/library' }),
  schema: z.object({
    title:z.string(), area:z.enum(['Sustainability & Climate Change','Geospatial Intelligence','Biodiversity & Nature','Circular Economy','Carbon Markets & Methodologies']),
    entryType:z.enum(['Methodology','Framework','Standard','Analytical Method','Guidance','Tool']), organisation:z.string().optional(), identifier:z.string().optional(), version:z.string().optional(),
    publicationDate:z.coerce.date().optional(), lastReviewed:z.coerce.date(), summary:z.string(), applicability:z.string(), keyConcepts:z.array(z.string()).default([]), keyRequirements:z.array(z.string()).default([]), strengths:z.array(z.string()).default([]), limitations:z.array(z.string()).default([]), officialSource:z.url().optional(), relatedArticles:z.array(z.string()).default([]), draft:z.boolean().default(false),
    baseline:z.string().optional(), additionality:z.string().optional(), mrv:z.string().optional(), leakage:z.string().optional(), permanence:z.string().optional(), creditingPeriod:z.string().optional(), validation:z.string().optional(), verification:z.string().optional()
  })
});

export const collections = { insights, library, research, projects };
