'use server';

import { extractChequeData, type ExtractChequeDataInput } from '@/ai/flows/extract-cheque-data';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { configureGenkit } from '@genkit-ai/next';

export async function scanCheque(input: ExtractChequeDataInput) {
    try {
        // Configure Genkit within the server action context
        // This ensures GOOGLE_API_KEY is available from environment variables
        await configureGenkit({
            plugins: [
                googleAI({
                    apiKey: process.env.GOOGLE_API_KEY
                })
            ],
            logLevel: 'debug',
            enableTracingAndMetrics: true,
        });

        const result = await extractChequeData(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Cheque scan failed:", error);
        
        let errorMessage = "Scan failed. Please check the console for details.";
        if (error.message) {
            if (error.message.includes('API key not valid')) {
                errorMessage = "Scan failed: The provided API Key is not valid. Please check your settings.";
            } else {
                errorMessage = `Scan failed: ${error.message}`;
            }
        }
        
        return { success: false, error: errorMessage };
    }
}
