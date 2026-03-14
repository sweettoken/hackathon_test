import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing['5xl'],
    },
    header: {
      marginBottom: Spacing['4xl'],
    },
    subtitle: {
      marginTop: Spacing.sm,
    },
    inputContainer: {
      marginBottom: Spacing.xl,
    },
    label: {
      marginBottom: Spacing.sm,
    },
    input: {
      backgroundColor: '#F7F7F7',
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      fontSize: 16,
      color: '#111111',
    },
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#F7F7F7',
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      marginBottom: Spacing['3xl'],
      gap: Spacing.sm,
    },
    infoText: {
      flex: 1,
      lineHeight: 20,
    },
    buttonGroup: {
      gap: Spacing.md,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111111',
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing['2xl'],
      gap: Spacing.sm,
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F7F7F7',
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing['2xl'],
      gap: Spacing.sm,
    },
    buttonText: {
      marginLeft: Spacing.xs,
    },
  });
};
