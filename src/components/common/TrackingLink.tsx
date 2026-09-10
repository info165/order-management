import React from 'react';
import { ExternalLink, Truck } from 'lucide-react';

interface TrackingLinkProps {
  courierName?: string;
  docketNumber?: string;
  className?: string;
  compact?: boolean;
}

export const TrackingLink: React.FC<TrackingLinkProps> = ({ courierName = '', docketNumber, className = '', compact = false }) => {
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

  return (
    <div
      className={`inline-flex items-center ${
        compact ? 'gap-1 font-mono text-[11px] px-1.5 py-0.5' : 'gap-1.5 font-mono text-xs px-2 py-0.5'
      } font-medium text-blue-700 bg-blue-50/90 rounded border border-blue-200 hover:bg-blue-100 transition-colors whitespace-nowrap ${className}`}
    >
      <Truck className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-600 shrink-0`} />
      <span className={`truncate select-all ${compact ? 'max-w-[110px]' : 'max-w-[140px]'}`} title={courierName ? `${courierName}: ${docketNumber}` : docketNumber}>
        {docketNumber}
      </span>
      {targetUrl ? (
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Track via ${courierName || 'Courier'}`}
          className="text-blue-600 hover:text-blue-900 ml-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
        </a>
      ) : null}
    </div>
  );
};
