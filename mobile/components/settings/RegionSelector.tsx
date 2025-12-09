import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Spacing } from '@utils/spacing';
import { Colors } from '@utils/colors';

interface RegionSelectorProps {
  regions: string[];
  selected: string[];
  onToggle: (region: string) => void;
}

const RegionSelector: React.FC<RegionSelectorProps> = ({ regions, selected, onToggle }) => (
  <View style={styles.container}>
    {regions.map((region) => (
      <TouchableOpacity
        key={region}
        onPress={() => onToggle(region)}
        style={[styles.row, selected.includes(region) && styles.active]}
      >
        <Text style={[styles.text, selected.includes(region) && styles.activeText]}>{region}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm
  },
  row: {
    padding: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border
  },
  active: {
    borderColor: Colors.primary,
    backgroundColor: '#eef2ff'
  },
  text: {
    color: Colors.text
  },
  activeText: {
    color: Colors.primary,
    fontWeight: '700'
  }
});

export default RegionSelector;
