import React, { useMemo } from 'react';
import { TextStyle } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface SummaryCardProps {
  title: string;
  summary: string;
  titleStyle?: TextStyle;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  summary,
  titleStyle,
}) => {
  const { colors } = useTheme();
  const summaryText = useMemo(() => {
    const sentenceChunks =
      summary.match(/[^.!?\n]+[.!?]?/g)?.map((chunk) => chunk.trim()).filter(Boolean) ??
      [summary.trim()].filter(Boolean);
    const seen = new Set<string>();
    const uniqueSentences: string[] = [];
    sentenceChunks.forEach((chunk) => {
      const normalized = chunk.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(normalized)) return;
      seen.add(normalized);
      uniqueSentences.push(chunk);
    });
    const cleaned = uniqueSentences.join(' ');
    const words = cleaned.split(/\s+/).filter(Boolean);
    const expandedLimit = 200;
    return words.slice(0, expandedLimit).join(' ');
  }, [summary]);
  const content = summaryText;

  return (
    <Card
      mode="outlined"
      style={{ marginBottom: 12, backgroundColor: colors.surface, borderColor: colors.outline }}
    >
      <Card.Title title={title} titleStyle={titleStyle} />
      <Card.Content>
        <Text selectable accessibilityRole="text">
          {content}
        </Text>
      </Card.Content>
    </Card>
  );
};

export default SummaryCard;
