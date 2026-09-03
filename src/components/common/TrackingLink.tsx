import React from 'react';
import { ExternalLink, Truck } from 'lucide-react';

interface TrackingLinkProps {
  courierName?: string;
  docketNumber?: string;
  className?: string;
}

export const TrackingLink: React.FC<TrackingLinkProps> = ({ courierName = '', docketNumber, className = '' }) => {
  if (!docketNumber || !docketNumber.trim()) {
    return <span className="text-slate-400 italic text-xs">Tracking Pending</span>;
  }

  const cleanDocket = docketNumber.split(/[,/]/)[0].trim();
  const cName = courierName.toLowerCase();

  let targetUrl = '';
  if (cName.includes('delhivery')) {
    targetUrl = `https://www.delhivery.com/track/package/${cleanDocket}`;
  } else if (cName.includes('post') || cleanDocket.endsWith('IN')) {
    targetUrl = `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  } else if (cName.includes('dtdc')) {
    targetUrl = `https://www.dtdc.in/tracking.asp`;
  } else if (cName.includes('blue')) {
    targetUrl = `https://www.bluedart.com/tracking`;
  }

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors ${className}`}>
      <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      <span className="truncate max-w-[140px] select-all">{docketNumber}</span>
      {targetUrl ? (
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Track via ${courierName || 'Courier'}`}
          className="text-blue-600 hover:text-blue-900 ml-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : null}
    </div>
  );
};
