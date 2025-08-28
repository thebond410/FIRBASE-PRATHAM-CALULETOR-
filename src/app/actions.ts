'use server';

import { extractChequeData, type ExtractChequeDataInput } from '@/ai/flows/extract-cheque-data';

export async function scanCheque(input: ExtractChequeDataInput) {
    try {
        const result = await extractChequeData(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Cheque scan failed:", error);
        
        let errorMessage = "Scan failed. Please check the console for details.";
        if (error.message) {
            if (error.message.includes('API key not valid')) {
                errorMessage = "Scan failed: The provided API Key is not valid. Please check your settings.";
            } else if (error.message.includes('permission')) {
                 errorMessage = "Scan failed: The provided API Key is not valid or does not have permissions for this model. Please check your settings.";
            }
            else {
                errorMessage = `Scan failed: ${error.message}`;
            }
        }
        
        return { success: false, error: errorMessage };
    }
}
