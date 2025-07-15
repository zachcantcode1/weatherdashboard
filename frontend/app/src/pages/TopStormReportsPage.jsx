import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

function getSignificance(report) {
  // Higher magnitude = more significant. Hail > Wind Gust > Wind Damage
  if (/hail/i.test(report.descript)) {
    return 1000 + (Number(report.magnitude) || 0); // Hail is most significant
  }
  if (/wnd|wind/i.test(report.descript)) {
    return 500 + (Number(report.magnitude) || 0); // Wind is next
  }
  return 0;
}


function TopStormReportsPage() {
  const [hailReports, setHailReports] = useState([]);
  const [windReports, setWindReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('https://mesonet.agron.iastate.edu/geojson/lsr.geojson?&hours=24')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data && data.features) {
          const now = new Date();
          const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const reports = data.features
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
              // Only last 24 hours (should always be true with this API, but keep for safety)
              if (!report.valid) return false;
              const reportTime = new Date(report.valid);
              return reportTime >= last24h && reportTime <= now;
            });
          const hail = reports.filter(r => /hail/i.test(r.type)).sort((a, b) => b.magnitude - a.magnitude);
          const wind = reports.filter(r => /wnd|wind|gust/i.test(r.type)).sort((a, b) => b.magnitude - a.magnitude);
          setHailReports(hail);
          setWindReports(wind);
        } else {
          setHailReports([]);
          setWindReports([]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Loading top storm reports...</div>;
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
  if (hailReports.length === 0 && windReports.length === 0) {
    return <div className="container mx-auto p-4 text-center">No significant storm reports in the last 24 hours.</div>;
  }
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Top 10 Storm Reports in the Last 24 Hours</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg border border-blue-900 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center text-blue-300">Hail</CardTitle>
          </CardHeader>
          <CardContent>
            {hailReports.length === 0 ? (
              <p className="text-center text-muted-foreground">No hail reports.</p>
            ) : (
              <ol className="pl-0 divide-y divide-blue-100">
                {hailReports.slice(0, 10).map((report, idx) => (
                  <li key={report.objectid || report.remarks + report.lsr_validtime} className="flex justify-between items-center py-3">
                    <span className="flex items-center gap-2">
                      <span className="mr-3 text-lg font-bold text-blue-600">{idx + 1}.</span>
                      <span className="font-medium">
                        {report.city ? `${report.city}, ` : ''}
                        {report.county ? `${report.county} County, ` : ''}
                        {report.state ? stateAbbreviationsToNames[report.state.toUpperCase()] || report.state : ''}
                      </span>
                    </span>
                    <span className="font-semibold text-blue-700 text-lg">{report.magnitude || 'N/A'} {report.units || ''}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg border border-green-900 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center text-green-300">Wind</CardTitle>
          </CardHeader>
          <CardContent>
            {windReports.length === 0 ? (
              <p className="text-center text-muted-foreground">No wind reports.</p>
            ) : (
              <ol className="pl-0 divide-y divide-green-100">
                {windReports.slice(0, 10).map((report, idx) => (
                  <li key={report.objectid || report.remarks + report.lsr_validtime} className="flex justify-between items-center py-3">
                    <span className="flex items-center gap-2">
                      <span className="mr-3 text-lg font-bold text-green-600">{idx + 1}.</span>
                      <span className="font-medium">
                        {report.city ? `${report.city}, ` : ''}
                        {report.county ? `${report.county} County, ` : ''}
                        {report.state ? stateAbbreviationsToNames[report.state.toUpperCase()] || report.state : ''}
                      </span>
                    </span>
                    <span className="font-semibold text-green-700 text-lg">{report.magnitude || 'N/A'} {report.units || ''}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TopStormReportsPage;
