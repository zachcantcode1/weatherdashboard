import React, { useEffect, useState } from 'react';

const stateAbbreviationsToNames = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  AS: 'American Samoa', DC: 'District of Columbia', FM: 'Federated States of Micronesia',
  GU: 'Guam', MH: 'Marshall Islands', MP: 'Northern Mariana Islands', PW: 'Palau',
  PR: 'Puerto Rico', VI: 'Virgin Islands'
};

const descriptMappings = {
  'Tstm Wnd Dmg': 'Wind Damage',
  'Tstm Wnd Gst': 'Wind Gust',
  // Add other mappings here as needed
};

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Assuming shadcn/ui Card is available
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function LsrListPage() {
  const [lsrReports, setLsrReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('https://mapservices.weather.noaa.gov/vector/rest/services/obs/nws_local_storm_reports/MapServer/2/query?where=1%3D1&outFields=*&f=geojson')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.features) {
          const sortedReports = data.features
            .map(feature => ({
              id: feature.properties.objectid, // Assuming objectid is unique
              ...feature.properties
            }))
            .sort((a, b) => {
              // Assuming 'validTime' is the field to sort by and it's a parseable date string or timestamp
              // The NWS LSR data often has 'validTime' as a string like "2023/10/27 15:54:00+00"
              // Or sometimes it might be a Unix timestamp in milliseconds.
              // For this example, let's assume validTime is a string that needs parsing.
              // If it's already a number (timestamp), Date.parse might not be needed.
              const timeA = a.validTime ? new Date(a.validTime.replace(' ', 'T')).getTime() : 0;
              const timeB = b.validTime ? new Date(b.validTime.replace(' ', 'T')).getTime() : 0;
              return timeB - timeA; // Sort descending (most recent first)
            });
          setLsrReports(sortedReports.slice(0, 25));
        } else {
          setLsrReports([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching LSR GeoJSON:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading recent storm reports...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load storm reports: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (lsrReports.length === 0) {
    return <div className="container mx-auto p-4 text-center">No recent storm reports found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Recent Local Storm Reports (Top 25)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lsrReports.map((report) => (
          <Card key={report.objectid || report.remarks + report.lsr_validtime} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">{descriptMappings[report.descript] || report.descript || 'Storm Report'}</CardTitle>
              {report.loc_desc && <CardDescription className="text-sm text-muted-foreground pt-1">{report.loc_desc}</CardDescription>}
              <CardDescription>
                {report.location ? `${report.location}, ` : ''}{report.state ? stateAbbreviationsToNames[report.state.toUpperCase()] || report.state : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm mt-2">{report.remarks || 'No remarks.'}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Time: {report.lsr_validtime ? new Date(report.lsr_validtime).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'N/A'}
              </p>
              <p className="text-sm mt-2">Magnitude: {report.magnitude || 'N/A'} {report.units || ''}</p>
              {report.issuingOffice && <p className="text-xs mt-2 text-muted-foreground">Office: {report.issuingOffice}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default LsrListPage;
