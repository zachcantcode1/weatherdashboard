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
    let isMounted = true;
    let intervalId;

    const fetchReports = () => {
      setLoading(true);
      fetch('https://mesonet.agron.iastate.edu/geojson/lsr.geojson?&hours=24')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          if (data && data.features) {
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

            const filteredReports = data.features
              .map(feature => {
                const p = feature.properties;
                return {
                  id: feature.id || p.product_id || p.id,
                  city: p.city,
                  county: p.county,
                  state: p.state || p.st,
                  magnitude: Number(p.magnitude) || Number(p.magf) || 0,
                  units: p.unit,
                  remarks: p.remark,
                  type: p.typetext || p.type,
                  valid: p.valid,
                  source: p.source,
                  wfo: p.wfo,
                };
              })
              .filter(report => {
                // Only today
                if (!report.valid) return false;
                const reportTime = new Date(report.valid);
                if (reportTime < todayStart || reportTime >= todayEnd) {
                  return false;
                }
                // Filter out rain/flood reports
                const description = (report.type || '').toLowerCase();
                if (description.includes('rain') ||
                    description.includes('heavy rain') ||
                    description.includes('excessive rainfall') ||
                    description.includes('rainfall') ||
                    description.includes('precipitation') ||
                    description.includes('flooding rain') ||
                    description.includes('flood')) {
                  return false;
                }
                return true;
              })
              .sort((a, b) => {
                // Sort by most recent
                let timeA = a.valid ? new Date(a.valid).getTime() : 0;
                let timeB = b.valid ? new Date(b.valid).getTime() : 0;
                return timeB - timeA;
              });
            if (isMounted) setLsrReports(filteredReports.slice(0, 25));
          } else {
            if (isMounted) setLsrReports([]);
          }
          if (isMounted) setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching LSR GeoJSON:', err);
          if (isMounted) setError(err.message);
          if (isMounted) setLoading(false);
        });
    };

    fetchReports();
    intervalId = setInterval(fetchReports, 300000); // 5 minutes

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
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
    return <div className="container mx-auto p-4 text-center">No storm reports found for today.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Recent Storm Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lsrReports.map((report) => (
          <Card key={report.id || report.remarks + report.valid} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">{report.type || 'Storm Report'}</CardTitle>
              <CardDescription>
                {report.city ? `${report.city}, ` : ''}
                {report.county ? `${report.county} County, ` : ''}
                {report.state ? stateAbbreviationsToNames[report.state.toUpperCase()] || report.state : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm mt-2">{report.remarks || 'No remarks.'}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Time: {report.valid ? new Date(report.valid).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'N/A'}
              </p>
              <p className="text-sm mt-2">Magnitude: {report.magnitude || 'N/A'} {report.units || ''}</p>
              {report.wfo && <p className="text-xs mt-2 text-muted-foreground">Office: {report.wfo}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default LsrListPage;
