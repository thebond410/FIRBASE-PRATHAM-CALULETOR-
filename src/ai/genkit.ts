import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// API key is no longer configured globally.
// It will be passed dynamically to each AI call.
export const ai = genkit({
  plugins: [googleAI()],
});
