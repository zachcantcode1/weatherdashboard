const config = require('./parserConfig.js');
const { parseStringPromise } = require('xml2js');
const he = require('he');

/**
 * Parses a VTEC string into a structured object.
 * @param {string} vtecString - The raw VTEC string (e.g., O.NEW.KIND.SV.W.0123.240529T2345Z-240530T0015Z)
 * @returns {object|null} A structured Vtec object or null if parsing fails.
 */
function parseExtractedVtecString(vtecString) {
    if (!vtecString || typeof vtecString !== 'string') return null;

    const parts = vtecString.split('.');
    if (parts.length < 7) {
        // console.warn(`VTEC string has too few parts: ${vtecString}`);
        return null;
    }

    // parts[0] is VTEC Action (e.g., "/O" or "O")
    // parts[1] is VTEC Status (e.g., "NEW")
    // parts[2] is Office ID (e.g., "KOFF")
    // parts[3] is Phenomenon Code (e.g., "PH")
    // parts[4] is Significance Code (e.g., "S")
    // parts[5] is ETN (e.g., "0001")
    // parts[6] is Times (e.g., "YYMMDDTHHMMZ-YYMMDDTHHMMZ/")

    let vtecActionCode = parts[0];
    if (vtecActionCode.startsWith('/')) {
        vtecActionCode = vtecActionCode.substring(1);
    }

    const vtecStatusCode = parts[1];
    const officeId = parts[2];
    const phenomenonCode = parts[3];
    const significanceCode = parts[4];
    const etn = parts[5];
    const timesCombined = parts[6];

    const timeParts = timesCombined.split('-');
    if (timeParts.length < 2) {
        // console.warn(`VTEC time part is malformed: ${timesCombined}`);
        return null;
    }

    const startTimeRaw = timeParts[0];
    const endTimeRaw = timeParts[1]; // This might have a trailing '/' which formatVtecDate handles

    const phenomenon = config.event_codes[phenomenonCode] || phenomenonCode;
    const significance = config.event_types[significanceCode] || significanceCode;
    const actionStatus = config.status_signatures[vtecStatusCode] || vtecStatusCode;

    return {
        full: vtecString,
        vtecActionCode: vtecActionCode,
        vtecStatusCode: vtecStatusCode,
        action: actionStatus, // Human-readable VTEC status (e.g., "New")
        office: officeId,
        phenomenonCode: phenomenonCode,
        phenomenon: phenomenon,
        significanceCode: significanceCode,
        significance: significance,
        productType: `${phenomenon} ${significance}`,
        etn: etn,
        startTime: formatVtecDate(startTimeRaw),
        expires: formatVtecDate(endTimeRaw),
    };
}

/**
 * Formats a VTEC date part into a standard ISO 8601 string.
 * @param {string} vtecDateStr - The VTEC date string (e.g., 240529T2345Z)
 * @returns {string} Formatted date string (e.g., 2024-05-29T23:45:00Z).
 */
function formatVtecDate(vtecDateStrInput) {
    if (!vtecDateStrInput) return vtecDateStrInput;
    let vtecDateStr = String(vtecDateStrInput);
    const zIndex = vtecDateStr.indexOf('Z');
    if (zIndex !== -1) {
        vtecDateStr = vtecDateStr.substring(0, zIndex + 1);
    }

    if (vtecDateStr.length !== 13 || vtecDateStr[6] !== 'T' || vtecDateStr[12] !== 'Z') {
        // console.warn(`Invalid VTEC date format: ${vtecDateStrInput}`);
        return vtecDateStrInput; 
    }
    const year = `20${vtecDateStr.substring(0, 2)}`;
    const month = vtecDateStr.substring(2, 4);
    const day = vtecDateStr.substring(4, 6);
    const hour = vtecDateStr.substring(7, 9);
    const minute = vtecDateStr.substring(9, 11);
    return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
}

/**
 * Tries to find the human-readable affected area from the raw alert text.
 * @param {string} rawText - The full raw alert text.
 * @returns {string} The affected area description or a fallback string.
 */
