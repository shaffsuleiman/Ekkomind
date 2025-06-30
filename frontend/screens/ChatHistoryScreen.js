import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';

const mockChatHistory = [
  { id: '1', topic: 'Stress Management', date: '2025-06-19' },
  { id: '2', topic: 'Better Sleep Tips', date: '2025-06-18' },
  { id: '3', topic: 'Healthy Diet Habits', date: '2025-06-17' },
];

export default function ChatHistoryScreen({ navigation, user }) {
  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName, { user });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Chat', { topic: item.topic, user })}
    >
      <Text style={styles.topic}>{item.topic}</Text>
      <Text style={styles.date}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your Past Chats</Text>
        <FlatList
          data={mockChatHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavbar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateToScreen('UserProfile')}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, styles.activeNavItem]}
          onPress={() => navigateToScreen('ChatHistory')}
        >
          <Text style={styles.navIcon}>📝</Text>
          <Text style={[styles.navLabel, styles.activeNavLabel]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateToScreen('ChatHome')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateToScreen('Chat')}
        >
          <Text style={styles.navIcon}>💬</Text>
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateToScreen('Settings')}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 100, // Space for bottom navbar
  },
  title: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  topic: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  date: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 4,
  },
  // Bottom Navigation Styles
  bottomNavbar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  activeNavItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#fff',
  },
});