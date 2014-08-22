var utils = require("./utils");

/**
 * @param {String} filePath
 * @param {String} content
 * @param {Object} [config]
 * @constructor
 */
var Page = function (filePath, content, config) {

    // Front matter/content split
    this.split      = utils.readFrontMatter(content);
    this.front      = this.split.front;
    this.content    = this.split.content;
    this.original   = content;

    // Meta
    this.key        = utils.makeShortKey(filePath);
    this.type       = utils.getType(this.key);
    this.paths      = utils.makePostUrl(this.key, config);

    // Urls
    this.url        = this.paths.url;
    this.filePath   = this.paths.filePath;

    return this;
};

module.exports.Page = Page;