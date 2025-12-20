import React, { useMemo, useState } from 'react';
import { Card, Text, Button, useTheme } from 'react-native-paper';

interface SummaryCardProps {
  title: string;
  summary: string;
  expandable?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, summary, expandable = true }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const content = useMemo(() => {
    if (!expandable) return summary;
    if (expanded) return summary;
    return summary.length > 220 ? `${summary.slice(0, 220)}…` : summary;
  }, [expandable, expanded, summary]);

  return (
    <Card
      mode="outlined"
      style={{ marginBottom: 12, backgroundColor: colors.surface, borderColor: colors.outline }}
    >
      <Card.Title title={title} />
      <Card.Content>
        <Text selectable accessibilityRole="text">
          {content}
        </Text>
        {expandable && summary.length > 220 ? (
          <Button
            onPress={() => setExpanded(!expanded)}
            accessibilityLabel="Toggle summary details"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
};

export default SummaryCard;
