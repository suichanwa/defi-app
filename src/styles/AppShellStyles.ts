import { StyleSheet } from 'react-native';

export const appShellStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenLayer: {
    flex: 1,
  },
  chatLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  navItem: {
    padding: 6,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#e0e7ff',
  },
});
