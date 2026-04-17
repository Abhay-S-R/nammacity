const fs = require('fs');

const SEV_CONFIG = {
    critical: { label: "CRITICAL", order: 0 },
    warning: { label: "WARNING", order: 1 },
    moderate: { label: "MODERATE", order: 2 },
    normal: { label: "NORMAL", order: 3 },
};

function generateAlerts(zones) {
    const entries = [];
    zones.forEach((zone, idx) => {
        const score = zone.scores.composite;
        const severity = zone.scores.severity;
        entries.push({ name: zone.name, severity, score });
    });
    return entries.sort((a, b) => b.score - a.score);
}

const data = JSON.parse(fs.readFileSync('../../backend/data/zones.json', 'utf8'));
// Mock scoring for test
const zones = data.map(z => ({
    name: z.name,
    scores: { composite: Math.random()*10, severity: "normal" }
}));
zones[0].scores = { composite: 8, severity: "critical" };
zones[1].scores = { composite: 6, severity: "warning" };
zones[2].scores = { composite: 4, severity: "moderate" };
zones[3].scores = { composite: 2, severity: "normal" };

console.log(generateAlerts(zones));
