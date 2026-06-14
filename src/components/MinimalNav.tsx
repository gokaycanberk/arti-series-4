"use client";

interface MinimalNavProps {
  onMenuClick?: () => void;
}

export default function MinimalNav({ onMenuClick }: MinimalNavProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4">
      <button
        onClick={onMenuClick}
        className="flex flex-col gap-[5px] cursor-pointer"
        aria-label="Menu"
      >
        <span
          className="block h-[3px] w-[28px] rounded-sm"
          style={{ backgroundColor: "#1A1A1A" }}
        />
        <span
          className="block h-[3px] w-[28px] rounded-sm"
          style={{ backgroundColor: "#1A1A1A" }}
        />
        <span
          className="block h-[3px] w-[20px] rounded-sm"
          style={{ backgroundColor: "#1A1A1A" }}
        />
      </button>
    </div>
  );
}
