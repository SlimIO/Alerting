// Require Third-Party Dependencies
const Addon = require("@slimio/addon");
const is = require("@slimio/is");

const Alerting = new Addon("Alerting");

const stormRules = new Map([
    ["2#first_test", { time: 60, occurence: 10, severity: 4 }]
]);

const thresholds = new Map([
    [3, 200000]
]);

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

// Alerting.of(Addon.Subjects.Alarm.Open).subscribe((CID) => {
//     console.log(`[Alerting] Open CID : ${CID}`);
// });

Alerting.of("Metric.insert").subscribe(([id, value]) => {
    console.log(`[Alerting] Metric id : ${id}, value: ${value}`);


});

Alerting.of("Alarm.update").subscribe(([CID, occurence]) => {
    console.log(`[ALERTING] Updated CID : ${CID}`);
    console.log(`[ALERTING] Updated occurence : ${occurence}`);
    if (stormRules.has(CID)) {
        const data = stormRules.get(CID);
        Alerting.sendMessage(
            "events.get_alarms_occurence",
            { args: [CID, { time: data.time, severity: data.severity }] }
        ).subscribe((occurence) => {
            console.log(`[ALERTING] occurence : ${occurence}`);
            if (occurence >= data.occurence) {
                console.log("[ALERTING] create storm alarm");
            }
        });
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
