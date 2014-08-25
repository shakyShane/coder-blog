var utils = require("./utils");
var _     = require("lodash");

/**
 * @param {String} filePath
 * @param {String} content
 * @param {Object} [config]
 * @constructor
 */
var Page = function (filePath, content, config) {

    this.config     = config || {};

    // Front matter/content split
    this.split      = utils.readFrontMatter(content);
    this.front      = this.split.front;
    this.content    = this.split.content;
    this.original   = content;

    // Meta
    this.key        = utils.makeShortKey(filePath);
    this.type       = utils.getType(this.key);
    this.paths      = utils.makePageUrl(this.key, config);

    // Urls
    this.url        = this.paths.url;
    this.filePath   = this.paths.filePath;

    // Transforms
    this.applyTransforms(this.config.transform);

    return this;
};

/**
 * Apply custom transformations
 */
Page.prototype.applyTransforms = function (transform) {
    if (_.isFunction(transform)) {
        transform(this);
    }
};

module.exports = Page;