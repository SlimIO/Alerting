// Require Third-Party Dependencies
const Addon = require("@slimio/addon");
const alert = require("@slimio/alert");

// Require Internal Dependencies
const StormRule = require("./src/StormRule");

/** @type {Map<String, StormRule>} */
const Storms = new Map();

// Create Addon
const Alerting = new Addon("alerting").lockOn("events");

// Get Alarm Object
const { Alarm } = alert(Alerting);

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
 *
 * @throws {TypeError}
 */
async function setStormRule(header, CID, rule) {
    if (typeof CID !== "string") {
        throw new TypeError("CID param must be a typeof <string>");
    }

    const { time = 60, occurence, severity = Alarm.Severity.Minor } = rule;
    Storms.set(CID, new StormRule(time, occurence, severity));
}

/**
 * @async
 * @desc Set a rule storm
 * @param {*} header Callback Header
 * @param {!String} entityName entity name
 * @param {!Object} options Assertion options
 * @param {Boolean} options.exist If the entity must exist or not
 * @param {String} options.parent Assert the entity parent
 * @returns {Promise<void>}
 *
 * @throws {TypeError}
 */
async function assertEntity(header, entityName, options) {
    if (typeof entityName !== "string") {
        throw new TypeError("entityName param must be typeof <string>");
    }

    const { exist = true, parent = null } = options;
}

// Catch Alarm Update events
Alerting.of(Addon.Subjects.Alarm.Update).filter(([CID]) => Storms.has(CID)).subscribe({
    next([CID]) {
        const rule = Storms.get(CID);
        if (!rule.walk()) {
            return;
        }

        new Alarm(`Storm threshold below ${rule.occurence}`, {
            correlateKey: `storm_${CID}`,
            severity: rule.severity
        });
    },
    error(err) {
        console.log(`[ALERTING] Alarm.update | Finished with error: ${err}`);
    }
});

Alerting.on("awake", () => {
    Alerting.ready();
});

Alerting.registerCallback("register_storm_rule", setStormRule);
Alerting.registerCallback("assert_entity", assertEntity);

// Export "Alerting" addon for Core
module.exports = Alerting;
