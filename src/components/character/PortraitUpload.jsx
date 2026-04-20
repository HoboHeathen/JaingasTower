import React, { useRef, useState } from 'react';
import { Camera, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PortraitUpload({ portraitUrl, onUpload, size = 'md' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const sizeClasses = size === 'lg'
    ? 'w-20 h-20 rounded-2xl'
    : 'w-12 h-12 rounded-xl';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpload(file_url);
    setUploading(false);
  };

  return (
    <div
      className={`relative ${sizeClasses} bg-primary/10 flex items-center justify-center cursor-pointer group overflow-hidden shrink-0`}
      onClick={() => inputRef.current?.click()}
      title="Upload portrait"
    >
      {portraitUrl ? (
        <img src={portraitUrl} alt="Portrait" className="w-full h-full object-cover" />
      ) : (
        <User className={size === 'lg' ? 'w-8 h-8 text-primary' : 'w-6 h-6 text-primary'} />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading
          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Camera className="w-4 h-4 text-white" />
        }
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}