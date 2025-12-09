import React from 'react';
import { Chip, Text } from 'react-native-paper';

interface RegionSelectorProps {
  regions: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

const RegionSelector: React.FC<RegionSelectorProps> = ({ regions, selected, onChange }) => {
  const toggle = (region: string) => {
    const next = selected.includes(region) ? selected.filter((r) => r !== region) : [...selected, region];
    onChange(next);
  };

  return (
    <>
      <Text variant="titleSmall" style={{ marginBottom: 8 }}>
        Regions
      </Text>
      {regions.map((region) => (
        <Chip key={region} style={{ marginRight: 8, marginBottom: 8 }} selected={selected.includes(region)} onPress={() => toggle(region)}>
          {region}
        </Chip>
      ))}
    </>
  );
};

export default RegionSelector;
