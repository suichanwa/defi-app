import { StyleSheet } from 'react-native';

export const secureChatStyles = StyleSheet.create({
  messagesPane: {
    flex: 1,
    marginBottom: 12,
  },
  messagesContent: {
    paddingBottom: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  messageIncoming: {
    backgroundColor: '#e0e7ff',
    alignSelf: 'flex-start',
  },
  messageOutgoing: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
  },
  messageSystem: {
    backgroundColor: '#0ea5e916',
    alignSelf: 'center',
  },
  messageAuthor: {
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  messageText: {
    color: '#0f172a',
  },
  messageTs: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  chatTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  chatSubtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 'auto',
    backgroundColor: '#f8fafc',
  },
  chatInput: {
    flex: 1,
    color: '#111827',
    marginRight: 12,
  },
  chatShell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  chatShellCompact: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  chatTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTopBarCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  chatActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatActionsCompact: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    marginTop: 12,
  },
  chatTabs: {
    flexDirection: 'row',
    marginTop: 16,
  },
  chatTabsCompact: {
    flexWrap: 'wrap',
    marginTop: 12,
  },
  chatTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    marginRight: 10,
  },
  chatTabActive: {
    backgroundColor: '#4f46e5',
  },
  chatTabText: {
    color: '#111827',
    fontWeight: '700',
    marginLeft: 6,
  },
  chatTabTextActive: {
    color: '#ffffff',
  },
  chatMain: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 16,
  },
  chatMainCompact: {
    flexDirection: 'column',
  },
  chatListPanel: {
    width: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 14,
  },
  chatListPanelCompact: {
    width: '100%',
    marginRight: 0,
    marginBottom: 12,
  },
  chatListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chatList: {
    maxHeight: 520,
  },
  chatListCompact: {
    maxHeight: 240,
  },
  chatCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  chatCardActive: {
    borderColor: '#4f46e5',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  chatCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chatCardMeta: {
    flex: 1,
    paddingRight: 8,
  },
  chatName: {
    fontWeight: '700',
    color: '#111827',
  },
  chatPreview: {
    color: '#6b7280',
    marginTop: 4,
  },
  chatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBadgeText: {
    fontSize: 12,
    color: '#111827',
    marginLeft: 6,
  },
  chatPeer: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 12,
  },
  chatPane: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chatPaneCompact: {
    minHeight: 360,
  },
  chatPaneInner: {
    flex: 1,
  },
  chatPaneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverStatusText: {
    color: '#111827',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
  },
  secondaryButtonCompact: {
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
    marginLeft: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    marginLeft: 10,
  },
  primaryButtonCompact: {
    marginLeft: 0,
    marginTop: 10,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9fa6fc',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 8,
  },
  connectGrid: {
    flex: 1,
    marginTop: 16,
  },
  connectGridCompact: {
    flex: 0,
  },
  connectScrollContent: {
    paddingBottom: 120,
  },
  connectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 14,
  },
  connectInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    marginTop: 12,
  },
  connectHint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 6,
  },
  connectionLog: {
    maxHeight: 120,
    marginTop: 8,
  },
  logLine: {
    color: '#111827',
    marginBottom: 6,
  },
  addressPill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    color: '#111827',
    fontWeight: '700',
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  keyPreview: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#111827',
    fontSize: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
