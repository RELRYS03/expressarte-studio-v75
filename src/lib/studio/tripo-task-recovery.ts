/** Estado de tarefas Tripo API v3; jamais armazenar tokens ou cookies do Studio. */
export const LAST_TRIPO_TASK_KEY = "expressarte:tripo:v3:last-task-id";

export function normalizeTripoTaskId(input: string): string | null {
  const id = input.trim();
  return /^task_[\w-]{3,120}$/.test(id) ? id : null;
}
