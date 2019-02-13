// Require Third-Party Dependencies
const Addon = require("@slimio/addon");
const is = require("@slimio/is");
const { assertAlarm } = require("@slimio/utils");

// Globals
const stormRules = new Map();
const thresholds = new Map();

// CONSTANTS
const THRESHOLD_SIGN = new Set(["<", ">", "<=", ">=", "==", "!="]);

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

/**
 * @async
 * @desc Set a threshold rule
 * @param {*} header Callback Header
 * @param {!Number} micId micId
 * @param {!Object} rule rule
 * @param {!Object} alarm alarm
 * @returns {Promise<void>}
 */
async function setThreshold(header, micId, [rule, alarm]) {
    if (!is.number(micId)) {
        throw new TypeError("micId param must be a type of <number>");
    }
    if (!THRESHOLD_SIGN.has(rule.sign)) {
        throw new TypeError(`sign param can be one of those value : [${[...THRESHOLD_SIGN]}]`);
    }
    if (!is.number(rule.value)) {
        throw new TypeError("value param must be a type of <number>");
    }

    const mic = await new Promise((resolve) => {
        return Alerting.sendMessage("events.get_mic", { args: [micId] }).subscribe(resolve);
    });

    alarm.entityId = mic.entity_id;
    assertAlarm(alarm);
    thresholds.set(micId, { rule, alarm });
}

Alerting.of("Metric.insert").subscribe(([id, value]) => {
    console.log(`[ALERTING] Metric id : ${id}, value: ${value}`);
    if (thresholds.has(id)) {
        const threshold = thresholds.get(id);
        let createAlarm = false;

        switch (threshold.sign) {
            case "<":
                createAlarm = value < thresholds.value;
                break;
            case ">":
                createAlarm = value > thresholds.value;
                break;
            case "<=":
                createAlarm = value <= thresholds.value;
                break;
            case ">=":
                createAlarm = value >= thresholds.value;
                break;
            case "==":
                createAlarm = value === thresholds.value;
                break;
            case "!=":
                createAlarm = value !== thresholds.value;
                break;
            default:
                console.log("[ALERTING] Metric.insert : sign not find");
        }
        if (createAlarm === true) {
            Alerting.sendMessage("events.create_alarm", { args: [threshold.alarm] });
        }
    }
});

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

Alerting.registerCallback("set_storm_rule", setStormRule);
Alerting.registerCallback("set_threshold", setThreshold);

// Export "Alerting" addon for Core
module.exports = Alerting;
