interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Only compress images
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const compressionOptions = {
    maxSizeMB: options.maxSizeMB ?? 2,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 2048,
    useWebWorker: true,
    fileType: file.type as string,
  };

  try {
    // Dynamic import to prevent bundling issues
    const imageCompression = (await import('browser-image-compression')).default;
    const compressedFile = await imageCompression(file, compressionOptions);
    console.log(
      `Compressão: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
    );
    return compressedFile;
  } catch (error) {
    console.error("Erro na compressão:", error);
    return file; // Return original if compression fails
  }
}

export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  const compressed = await Promise.all(
    files.map((file) => compressImage(file, options))
  );
  return compressed;
}
