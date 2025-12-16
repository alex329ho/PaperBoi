import React from 'react';
import { ScrollView, View } from 'react-native';
import { Avatar, Button, Divider, List, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

const ProfileScreen = () => {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Avatar.Icon size={72} icon="account" accessibilityLabel="User avatar" />
        <View style={{ alignItems: 'center' }}>
          <Text variant="headlineSmall">Your Profile</Text>
          <Text accessibilityLabel="Email address">reader@paperboi.app</Text>
        </View>
        <Button mode="contained" icon="pencil" onPress={() => {}} accessibilityLabel="Edit profile">
          Edit Profile
        </Button>
      </View>

      <Divider style={{ marginVertical: 8 }} />

      <List.Section title="Account" accessibilityRole="header">
        <List.Item
          title="Saved articles"
          description="Quick access to your bookmarks"
          left={(props) => <List.Icon {...props} icon="bookmark" />}
          onPress={() => router.push('/(tabs)/saved')}
        />
        <List.Item
          title="Notification preferences"
          description="Choose when you receive alerts"
          left={(props) => <List.Icon {...props} icon="bell" />}
        />
        <List.Item
          title="Security"
          description="Password and sign-in options"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
        />
      </List.Section>

      <Divider style={{ marginVertical: 8 }} />

      <List.Section title="Support" accessibilityRole="header">
        <List.Item
          title="Help Center"
          description="FAQs and troubleshooting"
          left={(props) => <List.Icon {...props} icon="lifebuoy" />}
        />
        <List.Item
          title="Contact Us"
          description="Reach the PaperBoi team"
          left={(props) => <List.Icon {...props} icon="email" />}
        />
      </List.Section>
    </ScrollView>
  );
};

export default ProfileScreen;
