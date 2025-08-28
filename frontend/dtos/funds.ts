import { z } from "zod";

// Server DTOs
export const FundDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  minAmount: z.number(),
  category: z.string().optional(),
});
export type FundDto = z.infer<typeof FundDtoSchema>;

export const FundsListSchema = z.array(FundDtoSchema);

export type SubscribeRequestDto = {
  fundId: string;
  notifyChannel: "email" | "sms";
  notifyDestination: string;
};

export type CancelRequestDto = {
  fundId: string;
};

// Balance comes as a number; keep an alias for clarity
export type BalanceDto = number;
