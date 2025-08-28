import { z } from "zod";

export const ErrorDtoSchema = z.object({
  message: z.string().optional(),
});
export type ErrorDto = z.infer<typeof ErrorDtoSchema>;
