import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebase';
import Cookies from 'js-cookie';

// Sign up function
export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Set auth token in cookie
    const token = await userCredential.user.getIdToken();
    Cookies.set('auth-token', token, { expires: 7 }); // Expires in 7 days
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Sign in function
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Set auth token in cookie
    const token = await userCredential.user.getIdToken();
    Cookies.set('auth-token', token, { expires: 7 }); // Expires in 7 days
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Sign out function
export const signOutUser = async () => {
  try {
    await signOut(auth);
    // Remove auth token from cookie
    Cookies.remove('auth-token');
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
}; 