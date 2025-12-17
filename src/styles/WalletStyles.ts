import { Platform, StyleSheet } from 'react-native';

const cardShadow = Platform.select({
  web: {
    boxShadow: '0px 4px 12px rgba(17, 24, 39, 0.16)',
  },
  default: {
    shadowColor: '#111827',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

export const walletStyles = StyleSheet.create({
  errorText: {
    color: '#b91c1c',
    marginTop: 8,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaText: {
    color: '#6b7280',
    fontSize: 13,
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  deviceCutout: {
    alignSelf: 'center',
    height: 36,
    width: 160,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    marginTop: 12,
    marginBottom: 16,
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideAccentLeft: {
    width: 18,
    height: 160,
    backgroundColor: '#22c55e',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 8,
  },
  sideAccentRight: {
    width: 18,
    height: 160,
    backgroundColor: '#f59e0b',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginLeft: 8,
  },
  walletCard: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 18,
    padding: 18,
    ...(cardShadow ?? {}),
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pill: {
    backgroundColor: '#3b32d2',
    color: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  walletTitle: {
    color: '#e0e7ff',
    fontSize: 14,
  },
  balance: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 6,
  },
  actionLabel: {
    color: '#e0e7ff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  searchIcon: {
    marginLeft: 8,
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
  tabBase: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4f46e5',
  },
  tabInactive: {
    backgroundColor: '#e5e7eb',
  },
  tabSpacing: {
    marginRight: 12,
  },
  tabActiveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tabInactiveText: {
    color: '#1f2937',
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 12,
    marginTop: 16,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tokenRowSpacing: {
    marginBottom: 10,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  tokenInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tokenName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  tokenSymbol: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  tokenAmounts: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  tokenValue: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
});
