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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
  const { name = 'Julien' } = route.params || {};

  const handleSuggestionPress = (suggestion) => {
    navigation.navigate('Chat', { promptText: suggestion });
  };

  const handleAskAnything = (text) => {
    if (text && text.trim()) {
      navigation.navigate('Chat', { promptText: text });
    }
  };

  const [inputText, setInputText] = React.useState('');

  return (
    <LinearGradient
          colors={['#000000', '#000000', '#FF4800']}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/ekologo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.greeting}>Hi {name}, how are feeling today?</Text>
          
          <Text style={styles.suggestionsLabel}>I suggest you the following options:</Text>
          
          <View style={styles.suggestionsContainer}>
            <View style={styles.suggestionRow}>
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress('Relieve Stress')}
              >
                <Text style={styles.suggestionText}>Relieve Stress</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress('Meditation')}
              >
                <Text style={styles.suggestionText}>Meditation</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress('Sleep Routine')}
              >
                <Text style={styles.suggestionText}>Sleep Routine</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.suggestionRow}>
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress('Improve Focus')}
              >
                <Text style={styles.suggestionText}>Improve Focus</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress('Negative Beliefs')}
              >
                <Text style={styles.suggestionText}>Negative Beliefs</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.suggestionRow}>
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress('Reduce Anxiety')}
              >
                <Text style={styles.suggestionText}>Reduce Anxiety</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress('Self Confidence')}
              >
                <Text style={styles.suggestionText}>Self Confidence</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.howWorksLabel}>How workout impacts wellness</Text>
          
          {/* <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleAskAnything(inputText)}
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={() => handleAskAnything(inputText)}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View> */}
        </View>
        
        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNavbar}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('UserProfile')}
          >
            <Ionicons name="person-outline" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.navLabel}>PROFILE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Chat')}
          >
            <Ionicons name="chatbubble-outline" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={styles.navLabel}>CHAT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, styles.activeNavItem]}
          >
            <Ionicons name="home" size={24} color="#FF4800" />
            <Text style={[styles.navLabel, styles.activeNavLabel]}>HOME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  logo: {
    height: 30,
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80, // Make room for the navbar
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 20,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 15,
  },
  suggestionsContainer: {
    marginBottom: 20,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  suggestionButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  howWorksLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 15,
    textDecorationLine: 'underline',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginTop: 'auto',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bottom Navigation Styles
  bottomNavbar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  navLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 4,
  },
  activeNavLabel: {
    color: '#FF4800',
  },
});
