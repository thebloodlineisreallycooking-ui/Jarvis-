import { z } from 'zod';
export const modeSchema = z.enum(['live', 'demo']);
export type Mode = z.infer<typeof modeSchema>;
export const credentialsSchema = z.object({ username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/), password: z.string().min(10).max(128) });
export const commandSchema = z.object({ text: z.string().trim().min(1).max(300), mode: modeSchema });
export type Task = { id: number; title: string; status: 'open'; createdAt: string; mode: Mode };
export type Message = { id: string; role: 'user' | 'assistant'; text: string; createdAt: string; mode: Mode };
export type CommandResponse = { task: Task; messages: Message[]; persisted: boolean };
