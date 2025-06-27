import React from 'react';

const LsrLegend = ({ items }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="leaflet-control leaflet-bottom leaflet-right" style={{ pointerEvents: 'auto', zIndex: 1000 }}>
      <div className="bg-white bg-opacity-85 p-2.5 rounded-md shadow-lg max-w-xs">
        <h4 className="font-semibold text-sm mb-1.5 text-gray-800 border-b pb-1">LSR Legend</h4>
        <ul className="list-none p-0 m-0 space-y-1">
          {items.map((item, index) => (
            <li key={index} className="flex items-center text-xs text-gray-700">
              <i 
                className={`${item.iconClass} mr-2 w-4 text-center`} 
                style={{ 
                  color: item.color, 
                  fontSize: '16px',
                  textShadow: item.textShadow ? '0 0 3px rgba(0,0,0,0.7)' : 'none' 
                }}
              ></i>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LsrLegend;
