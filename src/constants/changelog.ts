export type ChangelogEntry = {
  id: string;
  version: string;
  date: string;
  title: string;
  summary?: string;
  changes: string[];
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
    {
    id: '0.16-2025-12-26',
    version: '0.16.1',
    date: '2025-12-26',
    title: 'dev build 0.16.1 with a few changes',
    summary: 'code refactoring and images in chat messages',
    changes: [
      "minor bug fixes",
    ],
  },
  {
    id: '0.16.1-2025-12-26',
    version: '0.16',
    date: '2025-12-26',
    title: 'dev build 0.16 with chat images',
    summary: 'code refactoring and images in chat messages',
    changes: [
      "code refactoring and cleanup",
      "added images to chat messages",
    ],
  },
  {
    id: '0.15-2025-12-21',
    version: '0.15',
    date: '2025-12-21',
    title: 'Biometric unlock & DM improvements',
    summary: 'Suggests fingerprint unlock automatically if you already have a wallet. Direct messages and profile viewing are smoother.',
    changes: [
      'Automatic fingerprint/biometric unlock prompt when wallet is locked and device supports it.',
      'Direct message (DM) system now persists channels and messages locally.',
      'ViewProfile modal for user avatars in chat.',
      'Anonymous authentication fallback for Supabase sign-in.',
      'UI polish and bug fixes.',
      'Made DM work',
      'made user headbaes'
    ],
  },
  {
    id: '0.14-2025-12-22',
    version: '0.14',
    date: '2025-12-22',
    title: 'UI polish and chat improvements',
    summary: 'Made the design way sexier with smooth animations and better keyboard handling.',
    changes: [
      'Added smooth spring animations when opening keyboard in chat.',
      'Input bar now glows and scales subtly when focused.',
      'Fixed keyboard overlapping the message input on Android.',
      'Extracted bottom navigation into its own component.',
      'Fixed PIN screen appearing when switching tabs.',
    ],
  },
  {
    id: '0.13-2025-12-21',
    version: '0.13',
    date: '2025-12-21',
    title: 'Solana devnet wallet flow',
    summary: 'Wallet creation and sending now run on Solana devnet with passcode-encrypted keys.',
    changes: [
      'Added Solana devnet as the active chain with a network badge.',
      'Wallet keys are encrypted with passcode for Solana, including recovery phrase storage.',
      'SOL balances and sends use the Solana RPC connection.',
      'Kept Ethereum configuration for future multi-chain support.',
    ],
  },
  {
    id: '0.12-2025-12-20',
    version: '0.12',
    date: '2025-12-20',
    title: 'Changelog and auth feedback',
    summary: 'In-app changelog plus clearer account and profile sync feedback.',
    changes: [
      'Added a changelog screen under Profile.',
      'Show account created alerts and clearer auth errors.',
      'Chat thread header now shows live participant counts.',
      'Profile sync surfaces Supabase setup issues with readable errors.',
    ],
  },
  {
    id: '0.11-2025-12-20',
    version: '0.11',
    date: '2025-12-20',
    title: 'Chat presence and profiles',
    summary: 'Chat now resolves names and avatars from profiles and shows live room counts.',
    changes: [
      'Messages include stable author ids for profile lookups.',
      'Chat bubbles show nicknames and avatars for other users.',
      'Thread header shows live participant count.',
      'Anonymous profiles can be saved for global visibility.',
    ],
  },
  {
    id: '0.10-2025-12-10',
    version: '0.10',
    date: '2025-12-10',
    title: 'Profile and rewards updates',
    summary: 'Expanded profile settings and rewards tracking.',
    changes: [
      'Profile personalization flow updated.',
      'Rewards summary and activity tabs added.',
      'Security flow for wallet key management improved.',
    ],
  },
];
