import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface SectionRibbonProps {
  sections: string[];
  activeSection: string;
  onSelect: (section: string) => void;
}

const SectionRibbon: React.FC<SectionRibbonProps> = ({ sections, activeSection, onSelect }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, { borderColor: colors.outline }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {sections.map((section) => {
          const isActive = section === activeSection;
          return (
            <Pressable
              key={section}
              onPress={() => onSelect(section)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: colors.outline,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${section}`}
            >
              <Text
                variant="labelLarge"
                style={{ color: isActive ? colors.onPrimary : colors.onSurface }}
              >
                {section}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});

export default SectionRibbon;
