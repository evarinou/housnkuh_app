/**
 * @file ImageUploadField.tsx
 * @purpose Drag-and-drop image upload component with preview and validation
 * @created 2025-11-17
 * @modified 2025-11-17
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { resolveImageUrl } from '../../utils/imageUtils';

export interface ImageUploadFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  error?: string;
  /**
   * Lädt eine Datei zum Server hoch und liefert die Bild-URL zurück.
   * Ohne Callback fällt die Komponente auf Base64-Data-URLs zurück (Legacy).
   */
  onUpload?: (file: File) => Promise<string>;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  images,
  onChange,
  maxImages = 5,
  maxSizeMB = 2,
  error,
  onUpload
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploadError(null);

      // Check if adding these files would exceed max
      if (images.length + acceptedFiles.length > maxImages) {
        setUploadError(`Maximal ${maxImages} Bilder erlaubt`);
        return;
      }

      // Validate file sizes
      const oversizedFiles = acceptedFiles.filter(
        file => file.size > maxSizeMB * 1024 * 1024
      );
      if (oversizedFiles.length > 0) {
        setUploadError(`Dateien dürfen maximal ${maxSizeMB}MB groß sein`);
        return;
      }

      setUploading(true);

      try {
        let newImages: string[];

        if (onUpload) {
          // Upload zum Server — Produkt speichert nur die URL
          newImages = await Promise.all(acceptedFiles.map(file => onUpload(file)));
        } else {
          // Legacy-Fallback: Base64-Data-URLs (nur wo kein Upload-Endpoint existiert)
          newImages = await Promise.all(
            acceptedFiles.map(file => {
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            })
          );
        }

        onChange([...images, ...newImages]);
      } catch (err) {
        setUploadError('Fehler beim Hochladen der Bilder');
        console.error('Image upload error:', err);
      } finally {
        setUploading(false);
      }
    },
    [images, maxImages, maxSizeMB, onChange, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: maxImages - images.length,
    disabled: images.length >= maxImages || uploading
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const displayError = error || uploadError;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
          ${displayError ? 'border-red-300' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center">
          <Upload className={`h-10 w-10 mb-3 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />

          {uploading ? (
            <p className="text-sm text-gray-600">Bilder werden hochgeladen...</p>
          ) : images.length >= maxImages ? (
            <p className="text-sm text-gray-500">Maximale Anzahl erreicht ({maxImages})</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-1">
                {isDragActive ? 'Bilder hier ablegen...' : 'Bilder hierher ziehen oder klicken zum Auswählen'}
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG oder WebP (max. {maxSizeMB}MB pro Datei, max. {maxImages} Bilder)
              </p>
              {images.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  {images.length} von {maxImages} Bildern hochgeladen
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {displayError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={image.startsWith('data:') ? image : resolveImageUrl(image)}
                  alt={`Produktbild ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label={`Bild ${index + 1} entfernen`}
              >
                <X className="h-4 w-4" />
              </button>

              {/* Primary Image Badge */}
              {index === 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                  Hauptbild
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !uploading && (
        <div className="text-center py-4">
          <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Noch keine Bilder hochgeladen</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploadField;
