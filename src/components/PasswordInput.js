"use client";
import { useState } from "react";

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/**
 * compact={true}  → matches .adm-field input style (admin modals)
 * compact={false} → matches .fgroup input style (login / change-password / forgot-password)
 */
export default function PasswordInput({ value, onChange, placeholder, disabled, onKeyDown, autoFocus, compact }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  const isCompact = !!compact;

  const wrapperStyle = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    border: `1.5px solid ${
      focused
        ? isCompact ? "var(--blue)" : "var(--blue-mid)"
        : isCompact ? "var(--border)" : "var(--border-dark)"
    }`,
    borderRadius: isCompact ? "7px" : "9px",
    background: "#fff",
    transition: "border-color .2s",
    boxShadow: focused
      ? isCompact
        ? "0 0 0 3px rgba(26,111,196,.1)"
        : "0 0 0 3px rgba(43,130,224,.12)"
      : "none",
  };

  const inputStyle = {
    flex: 1,
    minWidth: 0,
    width: "auto",
    border: "none",
    outline: "none",
    boxShadow: "none",
    background: "transparent",
    padding: isCompact ? "10px 4px 10px 12px" : "12px 4px 12px 15px",
    fontFamily: "'Sora', sans-serif",
    fontSize: isCompact ? "14px" : "14.5px",
    color: "var(--text)",
  };

  const btnStyle = {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    background: "none",
    border: "none",
    cursor: disabled ? "default" : "pointer",
    color: "var(--text-muted)",
    opacity: disabled ? 0.5 : 1,
    alignSelf: "stretch",
  };

  return (
    <div style={wrapperStyle}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle}
        suppressHydrationWarning
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        style={btnStyle}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
