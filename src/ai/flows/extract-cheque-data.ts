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
  payeeName: z.string().describe('The name of the payee written on the "Pay" line. For example, in the phrase "Pay Daksha Enterprise", this would be "Daksha Enterprise". This is the Company Name.'),
  partyName: z.string().describe('The name of the party to whom the cheque is payable. This is the text written after the "For" or "FOR" label. The result should not include the "For" or "FOR" text itself. For example, if the text is "For TRIYA FASHIONS PRIVATE LIMITED", the result should be "TRIYA FASHIONS PRIVATE LIMITED".'),
  date: z.string().describe('The date on the cheque in DD/MM/YYYY format, extracted from the box in the top-right corner.'),
  amount: z.string().describe('The numerical amount on the cheque.'),
  chequeNumber: z.string().describe('The 6-digit cheque number, which is the first group of numbers in the MICR line at the bottom of the cheque.'),
  bankName: z.string().describe('The name of the bank on the cheque. This is usually at the top. For example, "Kotak Mahindra Bank".'),
  error: z.string().optional().describe("An error message if a data point is unclear or not found."),
});
export type ExtractChequeDataOutput = z.infer<typeof ExtractChequeDataOutputSchema>;

export async function extractChequeData(input: ExtractChequeDataInput): Promise<ExtractChequeDataOutput> {
  return extractChequeDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractChequeDataPrompt',
  input: {schema: ExtractChequeDataInputSchema},
  output: {schema: ExtractChequeDataOutputSchema},
  prompt: `Analyze the provided cheque image, which may be horizontal or vertical. If it's not horizontal, rotate it to be horizontal before processing. Identify and extract the following data points based on their standard locations on a cheque:

- payeeName: Find the line that starts with "Pay" and extract the recipient's name. This is the company name. For example, if the line is "Pay Daksha Enterprise", extract "Daksha Enterprise".
- partyName: Find the line that starts with "For" or "FOR", which is usually below the amount in the box. Extract the name that follows, but do not include the word "For" in the result. For example, from "For TRIYA FASHIONS PRIVATE LIMITED", extract "TRIYA FASHIONS PRIVATE LIMITED".
- date: Locate the box in the top-right corner with the format "DD MM YYYY" and extract the date.
- amount: Extract the numerical amount written in the box, which usually has "₹" symbol.
- chequeNumber: Find the MICR code at the bottom of the cheque. The cheque number is the first 6-digit number in this code.
- bankName: Identify the name of the bank, which is typically located at the top of the cheque. For example, "Kotak Mahindra Bank".

If any of these data points are unclear or cannot be found, populate the 'error' field with a descriptive message. If the image is not a cheque, return empty strings for all fields and an error message.

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
