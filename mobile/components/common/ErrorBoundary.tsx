import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@utils/colors';
import { Spacing } from '@utils/spacing';

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Boundary error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.message}</Text>
          <Button title="Try again" onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text
  },
  message: {
    marginVertical: Spacing.md,
    color: Colors.muted,
    textAlign: 'center'
  }
});

export default ErrorBoundary;
