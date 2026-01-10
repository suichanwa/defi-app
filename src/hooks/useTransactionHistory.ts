import { useCallback, useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL, PublicKey, type ParsedTransactionWithMeta } from '@solana/web3.js';
import { getActiveChain } from '@config/chain';
import { getSolanaConnection } from '@services/solanaProvider';
import { rpcErrorMessage } from '@utils/walletErrors';

export type TransactionHistoryItem = {
  signature: string;
  amount: number | null;
  counterparty: string | null;
  direction: 'sent' | 'received' | 'unknown';
  status: 'confirmed' | 'failed';
  timestamp: string | null;
};

type TransactionHistoryStatus = {
  loading: boolean;
  error: string | null;
  message: string | null;
};

type TransactionHistoryArgs = {
  address?: string | null;
  limit?: number;
};

const formatTimestamp = (blockTime?: number | null) => {
  if (!blockTime) return null;
  return new Date(blockTime * 1000).toLocaleString();
};

const extractTransfer = (
  parsed: ParsedTransactionWithMeta | null,
  address: string,
): { amount: number | null; counterparty: string | null; direction: TransactionHistoryItem['direction'] } => {
  if (!parsed) {
    return { amount: null, counterparty: null, direction: 'unknown' };
  }

  const instructions = parsed.transaction.message.instructions;
  for (const instruction of instructions) {
    if ('parsed' in instruction && instruction.program === 'system') {
      const parsedInfo = instruction.parsed;
      if (parsedInfo?.type === 'transfer') {
        const info = parsedInfo.info as { source: string; destination: string; lamports: number };
        if (!info?.source || !info?.destination || typeof info.lamports !== 'number') {
          continue;
        }
        if (info.source === address) {
          return {
            amount: info.lamports / LAMPORTS_PER_SOL,
            counterparty: info.destination,
            direction: 'sent',
          };
        }
        if (info.destination === address) {
          return {
            amount: info.lamports / LAMPORTS_PER_SOL,
            counterparty: info.source,
            direction: 'received',
          };
        }
      }
    }
  }

  return { amount: null, counterparty: null, direction: 'unknown' };
};

export function useTransactionHistory({ address, limit = 20 }: TransactionHistoryArgs) {
  const [items, setItems] = useState<TransactionHistoryItem[]>([]);
  const [status, setStatus] = useState<TransactionHistoryStatus>({
    loading: false,
    error: null,
    message: null,
  });

  const load = useCallback(async () => {
    if (!address) {
      setItems([]);
      setStatus({ loading: false, error: 'No wallet address available.', message: null });
      return;
    }

    const chain = getActiveChain();
    if (chain.kind !== 'solana') {
      setItems([]);
      setStatus({ loading: false, error: 'Transaction history is only available for Solana wallets.', message: null });
      return;
    }

    setStatus({ loading: true, error: null, message: null });

    try {
      const connection = getSolanaConnection();
      const signatures = await connection.getSignaturesForAddress(new PublicKey(address), { limit });
      const parsedResults = await Promise.all(
        signatures.map((entry) =>
          connection.getParsedTransaction(entry.signature, { maxSupportedTransactionVersion: 0 }),
        ),
      );

      const nextItems = signatures.map((entry, index) => {
        const parsed = parsedResults[index];
        const transfer = extractTransfer(parsed, address);
        return {
          signature: entry.signature,
          amount: transfer.amount,
          counterparty: transfer.counterparty,
          direction: transfer.direction,
          status: parsed?.meta?.err ? 'failed' : 'confirmed',
          timestamp: formatTimestamp(entry.blockTime),
        } as TransactionHistoryItem;
      });

      setItems(nextItems);
      setStatus({
        loading: false,
        error: null,
        message: nextItems.length ? `Loaded ${nextItems.length} transactions.` : 'No transactions yet.',
      });
    } catch (error) {
      const message = rpcErrorMessage(error) ?? 'Unable to load transaction history.';
      setItems([]);
      setStatus({ loading: false, error: message, message: null });
    }
  }, [address, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, status, refresh: load };
}
