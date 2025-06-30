import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useGoogleAuth } from '../utils/useGoogleAuth';

export default function OnboardingScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();
  const { request, promptAsync } = useGoogleAuth();

  const handleSignIn = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please enter both email and password');
    return;
  }

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in:', userCred.user.email);

    // Optional navigation fallback
    navigation.replace('ChatHome'); // Only if App.js logic fails
  } catch (error) {
    Alert.alert('Login Failed', error.message);
  }
};

  const handleGoogleSignIn = async () => {
    await promptAsync();
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
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/ekologo1.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.welcome}>WELCOME</Text>
          <Text style={styles.subtitle}>Sign in and take control of your well-being</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.emailInput}
              placeholder="Enter your Email"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••"
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
              <Text style={styles.signInText}>SIGN IN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => navigation.navigate('SignUpName')}
            >
              <Text style={styles.signUpText}>REGISTER</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={!request}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginLeft: 16,
    marginRight: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  emailInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    marginLeft: 16,
    marginRight: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    marginLeft: 16,
    marginRight: 16,
  },
  signInButton: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  signInText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  signUpButton: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  signUpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  socialContainer: {
    marginTop: 20,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    height: 50,
    marginLeft: 26,
    marginRight: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  logo: {
    width: 150,
    height: 80,
  },
});