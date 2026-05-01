/**
 * Seed data for default agent templates and room templates.
 * Run this script to populate the database with initial templates.
 */

import { randomUUID } from 'crypto';
import { getDb } from './index.js';

export interface AgentTemplateSeed {
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
}

export interface RoomTemplateSeed {
  name: string;
  description: string;
  configJson: string;
  agentConfigsJson: string;
  isDefault: boolean;
}

export const defaultAgentTemplates: AgentTemplateSeed[] = [
  {
    name: 'Helpful Assistant',
    description: 'A general purpose assistant that is helpful, harmless, and honest.',
    systemPrompt: 'You are a helpful, harmless, and honest AI assistant. Your goal is to provide accurate, useful, and safe information to users. Be concise, friendly, and professional in your responses.',
    model: 'gpt-4',
    temperature: 70,
    maxTokens: 1024,
    isDefault: true,
  },
  {
    name: 'Creative Writer',
    description: 'A creative writing assistant specialized in storytelling and imaginative content.',
    systemPrompt: 'You are a creative writing assistant with a vivid imagination. Your goal is to help users craft compelling stories, poems, and creative content. Use descriptive language, explore different narrative styles, and encourage creative thinking.',
    model: 'gpt-4',
    temperature: 85,
    maxTokens: 2048,
    isDefault: true,
  },
  {
    name: 'Code Reviewer',
    description: 'A technical assistant specialized in code analysis and suggestions.',
    systemPrompt: 'You are an experienced software engineer specializing in code review. Your goal is to analyze code for correctness, efficiency, security, and maintainability. Provide constructive feedback, suggest improvements, and explain your reasoning clearly.',
    model: 'gpt-4',
    temperature: 50,
    maxTokens: 2048,
    isDefault: true,
  },
  {
    name: 'Debate Partner',
    description: 'An argumentative discussion partner for exploring different viewpoints.',
    systemPrompt: 'You are a debate partner who challenges ideas constructively. Your goal is to explore different perspectives, ask probing questions, and encourage critical thinking. Be respectful but thorough in examining arguments and counterarguments.',
    model: 'gpt-4',
    temperature: 65,
    maxTokens: 1536,
    isDefault: true,
  },
];

export const defaultRoomTemplates: RoomTemplateSeed[] = [
  {
    name: 'Brainstorming Session',
    description: 'Multiple creative agents working together to generate ideas.',
    configJson: JSON.stringify({
      turnDelayMs: 3000,
      maxContextMessages: 100,
    }),
    agentConfigsJson: JSON.stringify([
      { templateName: 'Creative Writer', count: 2 },
      { templateName: 'Helpful Assistant', count: 1 },
    ]),
    isDefault: true,
  },
  {
    name: 'Debate Club',
    description: 'Two opposing agents plus a moderator for structured debates.',
    configJson: JSON.stringify({
      turnDelayMs: 5000,
      maxContextMessages: 150,
    }),
    agentConfigsJson: JSON.stringify([
      { templateName: 'Debate Partner', count: 2 },
      { templateName: 'Helpful Assistant', count: 1 },
    ]),
    isDefault: true,
  },
  {
    name: 'Code Review',
    description: 'Technical review agents for code analysis.',
    configJson: JSON.stringify({
      turnDelayMs: 4000,
      maxContextMessages: 200,
    }),
    agentConfigsJson: JSON.stringify([
      { templateName: 'Code Reviewer', count: 2 },
      { templateName: 'Helpful Assistant', count: 1 },
    ]),
    isDefault: true,
  },
  {
    name: 'Role Play',
    description: 'Character-based agents for interactive scenarios.',
    configJson: JSON.stringify({
      turnDelayMs: 3000,
      maxContextMessages: 100,
    }),
    agentConfigsJson: JSON.stringify([
      { templateName: 'Creative Writer', count: 2 },
      { templateName: 'Helpful Assistant', count: 1 },
    ]),
    isDefault: true,
  },
];

export async function seedAgentTemplates(): Promise<void> {
  const client = await getDb();
  
  for (const template of defaultAgentTemplates) {
    const id = randomUUID();
    const now = new Date();
    
    // Check if template already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.agentTemplates)
      .where((client.schema.agentTemplates as any).name.eq(template.name));
    
    if (existing.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any).insert(client.schema.agentTemplates).values({
        id,
        name: template.name,
        description: template.description,
        systemPrompt: template.systemPrompt,
        model: template.model,
        temperature: template.temperature,
        maxTokens: template.maxTokens,
        isDefault: template.isDefault ? 1 : 0,
        createdAt: client.dialect === 'sqlite' ? now.toISOString() : now,
      });
      console.log(`Seeded agent template: ${template.name}`);
    }
  }
}

export async function seedRoomTemplates(): Promise<void> {
  const client = await getDb();
  
  for (const template of defaultRoomTemplates) {
    const id = randomUUID();
    const now = new Date();
    
    // Check if template already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing: unknown[] = await (client.db as any)
      .select()
      .from(client.schema.roomTemplates)
      .where((client.schema.roomTemplates as any).name.eq(template.name));
    
    if (existing.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.db as any).insert(client.schema.roomTemplates).values({
        id,
        name: template.name,
        description: template.description,
        configJson: template.configJson,
        agentConfigsJson: template.agentConfigsJson,
        isDefault: template.isDefault ? 1 : 0,
        createdAt: client.dialect === 'sqlite' ? now.toISOString() : now,
      });
      console.log(`Seeded room template: ${template.name}`);
    }
  }
}

export async function seed(): Promise<void> {
  console.log('Starting seed...');
  await seedAgentTemplates();
  await seedRoomTemplates();
  console.log('Seed completed.');
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch(console.error);
}
