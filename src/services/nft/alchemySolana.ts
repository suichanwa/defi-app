import { ALCHEMY_API_KEY } from '@env';

export type AlchemySolanaNft = {
  id: string;
  name: string;
  collection: string;
  imageUrl: string | null;
};

type DasAsset = {
  id?: string;
  grouping?: Array<{ group_key?: string; group_value?: string }>;
  content?: {
    metadata?: {
      name?: string;
      symbol?: string;
      collection?: { name?: string };
    };
    links?: { image?: string };
    files?: Array<{ uri?: string; cdn_uri?: string }>;
  };
};

type DasResponse = {
  error?: { code?: number; message?: string };
  result?: {
    items?: DasAsset[];
  };
};

const TRANSIENT_DAS_ERROR_CODE = -32001;
const DAS_RETRY_DELAYS_MS = [250, 600, 1200] as const;

const getAlchemyNetwork = (cluster: 'devnet' | 'mainnet-beta') =>
  cluster === 'devnet' ? 'solana-devnet' : 'solana-mainnet';

const getAlchemyRpcUrl = (cluster: 'devnet' | 'mainnet-beta') =>
  `https://${getAlchemyNetwork(cluster)}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
};

const extractCollection = (asset: DasAsset): string => {
  const groupedCollection = asset.grouping?.find((entry) => entry.group_key === 'collection')?.group_value;
  return normalizeText(
    asset.content?.metadata?.collection?.name ?? groupedCollection ?? asset.content?.metadata?.symbol,
    'Collection',
  );
};

const extractImageUrl = (asset: DasAsset): string | null => {
  return (
    asset.content?.links?.image ??
    asset.content?.files?.[0]?.cdn_uri ??
    asset.content?.files?.[0]?.uri ??
    null
  );
};

const parseStatusMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as DasResponse;
    const details = payload.error?.message;
    if (details) return details;
  } catch {
    // Ignore body parsing errors and return generic status text.
  }
  return `status ${response.status}`;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAlchemySolanaNfts(
  owner: string,
  cluster: 'devnet' | 'mainnet-beta',
): Promise<AlchemySolanaNft[]> {
  if (!ALCHEMY_API_KEY) {
    throw new Error('Alchemy API key is missing.');
  }

  let payload: DasResponse | null = null;
  for (let attempt = 0; attempt <= DAS_RETRY_DELAYS_MS.length; attempt += 1) {
    const response = await fetch(getAlchemyRpcUrl(cluster), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: owner,
          page: 1,
          // Slightly smaller page can reduce backend load failures for hot wallets.
          limit: 50,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Alchemy NFT API access denied (403). Use a valid NFT-enabled ALCHEMY_API_KEY.');
      }
      const details = await parseStatusMessage(response);
      throw new Error(`Alchemy Solana NFT request failed (${response.status}): ${details}`);
    }

    payload = (await response.json()) as DasResponse;
    if (!payload.error) {
      break;
    }

    if (
      payload.error.code === TRANSIENT_DAS_ERROR_CODE &&
      attempt < DAS_RETRY_DELAYS_MS.length
    ) {
      await wait(DAS_RETRY_DELAYS_MS[attempt]);
      continue;
    }

    if (payload.error.code === TRANSIENT_DAS_ERROR_CODE) {
      throw new Error('Alchemy NFT API is temporarily unavailable. Please try again in a moment.');
    }

    const message = payload.error.message ?? 'Unknown DAS API error.';
    throw new Error(`Alchemy Solana NFT request failed: ${message}`);
  }

  if (!payload) {
    throw new Error('Alchemy Solana NFT API returned no payload.');
  }

  const items = payload.result?.items ?? [];
  return items.map((asset, index) => ({
    id: asset.id ?? `${index}`,
    name: normalizeText(asset.content?.metadata?.name, 'Untitled NFT'),
    collection: extractCollection(asset),
    imageUrl: extractImageUrl(asset),
  }));
}
