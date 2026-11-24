export async function uploadAvatar(_userId: string, _fileUri: string): Promise<string> {
  throw new Error('Remote avatar uploads are disabled in serverless local mode.');
}
