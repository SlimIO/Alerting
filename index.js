// Require Third-Party Dependencies
const Addon = require("@slimio/addon");
const is = require("@slimio/is");
const { assertAlarm } = require("@slimio/utils");
const Queue = require("@slimio/queue");

const Alerting = new Addon("Alerting");

const stormRules = new Map();
const queue = new Queue();
let eventLaoded = false;

const thresholdSigns = new Set(["<", ">", "<=", ">=", "==", "!="]);
const thresholds = new Map();

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
    console.log("[ALERTING] Receive a strom Rule");
    if (!is.string(CID)) {
        throw new TypeError("CID param must be a type of <string>");
    }
    if (!is.number(time)) {
        throw new TypeError("time param must be a type of <number>");
    }
    if (!is.number(occurence)) {
        throw new TypeError("occurence param must be a type of <number>");
    }
    console.log("[ALERTING] Set a strom Rule");
    stormRules.set(CID, { time, occurence, severity, timestamps: [] });
    console.log(stormRules);
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
    console.log("[ALERTING] setThreshold");
    if (!is.number(micId)) {
        throw new TypeError("micId param must be a type of <number>");
    }
    if (!is.string(rule.sign)) {
        throw new TypeError("sign param must be a type of <string>");
    }
    if (!thresholdSigns.has(rule.sign)) {
        throw new TypeError(`sign param can be one of those value : [${[...thresholdSigns]}]`);
    }
    if (!is.number(rule.value)) {
        throw new TypeError("value param must be a type of <number>");
    }

    function publishMsg() {
        Alerting.sendMessage("events.get_mic", { args: [micId] }).subscribe((mic) => {
            console.log(mic);

            alarm.entityId = mic.entity_id;
            assertAlarm(alarm);

            console.log("[ALERTING] Set a threshold Rule");
            thresholds.set(micId, { rule, alarm });
            console.log(thresholds);
        });
    }

    if (eventLaoded === false) {
        queue.enqueue("threshold", publishMsg);
    }
    else {
        publishMsg();
    }
}

Alerting.of(Addon.Subjects.Alarm.Open).subscribe({
    next(CID) {
        console.log(`[Alerting] Open CID : ${CID}`);
    },
    error(err) {
        console.log(`[ALERTING] Alarm.open | Finished with error: ${err}`);
    }
});

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

Alerting.of("Alarm.update").subscribe({
    next([CID, occurence, timestamp]) {
        console.log(`[ALERTING] Updated CID : ${CID}`);
        console.log(`[ALERTING] Updated occurence : ${occurence}`);
        console.log(`[ALERTING] Updated timestamp : ${timestamp}`);
        if (stormRules.has(CID)) {
            const data = stormRules.get(CID);
            const limitDate = timestamp - data.time * 60;
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

Alerting.of("Addon.ready").subscribe({
    next(addonName) {
        console.log(`[ALERTING] Addon ready : ${addonName}`);
        Alerting.ready();
        if (addonName === "events") {
            eventLaoded = true;
            if (queue.has("threshold")) {
                const allThresoldRules = [...queue.dequeueAll("threshold")];
                console.log("[ALERTING] Threshold rules :");
                console.log(allThresoldRules);
                /* eslint-disable-next-line */
                allThresoldRules.map((func) => {
                    func();
                });
            }
        }
    },
    error(err) {
        console.log(`[ALERTING] Addon.ready | Finished with error: ${err}`);
    }
});

Alerting.on("start", () => {
    console.log("[ALERTING] Start event triggered !");

    // const checkEntities = [];
    // const entityLink = [];
    // const descriptors = [];

});


Alerting.registerCallback("set_storm_rule", setStormRule);
Alerting.registerCallback("set_threshold", setThreshold);

// Export "Alerting" addon for Core
module.exports = Alerting;
