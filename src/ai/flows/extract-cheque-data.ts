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
  companyName: z.string().describe('The name of the company that issued the cheque. This is the text written after the "Pay" or "PAY" label.'),
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
  prompt: `Analyze the provided cheque image and extract the information. Adhere to the following instructions precisely for each field:
- partyName: Find the label "For" or "FOR" and extract the full name of the payee written next to it.
- companyName: Find the label "Pay" or "PAY" and extract the full name of the company written next to it.
- date: Find the date on the cheque and provide it in DD/MM/YYYY format.
- amount: Extract only the numerical value of the cheque amount.
- chequeNumber: Extract the cheque number.
- bankName: Extract the name of the bank.

Return the data as a JSON object. If a field is not found or is unclear, return an empty string for that field.

{{media url=photoDataUri}}`,
  model: 'googleai/gemini-2.5-flash'
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