function findAffectedArea(rawText) {
    const lines = rawText.split('\n');
    
    // Strategy 1: Find the line after the all-caps product headline.
    let productLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Warning') || line.includes('Watch') || line.includes('Advisory')) {
            if (line === line.toUpperCase() && line.length < 80) {
                productLineIndex = i;
                break;
            }
        }
    }

    if (productLineIndex !== -1 && productLineIndex + 1 < lines.length) {
        let affectedArea = lines[productLineIndex + 1].trim();
        // This line is often a list of counties. Let's clean it up.
        if (affectedArea && !affectedArea.startsWith('*')) {
             affectedArea = affectedArea.replace(/\.\.\.$/, '').trim(); // remove trailing ...
             if (affectedArea) return affectedArea;
        }
    }

    // Strategy 2: Fallback to the * WHERE... line.
    const whereMatch = rawText.match(/\* WHERE\.\.\.(.+)/);
    if (whereMatch && whereMatch[1]) {
        return whereMatch[1].trim();
    }
    
    return "Affected area not found";
}

/**
 * The main parser function. It takes raw alert text and returns a structured object
 * if the alert is a valid and desired type (Warning or Watch).
 * @param {string} rawText - The full raw text of the weather alert.
 * @returns {object|null} A structured alert object or null.
 */
