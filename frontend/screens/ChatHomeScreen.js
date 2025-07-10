import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../firebase'; // Ensure auth is imported correctly

const { width, height } = Dimensions.get('window');

const suggestions = [
  'Relieve Stress',
  'Meditation',
  'Sleep Routine',
  'Improve Focus',
  'Negative Beliefs',
  'Reduce Anxiety',
  'Self Confidence',
];

export default function ChatHomeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const name = (auth.currentUser?.displayName?.split(' ')[0]) || 'Guest';
  
  const handleSuggestionPress = (suggestion) => {
    navigation.navigate('Chat', { promptText: suggestion });
  };

  const handleAskAnything = (text) => {
    if (text && text.trim()) {
      navigation.navigate('Chat', { promptText: text });
    }
  };

  const [inputText, setInputText] = React.useState('');

  // Calculate bottom padding based on safe area insets
  const bottomPadding = Math.max(insets.bottom, 16);
  const navbarHeight = Platform.select({
    ios: 80,
    android: 70 + insets.bottom,
  });

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      
      <LinearGradient
        colors={['#000000', '#000000', '#FF4800']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.9 }}
        style={[styles.gradient, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <Image 
            source={require('../assets/ekologo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: navbarHeight + 20 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.greeting}>Hi {name}, how are feeling today?</Text>
          
          <Text style={styles.suggestionsLabel}>I suggest you the following options:</Text>
          
          <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress(suggestion)}
                activeOpacity={0.8}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.howWorksButton}
            activeOpacity={0.8}
          >
            <Text style={styles.howWorksLabel}>How workout impacts wellness</Text>
          </TouchableOpacity>
          
          {/* Uncomment if you want the input field */}
          {/* <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleAskAnything(inputText)}
              returnKeyType="send"
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={() => handleAskAnything(inputText)}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View> */}
        </ScrollView>
        
        {/* Bottom Navigation Bar */}
        <View style={[
          styles.bottomNavbar,
          { 
            height: navbarHeight,
            paddingBottom: bottomPadding,
          }
        ]}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.navLabel}>CHAT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('UserProfile')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.navLabel}>PROFILE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, styles.activeNavItem]}
            onPress={() => navigation.navigate('ChatHistory')}
            activeOpacity={0.7}
          >
            <Ionicons name="time" size={24} color="#FF4800" />
            <Text style={[styles.navLabel]}>HISTORY</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logo: {
    height: 30,
    width: 60,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 20,
    lineHeight: 24,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 15,
    lineHeight: 18,
  },
  suggestionsContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 5,
    minHeight: 44, // Minimum touch target size for Android
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  howWorksButton: {
    marginBottom: 20,
    paddingVertical: 10,
  },
  howWorksLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginTop: 20,
    minHeight: 50,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  input: {
    flex: 1,
    height: 50,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0, // Remove default padding on Android
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4800',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  // Bottom Navigation Styles
  bottomNavbar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 5,
    minHeight: 44, // Minimum touch target size
  },
  navLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 12,
  },
  activeNavItem: {
    // Additional styles for active nav item if needed
  },
  activeNavLabel: {
    color: '#FF4800',
  },
});