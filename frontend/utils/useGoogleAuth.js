import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true, // 🔥 Required for Expo Go
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '936354506242-av5ljmk04ppdrj5g7uv5b8etl5rtkpu3.apps.googleusercontent.com',
    webClientId: '936354506242-av5ljmk04ppdrj5g7uv5b8etl5rtkpu3.apps.googleusercontent.com',
    iosClientId: '936354506242-av5ljmk04ppdrj5g7uv5b8etl5rtkpu3.apps.googleusercontent.com',
    androidClientId: '936354506242-av5ljmk04ppdrj5g7uv5b8etl5rtkpu3.apps.googleusercontent.com',
    redirectUri: AuthSession.makeRedirectUri({ useProxy: true }), // 👈 this ensures Expo Go works
    redirectUri, // ✅ Explicitly set this
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.authentication;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch((err) =>
        console.log('Google sign-in error:', err.message)
      );
    }
  }, [response]);

  return { request, promptAsync };
}
