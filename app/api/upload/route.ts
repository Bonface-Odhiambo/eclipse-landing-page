// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    const uploadPromises = files.map(async (file: any) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await writeFile(
        path.join(uploadDir, file.name),
        buffer
      );
      
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        path: `/uploads/${file.name}`
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}