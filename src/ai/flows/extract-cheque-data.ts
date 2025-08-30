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
      "A photo of a cheque, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ExtractChequeDataInput = z.infer<typeof ExtractChequeDataInputSchema>;

const ExtractChequeDataOutputSchema = z.object({
  partyName: z.string().describe('The name of the party to whom the cheque is payable. This is the text written after the "For" or "FOR" label.'),
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
  prompt: `Analyze the provided cheque image and extract the following information:
- partyName: The name of the payee written after the "For" or "FOR" label.
- date: The date in DD/MM/YYYY format.
- amount: The numerical value of the cheque amount.
- chequeNumber: The cheque number.
- bankName: The name of the bank.

If a field is not found, return an empty string.

{{media url=photoDataUri}}`,
  model: 'googleai/gemini-1.5-flash-latest'
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
