// Require Third-Party Dependencies
const Addon = require("@slimio/addon");
const is = require("@slimio/is");

const Alerting = new Addon("Alerting");

const stormRules = new Map([
    ["2#first_test", { time: 1, occurence: 10, severity: 4, timestamps: [] }]
]);

// const thresholds = new Map([
//     [3, 200000]
// ]);

/**
 * @async
 * @desc Set a rule storm
 * @param {String=} CID cid
 * @param {Number=} time time
 * @param {Number=} occurence occurence 
 * @param {Number=} severity severity
 * @returns {Promise<void>}
 */
async function setStormRule(CID, [time, occurence, severity]) {
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
    stormRules.set(CID, { time, occurence, severity });
}

Alerting.of(Addon.Subjects.Alarm.Open).subscribe({
    next(CID) {
        console.log(`[Alerting] Open CID : ${CID}`);
    },
    error(err) {
        console.log(`[ALERTING] Alarm.open | Finished with error: ${err}`);
    }
});

// Alerting.of("Metric.insert").subscribe(([id, value]) => {
//     console.log(`[Alerting] Metric id : ${id}, value: ${value}`);


// });

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

Alerting.on("start", () => {
    console.log("[ALERTING] Start event triggered !");

    const checkEntities = [];
    const entityLink = [];
    const descriptors = [];

    Alerting.ready();

});


Alerting.registerCallback("set_storm_rule", setStormRule);

// Export "Alerting" addon for Core
module.exports = Alerting;
