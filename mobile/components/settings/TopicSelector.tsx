import React from 'react';
import { Chip, Text } from 'react-native-paper';

interface TopicSelectorProps {
  topics: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

const TopicSelector: React.FC<TopicSelectorProps> = ({ topics, selected, onChange }) => {
  const toggle = (topic: string) => {
    const next = selected.includes(topic)
      ? selected.filter((t) => t !== topic)
      : [...selected, topic];
    onChange(next);
  };

  return (
    <>
      <Text variant="titleSmall" style={{ marginBottom: 8 }}>
        Topics
      </Text>
      {topics.map((topic) => (
        <Chip
          key={topic}
          style={{ marginRight: 8, marginBottom: 8 }}
          selected={selected.includes(topic)}
          onPress={() => toggle(topic)}
        >
          {topic}
        </Chip>
      ))}
    </>
  );
};

export default TopicSelector;
