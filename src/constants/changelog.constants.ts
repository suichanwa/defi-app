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
    id: '0.23-2026-04-27',
    version: '0.23',
    date: '2026-04-27',
    title: 'Secure chat delete, reply, and avatar polish',
    summary: 'Added local chat deletion, message replies, and cleaner avatar rendering across private and global chat.',
    changes: [
      'Added local delete chat support for private XMTP conversations with confirmation.',
      'Added local delete-for-me support for individual XMTP messages.',
      'Added reply previews in the composer and quoted reply blocks in chat bubbles.',
      'Fixed avatar rendering for private XMTP chats and global chat with stronger fallbacks.',
      'Improved secure chat settings, message actions, and bottom sheet polish.',
      'Added a release build wrapper for the production Android build flow.',
    ],
  },
  {
    id: '0.22-2026-04-27',
    version: '0.22',
    date: '2026-04-27',
    title: 'XMTP wallet messaging and chat UI rework',
    summary: 'Added XMTP direct messaging through Ethereum wallets and refreshed the secure chat experience.',
    changes: [
      'Added XMTP direct message integration through Ethereum wallet connections.',
      'Reworked secure chat settings, profile viewing, and thread navigation.',
      'Updated chat UI with a cleaner bottom sheet settings flow and full-screen profile view.',
      'Added native Android notifications for incoming secure chat and connection messages.',
    ],
  },
  {
    id: '0.20-2026-04-20',
    version: '0.20',
    date: '2026-04-20',
    title: 'Compact chat header and cleanup',
    summary: 'New chat header layout, cleaner message bubbles, and Rust wallet core consolidation.',
    changes: [
      'Added a compact chat header with title, participant count, and settings menu.',
      'Restored cleaner incoming chat bubble styling for better readability.',
      'Moved the Rust wallet core into the rust-api package.',
    ],
  },
  {
    id: '0.19-2026-1-9',
    version: '0.19.2',
    date: '2026-1-9',
    title: 'dev build 0.19.2 ',
    summary: 'wallet work',
    changes: [
      "all wallet funcitons are now working",
      "improved UI",
      "minor bug fixes",
    ],
  },
  {
    id: '0.19-2026-1-8',
    version: '0.19.1',
    date: '2026-1-8',
    title: 'dev build 0.19.1',
    summary: 'NFTs and wallet updates',
    changes: [
      'NFTs and wallet updates',
    ],
  },
  {
    id: '0.18-2026-1-6',
    version: '0.18.0',
    date: '2026-1-6',
    title: 'dev build 0.18 with wallet send/receive',
    summary: 'work on wallet',
    changes: [
      "Add send recieve functionality to the wallet",
    ],
  },
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
