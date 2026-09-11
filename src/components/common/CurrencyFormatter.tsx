import React from 'react';

interface CurrencyProps {
  amount: number;
  className?: string;
  showDecimals?: boolean;
}

export function formatINR(amount: number, showDecimals = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  const hasFractions = amount % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    // Up to 5 decimal places - Intl.NumberFormat only ever shows as many as
    // the value actually has (down to the minimum below), so a normal whole-
    // rupee or 2-decimal amount displays exactly as before; only a value
    // that genuinely carries more precision (e.g. a payment entered as
    // 1234.12345) now shows all of it instead of being silently rounded
    // away to 2 decimals for display.
    maximumFractionDigits: (showDecimals || hasFractions) ? 5 : 0,
    minimumFractionDigits: showDecimals ? 2 : (hasFractions ? 2 : 0)
  }).format(amount);
}

export const CurrencyFormatter: React.FC<CurrencyProps> = ({ amount, className = '', showDecimals = false }) => {
  return <span className={`font-mono ${className}`}>{formatINR(amount, showDecimals)}</span>;
};
