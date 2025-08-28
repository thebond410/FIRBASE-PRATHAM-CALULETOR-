'use server';

/**
 * @fileOverview A cheque scanner AI agent.
 *
 * - extractChequeData - A function that handles the cheque scanning process.
 * - ExtractChequeDataInput - The input type for the extractChequeData function.
 * - ExtractChequeDataOutput - The return type for the extractChequeData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractChequeDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a cheque, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractChequeDataInput = z.infer<typeof ExtractChequeDataInputSchema>;

const ExtractChequeDataOutputSchema = z.object({
  partyName: z.string().describe('The name of the party to whom the cheque is payable.'),
  companyName: z.string().describe('The name of the company that issued the cheque.'),
  date: z.string().describe('The date on the cheque in DD/MM/YYYY format.'),
  amount: z.string().describe('The numerical amount on the cheque.'),
  chequeNumber: z.string().describe('The cheque number.'),
  bankName: z.string().describe('The name of the bank on the cheque.'),
});
export type ExtractChequeDataOutput = z.infer<typeof ExtractChequeDataOutputSchema>;

export async function extractChequeData(input: ExtractChequeDataInput): Promise<ExtractChequeDataOutput> {
  return extractChequeDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractChequeDataPrompt',
  input: {schema: ExtractChequeDataInputSchema},
  output: {schema: ExtractChequeDataOutputSchema},
  prompt: `Analyze this cheque image and extract the following data strictly as a JSON object: { 'partyName': 'text next to FOR/For', 'companyName': 'text next to PAY/Pay', 'date': 'cheque date in DD/MM/YYYY format', 'amount': 'numerical amount', 'chequeNumber': 'cheque number', 'bankName': 'name of the bank' }. If any field is unclear, return an empty string for that field.\n\n{{media url=photoDataUri}}`,
});

const extractChequeDataFlow = ai.defineFlow(
  {
    name: 'extractChequeDataFlow',
    inputSchema: ExtractChequeDataInputSchema,
    outputSchema: ExtractChequeDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

