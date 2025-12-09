import React from 'react';
import { Text } from 'react-native';
import { Card, Button } from 'react-native-paper';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <Card style={{ margin: 16 }}>
          <Card.Title title="Something went wrong" />
          <Card.Content>
            <Text>{this.state.error?.message}</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={this.handleReset}>Try again</Button>
          </Card.Actions>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
