import { useState } from "react";

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Enter password",
  required = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-field">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />

      <button
  type="button"
  className="password-toggle"
  onClick={() => setShowPassword((prev) => !prev)}
  aria-label={showPassword ? "Hide password" : "Show password"}
  title={showPassword ? "Hide password" : "Show password"}
>
  👁️
</button>
    </div>
  );
}