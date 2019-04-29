// Require Third-Party Dependencies
const Addon = require("@slimio/addon");
const timer = require("@slimio/timer");
const alert = require("@slimio/alert");

// Require Internal Dependencies
const StormRule = require("./src/StormRule");

// CONSTANTS
const ENTITY_INTERVAL_MS = 5000;

/** @type {Map<String, StormRule>} */
const Storms = new Map();

/** @type {Map<String, any>} */
const Entities = new Map();

let entityInterval;

// Create Addon
const Alerting = new Addon("alerting").lockOn("events");

// Get Alarm Object
const { Alarm } = alert(Alerting);

function sendMessage(target, args) {
    return new Promise((resolve, reject) => {
        Alerting.sendMessage(target, { args }).subscribe(resolve, reject);
    });
}

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

    console.log("RECEIVING ASSERT ENTITY");
    const { exist = true, parent = null } = options;
    if (parent !== null) {
        const pType = typeof parent;
        if (pType !== "number" || pType !== "string") {
            throw new TypeError("parent param must be typeof <number> or <string>");
        }

        let entity;
        if (pType === "number") {
            entity = await sendMessage("events.get_entity_by_id", [parent]);
        }
        else {
            entity = await sendMessage("events.search_entities", [{ name: parent }]);
        }

        // TODO: verify if parent exist!
    }
    Entities.set(entityName, { exist, parent });
}

async function assertEntityInterval() {
    console.log("assert entity interval");
    for (const [entity, options] of Entities.entries()) {
        try {
            const ret = await sendMessage("events.search_entities", [{ name: entity }]);
            const isDefined = typeof ret !== "undefined";
            console.log("Entity: \n", ret);

            const correlateKey = `alert_ae_${entity.toLowerCase()}`;
            if (options.exist && !isDefined) {
                new Alarm(`Unable to found entity with name ${entity}`, {
                    correlateKey
                });
            }
            else if (!options.exist && isDefined) {
                new Alarm(`Entity '${entity}' has been detected but it should not exist (Alerting Assertion).`, {
                    entity, correlateKey
                });
            }
        }
        catch (err) {
            console.error(err);
        }
    }
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
    entityInterval = timer.setInterval(assertEntityInterval, ENTITY_INTERVAL_MS);
    Alerting.ready();
});

Alerting.on("close", () => {
    timer.clearInterval(entityInterval);
});

Alerting.registerCallback("register_storm_rule", setStormRule);
Alerting.registerCallback("assert_entity", assertEntity);

// Export "Alerting" addon for Core
module.exports = Alerting;
