import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// API key is now configured globally via environment variables.
// For local dev, it uses the .env file.
// For production (Netlify), it uses environment variables set in the Netlify UI.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
});
