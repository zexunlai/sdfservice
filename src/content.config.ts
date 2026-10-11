import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const library = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/library' }),
  schema: z.object({
    title:z.string(), area:z.enum(['Sustainability & Climate Change','Geospatial Intelligence','Biodiversity & Nature','Circular Economy','Carbon Markets & Methodologies']),
    entryType:z.enum(['Methodology','Framework','Standard','Analytical Method','Guidance','Tool']), organisation:z.string().optional(), identifier:z.string().optional(), version:z.string().optional(),
    publicationDate:z.coerce.date().optional(), lastReviewed:z.coerce.date(), summary:z.string(), applicability:z.string(), keyConcepts:z.array(z.string()).default([]), keyRequirements:z.array(z.string()).default([]), strengths:z.array(z.string()).default([]), limitations:z.array(z.string()).default([]), officialSource:z.string().url().optional(), relatedArticles:z.array(z.string()).default([]), draft:z.boolean().default(false),
    baseline:z.string().optional(), additionality:z.string().optional(), mrv:z.string().optional(), leakage:z.string().optional(), permanence:z.string().optional(), creditingPeriod:z.string().optional(), validation:z.string().optional(), verification:z.string().optional()
  })
});

export const collections = { library };
