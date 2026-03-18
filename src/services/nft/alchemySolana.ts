import { ALCHEMY_API_KEY } from '@env';

export type AlchemySolanaNft = {
  id: string;
  name: string;
  collection: string;
  imageUrl: string | null;
};

type AlchemySolanaResponse = {
  nfts?: any[];
  ownedNfts?: any[];
};

type AlchemyEndpointResult = {
  items: any[];
  status: number;
};

const getAlchemyBaseUrl = (cluster: 'devnet' | 'mainnet-beta') => {
  const network = cluster === 'devnet' ? 'solana-devnet' : 'solana-mainnet';
  return `https://${network}.g.alchemy.com/nft/v2/${ALCHEMY_API_KEY}`;
};

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
};

const extractImageUrl = (item: any): string | null => {
  return (
    item?.image?.cachedUrl ||
    item?.image?.originalUrl ||
    item?.image?.pngUrl ||
    item?.media?.[0]?.gateway ||
    item?.media?.[0]?.raw ||
    item?.metadata?.image ||
    null
  );
};

export async function fetchAlchemySolanaNfts(
  owner: string,
  cluster: 'devnet' | 'mainnet-beta',
): Promise<AlchemySolanaNft[]> {
  if (!ALCHEMY_API_KEY) {
    throw new Error('Alchemy API key is missing.');
  }
  const baseUrl = getAlchemyBaseUrl(cluster);
  const requestEndpoint = async (endpoint: string): Promise<AlchemyEndpointResult> => {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return { items: [], status: response.status };
    }
    const data = (await response.json()) as AlchemySolanaResponse;
    return { items: data.nfts ?? data.ownedNfts ?? [], status: response.status };
  };

  const ownerQuery = encodeURIComponent(owner);
  const preferred = await requestEndpoint(
    `${baseUrl}/getNFTsForOwner?owner=${ownerQuery}&withMetadata=true`,
  );
  const fallback = preferred.items.length
    ? preferred
    : await requestEndpoint(`${baseUrl}/getNFTs?owner=${ownerQuery}&withMetadata=true`);

  if (!preferred.items.length && !fallback.items.length && fallback.status >= 400) {
    throw new Error(`Alchemy NFT API failed with status ${fallback.status}.`);
  }

  const items = preferred.items.length ? preferred.items : fallback.items;
  return items.map((item, index) => ({
    id: item?.id?.tokenId || item?.mint?.address || item?.mint || item?.id || `${index}`,
    name: normalizeText(item?.name ?? item?.title ?? item?.metadata?.name, 'Untitled NFT'),
    collection: normalizeText(item?.collection?.name ?? item?.collectionName ?? item?.symbol, 'Collection'),
    imageUrl: extractImageUrl(item),
  }));
}
