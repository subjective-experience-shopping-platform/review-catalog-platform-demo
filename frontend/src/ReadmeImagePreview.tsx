import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type ReadmePreviewImage = { src: string; alt: string; opener: HTMLImageElement };

export function ReadmeImagePreview({ image, onClose }: { image: ReadmePreviewImage; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const element = dialog.current;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      // React removes the modal before passive cleanup finishes; restore focus
      // after the browser has released the background's modal inert state.
      queueMicrotask(() => {
        if (image.opener.isConnected && !document.querySelector(".readme-image-preview[open]")) image.opener.focus({ preventScroll: true });
      });
    };
  }, [image]);

  return createPortal(
    <dialog ref={dialog} className="readme-image-preview" aria-label={`${image.alt} 확대 보기`} aria-describedby="readme-preview-help" onClick={onClose} onCancel={event => { event.preventDefault(); onClose(); }}>
      <button type="button" className="readme-preview-close" onClick={onClose} aria-label="이미지 확대 닫기">×</button>
      <img src={image.src} alt={image.alt} />
      <p id="readme-preview-help">이미지나 배경을 클릭하거나 Esc를 누르면 닫힙니다.</p>
    </dialog>,
    document.body,
  );
}
