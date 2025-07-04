import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase'; // make sure db is imported here
import { getDoc, doc } from 'firebase/firestore';

import OnboardingScreen from './screens/OnboardingScreen';
import SignUpNameScreen from './screens/SignUpNameScreen';
import SignUpEmailScreen from './screens/SignUpEmailScreen';
import SignUpPasswordScreen from './screens/SignUpPasswordScreen';
import ChatHomeScreen from './screens/ChatHomeScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatHistoryScreen from './screens/ChatHistoryScreen';
import UserInfoScreen from './screens/UserInfoScreen';
import CustomSplashScreen from './screens/splashscreen';
import EmailVerifyPending from './screens/EmailVerifyPending'; // Ensure this is the correct path

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [needsUserInfo, setNeedsUserInfo] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        setNeedsUserInfo(!userSnap.exists());
        setUser(firebaseUser);
      } else {
        setUser(null);
      }

      setChecking(false);
    });

    return unsubscribe;
  }, []);

  if (checking) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth flow */}
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="SignUpName" component={SignUpNameScreen} />
        <Stack.Screen name="SignUpEmail" component={SignUpEmailScreen} />
        <Stack.Screen name="SignUpPassword" component={SignUpPasswordScreen} />
        <Stack.Screen name="EmailVerifyPending" component={EmailVerifyPending} />

        {/* User info collection */}
        <Stack.Screen name="UserInfo" component={UserInfoScreen} />

        {/* Main App */}
        <Stack.Screen name="ChatHome" component={ChatHomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="UserProfile" component={ProfileScreen} />
        <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} />
        <Stack.Screen name="splash" component={CustomSplashScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


