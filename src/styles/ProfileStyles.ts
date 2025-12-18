import { StyleSheet } from 'react-native';

export const profileStyles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  titleBlock: {
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#64748b',
  },
  input: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  avatarRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identiconGrid: {
    width: 54,
    height: 54,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  identiconCell: {
    width: 10,
    height: 10,
    margin: 1,
    borderRadius: 2,
  },
  avatarOptions: {
    marginLeft: 16,
    flex: 1,
  },
  optionRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginTop: 8,
    backgroundColor: '#f8fafc',
  },
  optionButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  optionText: {
    fontWeight: '600',
    color: '#475569',
  },
  optionTextActive: {
    fontWeight: '600',
    color: '#ffffff',
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: '#0f172a',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 8,
  },
  successText: {
    color: '#16a34a',
    marginBottom: 8,
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    color: '#94a3b8',
  },
  pointsValue: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  listItem: {
    marginTop: 8,
    color: '#1f2937',
  },
  activityRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    paddingRight: 12,
  },
  activityTitle: {
    fontWeight: '600',
    color: '#0f172a',
  },
  pointsDelta: {
    fontWeight: '700',
    color: '#16a34a',
  },
});
