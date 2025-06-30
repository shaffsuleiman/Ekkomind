import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpNameScreen({ navigation }) {
  const [name, setName] = useState('');
  const [currentStep, totalSteps] = [1, 4]; // This is step 1 of 4

  const handleNext = () => {
    if (name.trim() === '') return;
    navigation.navigate('SignUpEmail', { name });
  };

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
            source={require('../assets/ekologo.png')} // Replace with your logo path
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>Let's start with your name</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Julien"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>
        
        <View style={styles.footer}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(currentStep / totalSteps) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{currentStep}/{totalSteps}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.fab, name.trim() === '' && styles.fabDisabled]} 
            onPress={handleNext}
            disabled={name.trim() === ''}
          >
            <Ionicons name="arrow-forward" size={24} color="#8B0000" />
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    height: 40,
    width: 80,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  title: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '400',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF0000',
    borderRadius: 1,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
  },
  fab: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabDisabled: {
    opacity: 0.7,
  },
});
