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
    maximumFractionDigits: (showDecimals || hasFractions) ? 2 : 0,
    minimumFractionDigits: (showDecimals && hasFractions) ? 2 : 0
  }).format(amount);
}

export const CurrencyFormatter: React.FC<CurrencyProps> = ({ amount, className = '', showDecimals = false }) => {
  return <span className={`font-mono ${className}`}>{formatINR(amount, showDecimals)}</span>;
};
