import React from 'react';
import { Share } from 'react-native';
import { Button } from 'react-native-paper';

interface SummaryActionsProps {
  content: string;
}

const SummaryActions: React.FC<SummaryActionsProps> = ({ content }) => {
  const handleShare = async () => {
    await Share.share({ message: content });
  };

  return <Button onPress={handleShare}>Share summary</Button>;
};

export default SummaryActions;
