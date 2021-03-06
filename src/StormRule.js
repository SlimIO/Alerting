// Require Third-party Dependencies
import TimeMap from "@slimio/timemap";

// Symbols
const symRows = Symbol("rows");

export default class StormRule {
    /**
     * @class StormRule
     * @memberof StormRule#
     * @param {!number} time time delay in milliseconds
     * @param {!number} occurence maximum number of occurence in the time
     * @param {!number} severity severity
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
     * @function walk
     * @memberof StormRule#
     * @returns {boolean}
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
