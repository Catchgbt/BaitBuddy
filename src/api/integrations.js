import { integrations } from './frontendClient.js';

export const Core = integrations.Core;

export const InvokeLLM = integrations.Core.InvokeLLM;

export const SendEmail  = integrations.Core.SendEmail;
export const SendSMS    = integrations.Core.SendSMS;
export const UploadFile = integrations.Core.UploadFile;
export const GenerateImage = integrations.Core.GenerateImage;
export const ExtractDataFromUploadedFile = integrations.Core.ExtractDataFromUploadedFile;
