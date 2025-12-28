import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ResizeMode, Video } from 'expo-av';

interface LoadingAnimationProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  size = 140,
  style,
  accessibilityLabel = 'Loading',
}) => (
  <View style={[styles.container, style]}>
    <Video
      source={require('../../assets/animations/loading.mp4')}
      style={{ width: size, height: size }}
      resizeMode={ResizeMode.CONTAIN}
      isLooping
      isMuted
      shouldPlay
      accessibilityLabel={accessibilityLabel}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoadingAnimation;
