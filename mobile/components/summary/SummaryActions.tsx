import React from 'react';
import { Button, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Spacing } from '@utils/spacing';

interface SummaryActionsProps {
  summary: string;
}

const SummaryActions: React.FC<SummaryActionsProps> = ({ summary }) => {
  const onShare = async () => {
    await Share.share({ message: summary });
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(summary);
  };

  return (
    <View style={styles.container}>
      <Button title="Share" onPress={onShare} />
      <Button title="Copy" onPress={onCopy} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md
  }
});

export default SummaryActions;
