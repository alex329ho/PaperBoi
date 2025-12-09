import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Spacing } from '@utils/spacing';
import { Colors } from '@utils/colors';

interface TopicSelectorProps {
  topics: string[];
  selected: string[];
  onToggle: (topic: string) => void;
}

const TopicSelector: React.FC<TopicSelectorProps> = ({ topics, selected, onToggle }) => (
  <View style={styles.container}>
    {topics.map((topic) => {
      const active = selected.includes(topic);
      return (
        <TouchableOpacity
          key={topic}
          style={[styles.chip, active && styles.active]}
          onPress={() => onToggle(topic)}
        >
          <Text style={[styles.text, active && styles.activeText]}>{topic}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm
  },
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border
  },
  active: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  text: {
    color: Colors.text
  },
  activeText: {
    color: '#fff'
  }
});

export default TopicSelector;
