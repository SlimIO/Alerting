// Require Third-Party Dependencies
const Addon = require("@slimio/addon");
const is = require("@slimio/is");

// Globals
const stormRules = new Map();

// Create Addon
const Alerting = new Addon("Alerting").lockOn("events");

/**
 * @async
 * @desc Set a rule storm
 * @param {*} header Callback Header
 * @param {!String} CID Correlation key Id
 * @param {!Object} rule Storm rule
 * @param {!Number} rule.time Rule interval time
 * @param {!Number} rule.occurence Rule occurence
 * @param {!Number} rule.severity Rule severity
 * @returns {Promise<void>}
 */
async function setStormRule(header, CID, { time, occurence, severity }) {
    if (!is.string(CID)) {
        throw new TypeError("CID param must be a type of <string>");
    }
    if (!is.number(time)) {
        throw new TypeError("time param must be a type of <number>");
    }
    if (!is.number(occurence)) {
        throw new TypeError("occurence param must be a type of <number>");
    }

    console.log("[ALERTING] Set new storm Rule");
    stormRules.set(CID, { time, occurence, severity, timestamps: [] });
}

Alerting.of(Addon.Subjects.Alarm.Update).subscribe({
    next([CID, occurence, timestamp]) {
        console.log(`[ALERTING] Updated CID : ${CID}`);
        console.log(`[ALERTING] Updated occurence : ${occurence}`);
        console.log(`[ALERTING] Updated timestamp : ${timestamp}`);
        if (stormRules.has(CID)) {
            const data = stormRules.get(CID);
            const limitDate = (timestamp - data.time) * 60;
            console.log(`[ALERTING] limitDate : ${limitDate}`);
            data.timestamps = data.timestamps.filter((dataTime) => dataTime > limitDate);

            data.timestamps.push(timestamp);
            console.log(data.timestamps);
            console.log(data.timestamps.length);
            if (data.timestamps.length >= data.occurence) {
                console.log(`[ALERTING] CREATE STORM ALARM pccurence: ${data.timestamps.length}`);
                data.timestamps = [];
            }
            stormRules.set(CID, data);
        }
    },
    error(err) {
        console.log(`[ALERTING] Alarm.update | Finished with error: ${err}`);
    }
});

Alerting.on("start", () => {
    console.log("[ALERTING] Start event triggered !");
});

Alerting.on("awake", () => {
    Alerting.ready();
});

Alerting.registerCallback("register_storm_rule", setStormRule);

// Export "Alerting" addon for Core
module.exports = Alerting;
