/**
 * Icon image with graceful fallback: if the JPG fails to load, the
 * fallback node (initials placeholder, or nothing) renders instead.
 * Decorative only — accessible names live on the parent control.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';

export interface IconImgProps {
  src: string;
  className: string;
  fallback: ReactNode;
}

export function IconImg({ src, className, fallback }: IconImgProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      className={className}
      alt=""
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
