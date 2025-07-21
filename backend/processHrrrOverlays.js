// Node.js script to automate HRRR GRIB2 download and overlay generation using hrrrProcessor.py
// Usage: node processHrrrOverlays.js

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set date/hour for latest HRRR run (UTC)
function getLatestRun() {
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  let hour = now.getUTCHours();
  let date = now;
  if (hour % 1 !== 0) {
    hour -= 1;
    if (hour < 0) {
      hour = 23;
      date.setUTCDate(date.getUTCDate() - 1);
    }
  }
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const hourStr = hour.toString().padStart(2, '0');
  return { dateStr, hourStr, iso: date.toISOString().slice(0, 19) + 'Z' };
}

function runPythonOverlay(field, outName) {
  const { dateStr, hourStr, iso } = getLatestRun();
  const script = path.join(__dirname, 'hrrrProcessor.py');
  // Use absolute path to Python executable if available
  const pythonPath = process.env.PYTHON_PATH || 'python';
  const args = [script, dateStr, hourStr, field, outName];
  console.log(`[HRRR] Running: ${pythonPath} ${args.join(' ')}`);
  const py = spawn(pythonPath, args);
  py.stdout.on('data', data => {
    process.stdout.write(data);
  });
  py.stderr.on('data', data => {
    process.stderr.write(data);
  });
  py.on('close', code => {
    if (code === 0) {
      console.log(`[HRRR] ${field} overlay generated: ${outName}`);
    } else {
      console.error(`[HRRR] Python script failed for ${field} (exit code ${code})`);
    }
  });
}

// Generate overlays for SIG TOR and CAPE
const overlays = [
  { field: 'Significant Tornado Parameter', out: `${getLatestRun().iso}_sigtor.png` },
  { field: 'Convective Available Potential Energy', out: `${getLatestRun().iso}_cape.png` }
];

for (const o of overlays) {
  runPythonOverlay(o.field, path.join('radar_cache', o.out));
}
