'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Lang } from '@/lib/types';

// ── Keepsy-style upload preprocessing ──────────────────────────────────────
// iPhone default format is HEIC. Large files must be recompressed. Both fail
// silently without this layer.

const ORIGINAL_MAX_BYTES = 3.6 * 1024 * 1024;
const SAFE_CAP_BYTES = 3.9 * 1024 * 1024;
const RECOMPRESS_STEPS = [
  { edge: 4096, quality: 0.9 },
  { edge: 3600, quality: 0.86 },
  { edge: 3200, quality: 0.82 },
  { edge: 2800, quality: 0.78 },
  { edge: 2550, quality: 0.74 },
];

type Decoded = { source: CanvasImageSource; width: number; height: number; close?: () => void };

async function decodeImage(file: File): Promise<Decoded | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (bitmap) return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
  return new Promise<Decoded | null>(resolve => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) });
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function drawToBlob(d: Decoded, edge: number, quality: number): Promise<Blob | null> {
  let { width, height } = d;
  if (width > edge || height > edge) {
    const scale = Math.min(edge / width, edge / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(d.source, 0, 0, width, height);
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
}

async function prepareForUpload(file: File): Promise<{ blob: Blob; name: string } | { error: string }> {
  if (file.size <= ORIGINAL_MAX_BYTES) return { blob: file, name: file.name || 'photo.jpg' };
  const decoded = await decodeImage(file);
  if (!decoded) return { error: 'This browser cannot open that image format' };
  try {
    for (const step of RECOMPRESS_STEPS) {
      const blob = await drawToBlob(decoded, step.edge, step.quality);
      if (blob && blob.size <= SAFE_CAP_BYTES) {
        return { blob, name: (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg' };
      }
    }
  } finally {
    decoded.close?.();
  }
  return { error: 'Photo is too large to upload' };
}
// ────────────────────────────────────────────────────────────────────────────

interface Props {
  currentUser: { name: string; kidName: string } | null;
  tvMode: boolean;
  lang: Lang;
}

interface Photo {
  url: string;
  uploadedAt: number;
  uploader?: string;
}

export default function PhotoAlbum({ currentUser, tvMode, lang }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch('/party/api/photos');
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 10000); // refresh every 10s for TV
    return () => clearInterval(interval);
  }, [fetchPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const failures: string[] = [];
    try {
      for (const file of files) {
        const prepared = await prepareForUpload(file);
        if ('error' in prepared) { failures.push(prepared.error); continue; }

        const formData = new FormData();
        formData.append('file', prepared.blob, prepared.name);
        formData.append('uploaderName', currentUser?.name || 'guest');

        const res = await fetch('/party/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          setPhotos(prev => [{ url: data.url, uploadedAt: Date.now(), uploader: currentUser?.name }, ...prev]);
        } else {
          failures.push(file.name || 'photo');
        }
      }
    } catch {
      failures.push('upload error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    if (failures.length === 0) {
      setFlash(lang === 'fr' ? `${files.length > 1 ? files.length + ' photos ajoutées' : 'Photo ajoutée'}! 📸` : `${files.length > 1 ? files.length + ' photos' : 'Photo'} uploaded! 📸`);
      setTimeout(() => setFlash(null), 2000);
    } else {
      setFlash(lang === 'fr' ? 'Erreur — réessayez! 😅' : 'Upload failed. Try again! 😅');
      setTimeout(() => setFlash(null), 3000);
    }
  };

  const displayPhotos = tvMode ? photos.slice(0, 6) : photos.slice(0, 20);

  return (
    <div className="p-4 pb-24">
      {flash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-pink-500 text-white font-black text-xl px-8 py-4 rounded-full shadow-2xl animate-bounce">
          {flash}
        </div>
      )}

      <h2 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-wide">
        {lang === 'fr' ? '📸 Photos de fête' : '📸 Party Photos'}
      </h2>

      {/* Album promise banner */}
      <div className="mx-auto max-w-md mb-6 rounded-2xl text-center px-6 py-4"
        style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(236,72,153,0.3)' }}>
        <div className="text-2xl mb-1">🎁</div>
        <p className="text-pink-300 font-bold text-base">
          {lang === 'fr'
            ? 'Nous ferons un album photo pour tout le monde!'
            : "We'll make a photo album for everyone at the party!"}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          {lang === 'fr' ? 'Ajoutez vos photos — elles seront dans l\'album!' : 'Upload your pics — they go in the album!'}
        </p>
      </div>

      {/* Upload button */}
      {!tvMode && (
        <div className="mb-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            onChange={handleUpload}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`inline-flex items-center gap-3 cursor-pointer py-6 px-12 rounded-3xl font-black text-2xl transition-all ${
              uploading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'text-white hover:scale-105'
            }`}
            style={uploading ? {} : {
              background: 'linear-gradient(135deg, #ec4899, #a855f7)',
              boxShadow: '0 0 40px rgba(236,72,153,0.4)',
            }}
          >
            {uploading
              ? (lang === 'fr' ? '⏳ Envoi...' : '⏳ Uploading...')
              : (lang === 'fr' ? '📷 Ajouter une photo!' : '📷 Add a Photo!')}
          </label>
          {!currentUser && (
            <p className="text-yellow-400 text-sm mt-2">
              {lang === 'fr' ? "Inscrivez-vous d'abord pour ajouter des photos" : 'Register first to upload photos'}
            </p>
          )}
        </div>
      )}

      {/* Photo grid */}
      {displayPhotos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-8xl mb-4">📷</div>
          <p className="text-gray-500 text-xl">
            {lang === 'fr' ? 'Aucune photo encore!' : 'No photos yet!'}
          </p>
          <p className="text-gray-600">
            {lang === 'fr' ? 'Soyez le premier à capturer les moments!' : 'Be the first to capture the fun!'}
          </p>
        </div>
      ) : (
        <div className={`grid gap-3 ${tvMode ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
          {displayPhotos.map((photo, index) => (
            <div
              key={photo.url}
              className={`photo-card relative rounded-xl overflow-hidden bg-gray-800 ${
                index === 0 ? 'ring-2 ring-yellow-400' : ''
              }`}
              style={{ aspectRatio: '1' }}
            >
              <Image
                src={photo.url}
                alt={`Party photo ${index + 1}`}
                fill
                className="object-cover"
                sizes={tvMode ? '(max-width: 1920px) 33vw' : '(max-width: 768px) 50vw, 33vw'}
              />
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-black px-2 py-1 rounded-full">
                  {lang === 'fr' ? 'NOUVEAU!' : 'NEW!'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length > (tvMode ? 6 : 20) && (
        <div className="text-center mt-6 text-gray-500">
          +{photos.length - (tvMode ? 6 : 20)} {lang === 'fr' ? 'autres photos' : 'more photos'}
        </div>
      )}
    </div>
  );
}
