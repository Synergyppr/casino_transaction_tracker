"use client";
import { useEffect, useRef } from "react";

export function Modal({
  children,
  onClose,
  onEscape
}: {
  children: React.ReactNode;
  onClose?: () => void;
  onEscape?: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      const modals = document.querySelectorAll("[data-app-modal]");
      if (modals[modals.length - 1] !== overlayRef.current) return;
      const close = onEscape || onClose;
      if (!close) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onEscape]);

  return (
    <div ref={overlayRef} data-app-modal role="dialog" aria-modal="true"
      className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded w-full max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
