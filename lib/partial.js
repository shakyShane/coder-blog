var utils = require("./utils");

/**
 * @param filePath
 * @param content
 * @param config
 * @returns {Partial}
 * @constructor
 */
var Partial = function (filePath, content, config) {

    this.shortKey   = utils.makeShortKey(filePath);
    this.partialKey = utils.makePartialKey(this.shortKey);
    this.content    = content;

    return this;
};

module.exports.Partial = Partial;
