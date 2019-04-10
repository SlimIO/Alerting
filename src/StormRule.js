// Require Third-party Dependencies
const TimeMap = require("@slimio/timemap");

// Symbols
const symRows = Symbol("rows");

/**
 * @class StormRule
 */
class StormRule {
    /**
     * @constructor
     * @memberof StormRule#
     * @param {!Number} time time delay in milliseconds
     * @param {!Number} occurence maximum number of occurence in the time
     * @param {!Number} severity severity
     *
     * @throws {TypeError}
     */
    constructor(time, occurence, severity) {
        if (typeof time !== "number") {
            throw new TypeError("time must be a number");
        }
        if (typeof occurence !== "number") {
            throw new TypeError("occurence must be a number");
        }
        if (typeof severity !== "number") {
            throw new TypeError("severity must be a number");
        }

        this.occurence = occurence;
        this.severity = severity;
        Reflect.defineProperty(this, symRows, { value: new TimeMap(time * 1000) });
    }

    /**
     * @method walk
     * @memberof StormRule#
     * @return {Boolean}
     */
    walk() {
        const rows = this[symRows];
        rows.set(Date.now(), null);

        if (rows.size >= this.occurence) {
            rows.clear();

            return true;
        }

        return false;
    }
}

module.exports = StormRule;
