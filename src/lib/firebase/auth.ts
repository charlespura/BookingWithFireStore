import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { app } from './client';
export const auth = app ? getAuth(app) : null;
if (auth && import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
