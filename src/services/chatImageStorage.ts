type UploadChatImageArgs = {
  fileUri: string;
  chatId: string;
  authorId?: string;
};

export async function uploadChatImage(_args: UploadChatImageArgs): Promise<{ path: string; signedUrl: string }> {
  throw new Error('Remote chat image storage is disabled in serverless local mode.');
}

export async function createSignedChatImageUrl(_path: string, _ttlSeconds?: number): Promise<string> {
  throw new Error('Remote chat image storage is disabled in serverless local mode.');
}
