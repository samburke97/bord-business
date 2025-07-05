// components/ui/TextInput.tsx - FIXED WITH onEnter SUPPORT
"use client";

import React, {
  ChangeEvent,
  ReactNode,
  useState,
  forwardRef,
  InputHTMLAttributes,
  KeyboardEvent,
} from "react";
import styles from "./TextInput.module.css";

interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "prefix"> {
  id: string;
  label?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onEnter?: () => void; // ADD THIS PROP
  error?: string | null;
  showCharCount?: boolean;
  labelClassName?: string;
  inputClassName?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  prefix?: string;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      id,
      label,
      value,
      onChange,
      onEnter, // ADD THIS PROP
      placeholder = "",
      disabled = false,
      error = null,
      maxLength,
      showCharCount = false,
      className = "",
      inputClassName = "",
      labelClassName = "",
      leftIcon,
      rightIcon,
      type = "text",
      required = false,
      autoFocus = false,
      name,
      prefix,
      step,
      min,
      ...rest
    },
    ref
  ) => {
    const [isInputFocused, setIsInputFocused] = useState(false);

    const displayValue =
      type === "number" &&
      (value === "0" || parseFloat(value) === 0) &&
      isInputFocused
        ? ""
        : value;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsInputFocused(true);
      // Call original onFocus if it exists in ...rest
      if (rest.onFocus) {
        rest.onFocus(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsInputFocused(false);
      // Call original onBlur if it exists in ...rest
      if (rest.onBlur) {
        rest.onBlur(e);
      }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (maxLength && e.target.value.length > maxLength) {
        return;
      }
      onChange(e);
    };

    // ADD THIS HANDLER
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onEnter) {
        e.preventDefault();
        onEnter();
      }
      // Call original onKeyDown if it exists in ...rest
      if (rest.onKeyDown) {
        rest.onKeyDown(e);
      }
    };

    return (
      <div className={`${styles.container} ${className}`}>
        {label && (
          <label htmlFor={id} className={`${styles.label} ${labelClassName}`}>
            {label}
            {required && error && (
              <span className={styles.required}>*</span>
            )}{" "}
          </label>
        )}

        <div
          className={`${styles.inputWrapper} ${error ? styles.hasError : ""}`}
        >
          {leftIcon && <div className={styles.leftIcon}>{leftIcon}</div>}
          {prefix && <span className={styles.prefix}>{prefix}</span>}

          <input
            {...rest}
            id={id}
            name={name || id}
            type={type}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown} // ADD THIS LINE
            className={`${styles.input} ${inputClassName} ${
              type === "number" ? styles.noSpinner : ""
            }`}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            autoFocus={autoFocus}
            required={required}
            step={step}
            min={min}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />

          {rightIcon && <div className={styles.rightIcon}>{rightIcon}</div>}

          {showCharCount && maxLength && (
            <div className={styles.charCount}>
              {value ? value.length : 0}/{maxLength}
            </div>
          )}
        </div>

        {error && (
          <p id={`${id}-error`} className={styles.errorText}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

// Add display name for better debugging in React DevTools
TextInput.displayName = "TextInput";

export default TextInput;
