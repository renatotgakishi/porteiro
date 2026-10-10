"use client";

type Props = {
  permKey: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
};

export function PermissionItem({
  permKey,
  description,
  checked,
  onToggle,
}: Props) {
  return (
    <label className="flex items-start gap-3 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 rounded border-stone-300"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono font-medium truncate">{permKey}</p>
        <p className="text-xs text-stone-500 mt-0.5">{description}</p>
      </div>
      <div
        onClick={onToggle}
        className={`w-8 h-5 rounded-full p-0.5 transition flex items-center ${
          checked
            ? "bg-stone-900 dark:bg-white justify-end"
            : "bg-stone-200 dark:bg-stone-700 justify-start"
        }`}
      >
        <div className="w-4 h-4 rounded-full bg-white dark:bg-black shadow" />
      </div>
    </label>
  );
}