"use client";

export function RoleSelect({
  defaultValue,
  disabled,
}: {
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <select
      name="role"
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
    >
      <option value="staff">Staff</option>
      <option value="admin">Admin</option>
    </select>
  );
}
