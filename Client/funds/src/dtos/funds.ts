export type FundDto = { id: string; name: string; minAmount: number; category?: string };
export type BalanceDto = number;
export type TransactionDto = {
	id: string;
	type: 'Subscribe' | 'Cancel';
	fundId: string;
	amount: number;
	timestampUtc: string;
};
