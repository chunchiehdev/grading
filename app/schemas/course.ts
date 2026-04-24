import { z } from 'zod';

export const ClassScheduleSchema = z.object({
  weekday: z.string(),
  periodCode: z.string(),
  room: z.string().default(''),
});

export type ClassSchedule = z.infer<typeof ClassScheduleSchema>;

const EMPTY_CLASS_SCHEDULE: ClassSchedule = {
  weekday: '',
  periodCode: '',
  room: '',
};

export function parseClassSchedule(schedule: unknown): ClassSchedule {
  const parsed = ClassScheduleSchema.safeParse(schedule);
  if (!parsed.success) {
    return EMPTY_CLASS_SCHEDULE;
  }

  return parsed.data;
}
 