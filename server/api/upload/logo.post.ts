import { promises as fs } from 'fs';
import { join } from 'path';

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    filename: string;
    data: string; // base64 data URL
  }>(event);

  if (!body.filename || !body.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing filename or data',
    });
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'logos');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const safeFilename = `logo-${timestamp}-${body.filename.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    const filePath = join(uploadDir, safeFilename);

    // Convert base64 data URL to buffer
    const base64Data = body.data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    // Return the public URL path
    const publicPath = `/uploads/logos/${safeFilename}`;
    return {
      success: true,
      path: publicPath,
      filename: safeFilename,
    };
  } catch (error) {
    console.error('Logo upload error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to upload logo',
    });
  }
});
