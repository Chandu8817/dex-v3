import { cn } from '@/lib/utils';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxDecimals?: number;
}

export function AmountInput({
  value,
  onChange,
  placeholder = '0.0',
  disabled = false,
  className,
  maxDecimals = 18,
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Allow empty string
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    // Only allow numbers and one decimal point
    inputValue = inputValue.replace(/[^0-9.]/g, '');
    
    // Only allow one decimal point
    const parts = inputValue.split('.');
    if (parts.length > 2) {
      inputValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places
    if (parts[1]?.length > maxDecimals) {
      inputValue = parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
    
    onChange(inputValue);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full bg-transparent text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none",
        disabled && "cursor-not-allowed opacity-70",
        className
      )}
    />
  );
}