async function parseAlert(data, isCapXml = false) { // Make async for xml2js
    if (!data || typeof data !== 'string') {
        return null;
    }

    if (isCapXml) {
        try {
            // First parse: to get the content of the <x nwws-oi> element
            const outerParseResult = await parseStringPromise(data, {
                explicitArray: false // Makes accessing elements easier
            });

            if (!outerParseResult || !outerParseResult.x || typeof outerParseResult.x._ !== 'string') {
                console.error('Error extracting CAP XML string from <x nwws-oi> element. Structure:', outerParseResult);
                if (data) console.error('Original <x nwws-oi> data snippet for debug:', data.substring(0, 500));
                return null;
            }

            const rawContentFromXElement = outerParseResult.x._;
            const decodedContent = he.decode(rawContentFromXElement);
            // console.log('[DEBUG] Decoded content from <x> element (first 500 chars):', decodedContent.substring(0, 500));

            let actualCapXmlString;

            const xmlDeclIndex = decodedContent.indexOf('<?xml');
            if (xmlDeclIndex !== -1) {
                actualCapXmlString = decodedContent.substring(xmlDeclIndex).trim();
            } else {
                const alertTagIndex = decodedContent.indexOf('<alert');
                if (alertTagIndex !== -1) {
                    actualCapXmlString = decodedContent.substring(alertTagIndex).trim();
                } else {
                    console.error('CAP XML declaration (<?xml) or <alert> tag not found in decoded <x nwws-oi> content.');
                    console.error('Decoded content snippet for debugging:', decodedContent.substring(0, 500));
                    return null;
                }
            }

            console.log('[DEBUG] Attempting to parse cleaned CAP XML string (first 200 chars):', actualCapXmlString.substring(0, 200));

            // Second parse: parse the extracted and cleaned CAP XML string
            const result = await parseStringPromise(actualCapXmlString, {
                explicitArray: false,
                tagNameProcessors: [name => name.replace(/^cap:/, '')] // Remove 'cap:' prefix for the CAP alert structure
            });

            console.log('[DEBUG] Result of inner parse (first 1000 chars of JSON):', JSON.stringify(result, null, 2).substring(0, 1000)); // Log snippet of parsed object

            // Now, the rest of the logic uses 'result' which is the parsed CAP <alert>
            if (!result || !result.alert || !result.alert.info) {
                console.error('Invalid CAP XML structure after inner parsing. Parsed object:', JSON.stringify(result, null, 2).substring(0,1000));
                console.error('Inner CAP XML string attempted (first 500 chars):', actualCapXmlString.substring(0, 500));
                return null;
            }

            const info = Array.isArray(result.alert.info) ? result.alert.info[0] : result.alert.info;
            if (!info) {
                console.error('CAP alert.info is missing');
                return null;
            }

            const capEventName = info.event;
            const severity = info.severity;

            // Filtering based on CAP event name or severity (add more to parserConfig.js as needed)
            const allowedEvents = config.allowedCapEvents || [];
            const allowedSeverities = config.allowedCapSeverities || [];
            const isAllowedEvent = allowedEvents.includes(capEventName);
            const isAllowedSeverity = allowedSeverities.includes(severity);

            let vtecDetails = null;
            let vtecString = null;
            if (info.parameter) {
                const parameters = Array.isArray(info.parameter) ? info.parameter : [info.parameter];
                const vtecParam = parameters.find(p => p.valueName === 'VTEC');
                if (vtecParam) {
                    vtecString = vtecParam.value;
                    vtecDetails = parseExtractedVtecString(vtecString); // Use existing VTEC parser
                }
            }

            // Determine if we should process this alert
            // Priority: VTEC significance if available, then CAP event name, then CAP severity
            let shouldProcess = false;
            if (vtecDetails) {
                const sig = vtecDetails.full.split('.')[4]; // O.NEW.KDMX.SV.W.0030... -> W
                if (['W', 'A', 'Y', 'S'].includes(sig)) { // Warning, Watch, Advisory, Statement
                    shouldProcess = true;
                }
            } else if (isAllowedEvent || isAllowedSeverity) {
                shouldProcess = true;
            }
            
            // For Special Weather Statements (SPS) from VTEC, ensure they are processed
            if (vtecDetails && vtecDetails.productType && vtecDetails.productType.includes('Special Weather Statement')) {
                shouldProcess = true;
            }
            // Also allow CAP events explicitly named 'Special Weather Statement'
            if (capEventName === 'Special Weather Statement') {
                shouldProcess = true;
            }


            let geometry = null;
            let states = new Set();
            let affectedAreaDesc = 'N/A';

            if (info.area) {
                const areas = Array.isArray(info.area) ? info.area : [info.area];
                if (areas.length > 0 && areas[0].areaDesc) {
                    affectedAreaDesc = areas[0].areaDesc;
                }

                for (const areaItem of areas) {
                    // Geometry extraction (Polygon/Circle)
                    if (!geometry) { // Only take the first geometry found
                        if (areaItem.polygon && typeof areaItem.polygon === 'string') {
                            const coordPairs = areaItem.polygon.split(' ');
                            const coordinates = coordPairs.map(pair => {
                                const parts = pair.split(',');
                                return [parseFloat(parts[0]), parseFloat(parts[1])];
                            });
                            geometry = { type: 'Polygon', coordinates: [coordinates] };
                        } else if (areaItem.circle && typeof areaItem.circle === 'string') {
                            const parts = areaItem.circle.split(' ');
                            if (parts.length === 2) {
                                const centerPair = parts[0].split(',');
                                const center = [parseFloat(centerPair[0]), parseFloat(centerPair[1])];
                                const radiusKm = parseFloat(parts[1]);
                                geometry = { type: 'Circle', coordinates: center, radius: radiusKm * 1000 };
                            }
                        }
                    }

                    // State extraction from UGC codes
                    if (areaItem.geocode) {
                        const geocodes = Array.isArray(areaItem.geocode) ? areaItem.geocode : [areaItem.geocode];
                        geocodes.forEach(geo => {
                            if (geo.valueName === 'UGC' && geo.value) {
                                const ugcValues = Array.isArray(geo.value) ? geo.value : [geo.value];
                                ugcValues.forEach(ugc => {
                                    if (typeof ugc === 'string' && ugc.length >= 2) {
                                        states.add(ugc.substring(0, 2));
                                    }
                                });
                            }
                        });
                    }
                }
            }

            if (!shouldProcess) {
                console.log(`CAP Event '${capEventName}' (Severity: ${severity}, VTEC: ${vtecString || 'N/A'}) not in allowed list or not a W/A/Y/S. Skipping.`);
                return null;
            }

            let fullDescription = info.description || '';
            if (info.instruction) {
                fullDescription += `\n\nINSTRUCTIONS:\n${info.instruction}`;
            }

            const alert = {
                id: result.alert.identifier || Date.now().toString(),
                productType: capEventName,
                affectedArea: affectedAreaDesc,
                headline: info.headline || 'N/A',
                description: info.description || 'N/A', // Used for tooltip
                expires: info.expires ? new Date(info.expires).toISOString() : (vtecDetails ? vtecDetails.expires : 'N/A'),
                rawText: fullDescription.trim() || 'No detailed text available.', // Used for dialog
                vtecString: vtecString || 'N/A',
                geometry: geometry,
                states: Array.from(states),
            };
            return alert;

        } catch (err) {
            console.error('Error parsing CAP XML:', err);
            console.error('Problematic CAP XML string snippet:', data.substring(0, 500));
            return null;
        }
    } else {
        // Existing VTEC-only parsing logic (from raw plain text)
        const vtecMatch = data.match(config.vtec_regexp);
        if (!vtecMatch || !vtecMatch[1]) {
            return null;
        }
        const vtecString = vtecMatch[1];
        const vtecData = parseExtractedVtecString(vtecString);

        if (!vtecData || !isWarningOrWatch(vtecData)) {
            return null;
        }

        const affectedArea = extractAffectedArea(data, vtecString);

        return {
            id: vtecString, // Use VTEC string as a unique ID for these alerts
            productType: vtecData.productType,
            affectedArea: affectedArea,
            headline: `${vtecData.productType} for ${affectedArea}`, // Placeholder headline
            description: data, // Full raw text as description
            expires: vtecData.expires,
            rawText: data,
            vtecString: vtecString
        };
    }
}

