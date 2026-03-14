import { StyleSheet, Platform } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme, isRecording: boolean = false) => {
  const isIOS = Platform.OS === 'ios';

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing['5xl'],
    },
    header: {
      marginBottom: Spacing['5xl'],
    },
    settingsButton: {
      alignSelf: 'flex-end',
      padding: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    subtitle: {
      marginTop: Spacing.sm,
    },
    recordButton: {
      alignSelf: 'center',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: Spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
      ...(isIOS
        ? {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
          }
        : {
            elevation: 2,
          }),
    },
    recordButtonRecording: {
      backgroundColor: '#111111',
      borderColor: '#111111',
    },
    recordButtonInner: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isRecording ? '#FFFFFF' : '#F7F7F7',
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusText: {
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    textContainer: {
      marginBottom: Spacing.xl,
    },
    textLabel: {
      marginBottom: Spacing.sm,
    },
    textBox: {
      backgroundColor: '#F7F7F7',
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      minHeight: 80,
    },
    playButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111111',
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing['2xl'],
      gap: Spacing.sm,
    },
    playButtonText: {
      marginLeft: Spacing.sm,
    },
  });
};
