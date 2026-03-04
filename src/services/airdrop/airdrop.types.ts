export type SolAirdropRequest = {
  address: string;
  amountSol: number;
  commitment?: 'confirmed' | 'finalized';
};

export type SolAirdropResult = {
  signature: string;
};
