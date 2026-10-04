'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Lang } from '@/lib/types';

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
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaderName', currentUser?.name || 'guest');

      const res = await fetch('/party/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPhotos(prev => [{ url: data.url, uploadedAt: Date.now(), uploader: currentUser?.name }, ...prev]);
        setFlash(lang === 'fr' ? 'Photo ajoutée! 📸' : 'Photo uploaded! 📸');
        setTimeout(() => setFlash(null), 2000);
      } else {
        setFlash(lang === 'fr' ? 'Erreur — réessayez! 😅' : 'Upload failed. Try again! 😅');
        setTimeout(() => setFlash(null), 3000);
      }
    } catch {
      setFlash(lang === 'fr' ? 'Erreur — réessayez! 😅' : 'Upload failed. Try again! 😅');
      setTimeout(() => setFlash(null), 3000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      <p className="text-center text-gray-400 mb-6">
        {lang === 'fr' ? 'Partagez vos moments de fête!' : 'Share your party moments!'}
      </p>

      {/* Upload button */}
      {!tvMode && (
        <div className="mb-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`inline-flex items-center gap-3 cursor-pointer py-5 px-10 rounded-2xl font-black text-2xl transition-all ${
              uploading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]'
            }`}
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
