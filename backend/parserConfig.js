module.exports = {
  // CAP Alert Filtering
  allowedCapEvents: [
    'Tornado Warning',
    'Severe Thunderstorm Warning',
    'Flash Flood Warning',
    'Flood Warning',
    'Special Marine Warning',
    'Tornado Watch',
    'Severe Thunderstorm Watch',
    'Flash Flood Watch',
    'Flood Watch',
    'Special Weather Statement', // Explicitly allow SPS by event name
    'Flood Advisory',          // Explicitly allow Flood Advisory by event name
    'Marine Weather Statement',  // Allow Marine Weather Statements
    // Add other event names as needed, e.g., 'Hurricane Warning', 'Winter Storm Warning'
  ],
  allowedCapSeverities: [
    // 'Extreme', // Typically for very high-impact warnings
    // 'Severe',  // Warnings
    // 'Moderate',// Watches, some Advisories/Statements
    // 'Minor',   // Some Advisories/Statements
    // We will primarily rely on event name or VTEC code for now, 
    // but severities can be used for broader filtering if desired.
  ],

  // Regex to find a VTEC string in a message
  vtec_regexp: /\/([A-Z0-9]\.[A-Z]{3}\.[A-Z0-9]{2}\.[A-Z]{2}\.\w\.[0-9]{4}\.[0-9]{6}T[0-9]{4}Z-[0-9]{6}T[0-9]{4}Z)\//,
  // Example: /O.NEW.KDMX.SV.W.0030.240521T2254Z-240521T2330Z/

  // Regex for the start of a UGC string
  ugc_start_regexp: /[A-Z]{2}[CZ][0-9]{3}/,
  // Example: IAC001-212330Z

  // VTEC Event Codes (Phenomena)
  event_codes: {
    'SV': 'Severe Thunderstorm',
    'TO': 'Tornado',
    'FF': 'Flash Flood',
    'FA': 'Flood', // Areal Flood
    'FL': 'Flood', // River Flood
    'MA': 'Marine',
    'HU': 'Hurricane',
    'TR': 'Tropical Storm',
    'WI': 'Wind',
    'BZ': 'Blizzard',
    'WS': 'Winter Storm',
    'WW': 'Winter Weather',
    'SQ': 'Tornado', // Squall Line Tornado Warning
    'DS': 'Dust Storm',
  },

  // VTEC Event Types (Significance)
  event_types: {
    'W': 'Warning',
    'A': 'Watch',
    'Y': 'Advisory',
    'S': 'Statement',
    'F': 'Forecast',
    'O': 'Outlook',
    'N': 'Synopsis',
  },

  // VTEC Status Signatures (Action)
  status_signatures: {
    'NEW': 'New',
    'CON': 'Continued',
    'EXP': 'Expired',
    'CAN': 'Cancelled',
    'UPG': 'Upgraded',
    'EXT': 'Extended',
    'COR': 'Corrected',
    'ROU': 'Routine',
  },
};
