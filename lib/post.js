var utils = require("./utils");

/**
 * @param {String} filePath
 * @param {String} content
 * @param {Object} [config]
 * @constructor
 */
var Post = function (filePath, content, config) {

    // Front matter/content split
    this.split      = utils.readFrontMatter(content);
    this.front      = this.split.front;
    this.content    = this.split.content;
    this.original   = content;

    this.key        = utils.makeShortKey(filePath);
    this.paths      = utils.makePostUrl(this.key, config);
    this.categories = utils.getCategories(this.front.categories, config);
    this.tags       = utils.getCategories(this.front.tags, config);

    // Urls
    this.url        = this.paths.url;
    this.filePath   = this.paths.filePath;


    // Data stuff
    this.dateObj    = this.front.date;
    this.timestamp  = this.dateObj ? this.dateObj.getTime() : false;

    return this;
};

module.exports.Post = Post;