/**
 * Parses a VTEC string into a structured object.
 * @param {string} vtecString - The raw VTEC string (e.g., O.NEW.KIND.SV.W.0123.240529T2345Z-240530T0015Z)
 * @returns {object|null} A structured Vtec object or null if parsing fails.
 */
function parseExtractedVtecString(vtecString) {
    if (!vtecString || typeof vtecString !== 'string') {
        return null;
    }

    const parts = vtecString.split('.');
    if (parts.length < 6) {
        return null;
    }

    const productType = parts[0] + ' ' + parts[1];
    const wfo = parts[2];
    const phenomenon = parts[3];
    const significance = parts[4];
    const eventID = parts[5];
    const onset = formatVtecDate(parts[6]);
    const expires = formatVtecDate(parts[7]);

    return {
        full: vtecString,
        productType: productType,
        wfo: wfo,
        phenomenon: phenomenon,
        significance: significance,
        eventID: eventID,
        onset: onset,
        expires: expires
    };
}

/**
 * Tries to find the human-readable affected area from the raw alert text.
 * @param {string} rawText - The full raw alert text.
 * @param {string} vtecString - The VTEC string.
 * @returns {string} The affected area description or a fallback string.
 */
function extractAffectedArea(rawText, vtecString) {
    const lines = rawText.split('\n');
    
    // Strategy 1: Find the line after the all-caps product headline.
    let productLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Warning') || line.includes('Watch') || line.includes('Advisory')) {
            if (line === line.toUpperCase() && line.length < 80) {
                productLineIndex = i;
                break;
            }
        }
    }

    if (productLineIndex !== -1 && productLineIndex + 1 < lines.length) {
        let affectedArea = lines[productLineIndex + 1].trim();
        // This line is often a list of counties. Let's clean it up.
        if (affectedArea && !affectedArea.startsWith('*')) {
             affectedArea = affectedArea.replace(/\.\.\.$/, '').trim(); // remove trailing ...
             if (affectedArea) return affectedArea;
        }
    }

    // Strategy 2: Fallback to the * WHERE... line.
    const whereMatch = rawText.match(/\* WHERE\.\.\.(.+)/);
    if (whereMatch && whereMatch[1]) {
        return whereMatch[1].trim();
    }
    
    return "Affected area not found";
}

/**
 * Checks if a VTEC object is a warning or watch.
 * @param {object} vtecData - The VTEC object.
 * @returns {boolean} True if the VTEC object is a warning or watch, false otherwise.
 */
function isWarningOrWatch(vtecData) {
    return vtecData.significance === 'W' || vtecData.significance === 'A';
}

/**
 * Parses a raw VTEC text message into a structured object.
 * @param {string} rawMessageContent - The raw VTEC text message.
 * @returns {object|null} A structured alert object or null.
 */
function parseRawVtecTextMessage(rawMessageContent) {
    if (!rawMessageContent || typeof rawMessageContent !== 'string') {
        return null;
    }

    // 1. Find and parse VTEC string. This is the most reliable part.
    const vtecMatch = rawMessageContent.match(config.vtec_regexp);
    if (!vtecMatch || !vtecMatch[1]) {
        // No VTEC string found. We will ignore this message as it's not a standard alert.
        return null;
    }

    const vtecData = parseExtractedVtecString(vtecMatch[1]);
    if (!vtecData) {
        return null; // VTEC string was malformed.
    }
    
    // 2. Filter out non-essential alerts. We only want warnings and watches.
    const isWarning = vtecData.productType.includes('Warning');
    const isWatch = vtecData.productType.includes('Watch');
    if (!isWarning && !isWatch) {
        return null;
    }
    
    // 3. Find the human-readable affected area.
    const affectedArea = findAffectedArea(rawText);

    // 4. Construct the final alert object for the frontend.
    const alert = {
        id: vtecData.full, // The VTEC string is a great unique ID.
        productType: vtecData.productType,
        affectedArea: affectedArea,
        expires: vtecData.expires, // This is now a standard ISO date string.
        rawText: rawText,
    };

    return alert;
}

module.exports = { parseAlert };
