"use client";

import Image from "next/image";
import type { RefObject } from "react";

type UntitledSaveDialogProps = {
  fileName: string;
  saveBtnRef: RefObject<HTMLButtonElement | null>;
  onSave: () => void;
  onDontSave: () => void;
  onCancel: () => void;
};

const dialogBtnClass =
  "border border-black px-5 py-2.5 text-[16px] leading-4 text-black transition-opacity hover:opacity-80";

export function UntitledSaveDialog({
  fileName,
  saveBtnRef,
  onSave,
  onDontSave,
  onCancel,
}: UntitledSaveDialogProps) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-4 py-6"
      style={{ zIndex: 100 }}
      role="presentation"
    >
      <div
        className="untitled-dialog-pop pointer-events-auto w-full max-w-[520px] border border-black bg-[#e5e5e5] px-4 py-5 sm:px-6 sm:py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="untitled-save-dialog-desc"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "var(--font-planc), serif" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-3">
          <div className="relative mx-auto h-[88px] w-[94px] shrink-0 sm:mx-0">
            <Image
              src="/games/untitled-project/warning-icon.svg"
              alt=""
              fill
              className="object-contain"
              sizes="94px"
              draggable={false}
            />
            <span
              className="absolute inset-0 flex items-center justify-center pt-2 text-[56px] leading-none text-black"
              aria-hidden
            >
              !
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p
              id="untitled-save-dialog-desc"
              className="text-[16px] leading-[20px] text-black"
            >
              Do you want to save changes to &ldquo;{fileName}&rdquo; before
              closing?
              <br />
              <br />
              If you don&apos;t save now, your changes may be permanently lost.
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onDontSave}
                className={dialogBtnClass}
                style={{ backgroundColor: "#e5e5e5" }}
              >
                Don&apos;t Save
              </button>
              <button
                type="button"
                onClick={onCancel}
                className={dialogBtnClass}
                style={{ backgroundColor: "#e5e5e5" }}
              >
                Cancel
              </button>
              <button
                ref={saveBtnRef}
                type="button"
                onClick={onSave}
                className={dialogBtnClass}
                style={{ backgroundColor: "#949494" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
