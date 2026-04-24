interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  fullWidth?: boolean;
}

export default function GlowButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  type = 'button',
  className = '',
  fullWidth,
}: Props) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  }[size];

  const variantClasses = {
    primary: 'btn-glow text-white font-semibold',
    secondary: 'bg-white/5 border border-white/10 text-white/90 hover:bg-white/8 hover:border-purple-400/30 font-medium transition-all duration-200',
    ghost: 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5 font-medium transition-all duration-200',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-full inline-flex items-center justify-center gap-2
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
        ${sizeClasses} ${variantClasses}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
