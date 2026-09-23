import React, { useState } from 'react';
import { ExternalLink, Truck, Copy, Check } from 'lucide-react';

interface TrackingLinkProps {
  courierName?: string;
  docketNumber?: string;
  className?: string;
  compact?: boolean;
}

export const TrackingLink: React.FC<TrackingLinkProps> = ({ courierName = '', docketNumber, className = '', compact = false }) => {
  // Briefly swaps the copy icon for a checkmark after a successful copy, then
  // reverts on its own - purely local UI state, nothing saved anywhere.
  const [copied, setCopied] = useState(false);

  if (!docketNumber || !docketNumber.trim()) {
    return <span className={`text-slate-400 italic whitespace-nowrap ${compact ? 'text-[11px]' : 'text-xs'}`}>Tracking Pending</span>;
  }

  const cleanDocket = docketNumber.split(/[,/]/)[0].trim();
  const cName = courierName.toLowerCase();

  let targetUrl = '';
  if (cName.includes('delhivery')) {
    targetUrl = `https://www.delhivery.com/track-v2/lr/${cleanDocket}`;
  } else if (cName.includes('post') || cleanDocket.endsWith('IN')) {
    targetUrl = `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  } else if (cName.includes('dtdc')) {
    targetUrl = `https://www.dtdc.in/tracking.asp`;
  } else if (cName.includes('blue')) {
    targetUrl = `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${cleanDocket}`;
  }

  const badgeClassName = `inline-flex items-center ${
    compact ? 'gap-1 font-mono text-[11px] px-1.5 py-0.5' : 'gap-1.5 font-mono text-xs px-2 py-0.5'
  } font-medium text-blue-700 bg-blue-50/90 rounded border border-blue-200 whitespace-nowrap ${className}`;

  const docketSpan = (
    <span className={`truncate ${targetUrl ? '' : 'select-all'} ${compact ? 'max-w-[110px]' : 'max-w-[140px]'}`} title={courierName ? `${courierName}: ${docketNumber}` : docketNumber}>
      {docketNumber}
    </span>
  );

  // Copies the full stored docket number (not the cleaned/truncated display
  // value), since that's what someone pasting it into a courier's own site
  // would actually need. Kept as its own sibling control, never nested
  // inside the <a> below - a <button> inside an <a> is invalid HTML and
  // unreliable across browsers, so the copy control sits next to the link
  // instead of inside it.
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard
      .writeText(docketNumber)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const copyButton = (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy docket number'}
      className={`shrink-0 inline-flex items-center justify-center rounded-md border transition-all ${
        compact ? 'p-1' : 'p-1.5'
      } ${
        copied
          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
          : 'bg-white border-blue-300 text-blue-700 shadow-sm hover:bg-blue-600 hover:border-blue-600 hover:text-white hover:shadow-md active:scale-95'
      }`}
    >
      {copied ? (
        <Check className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2.75} />
      ) : (
        <Copy className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2.5} />
      )}
    </button>
  );

  if (!targetUrl) {
    // No recognized courier - nothing to navigate to, so this stays plain
    // (non-clickable) text rather than a link that goes nowhere.
    return (
      <div className={badgeClassName}>
        <Truck className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-600 shrink-0`} />
        {docketSpan}
        {copyButton}
      </div>
    );
  }

  // The link wraps the truck icon, docket text and external-link icon -
  // clicking any of those opens the real tracking page, same as before. The
  // copy button is a separate control right after it, inside the same
  // visual badge, so copying never triggers navigation and never needs
  // stopPropagation tricks against the link itself.
  return (
    <span className={badgeClassName}>
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`Track via ${courierName || 'Courier'}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 hover:text-blue-900 transition-colors cursor-pointer min-w-0"
      >
        <Truck className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-600 shrink-0`} />
        {docketSpan}
        <ExternalLink className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} shrink-0`} />
      </a>
      {copyButton}
    </span>
  );
};
