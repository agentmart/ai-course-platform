import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const taskSchema = z.object({
  title: z.string(),
  description: z.string(),
  time: z.number().int().min(5).max(60),
});

const codeExampleSchema = z.object({
  title: z.string(),
  lang: z.enum(['python', 'js']),
  code: z.string(),
});

const interviewSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const resourceSchema = z.object({
  type: z.enum([
    'DOCS',
    'BLOG',
    'PRICING',
    'PAPER',
    'TOOL',
    'CAREERS',
    'COMMUNITY',
    'GITHUB',
    'HUB',
    'RESEARCH',
    'SPEC',
  ]),
  title: z.string(),
  url: z.string().url(),
  note: z.string().optional(),
});

export const days = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/days' }),
  schema: z.object({
    day: z.number().int().min(1).max(60),
    subtitle: z.string().max(200),
    tasks: z.array(taskSchema).min(1).max(8),
    codeExample: codeExampleSchema,
    interview: interviewSchema,
    pmAngle: z.string(),
    context: z.string(),
    resources: z.array(resourceSchema).min(3),
    track: z.enum(['full', 'sprint']).default('full'),
    sprintWeek: z.number().int().min(1).max(4).optional(),
  }),
});

export const collections = { days };
