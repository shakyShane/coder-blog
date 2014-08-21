var utils = require("./utils");
var _     = require("lodash");

/**
 * @constructor
 */
var Cache = function () {
    this._context  = "partials";
    this._partials = [];
    this._posts    = [];
    this._pages    = [];
};

/**
 * @param item
 * @returns {Cache}
 */
Cache.prototype.addPost = function (item) {

    this._context = "posts";

    this._posts   = arrayPush(this._posts, item);

    return this;
};

/**
 * @param item
 * @returns {Cache}
 */
Cache.prototype.addPartial = function (item) {

    this._context  = "partials";

    this._partials = arrayPush(this._partials, item);

    return this;
};

/**
 * @param key
 * @param [context]
 */
Cache.prototype.find = function (key, context) {

    context = context || this._context;

    return context === "partials"
        ? findPartials(this._partials, key)
        : findPosts(this._posts, key);
};

/**
 * @returns {Cache}
 */
Cache.prototype.reset = function () {
    this._posts    = [];
    this._pages    = [];
    this._partials = [];
    return this;
};
/**
 * @param item
 */
Cache.prototype.addPage = function (item) {
    this._posts.push(item);
    return this;
};

Cache.prototype.posts = function () {
    return this._posts;
};

Cache.prototype.pages = function () {
    return this._pages;
};

Cache.prototype.partials = function () {
    return this._partials;
};

/**
 * Find a partial by key
 * @param items
 * @param key
 * @returns {*}
 */
function findPartials(items, key) {
    return _.find(items, function (item) {
        return _.contains(item.shortKey, key);
    });
}

/**
 * Find a partial by key
 * @param items
 * @param key
 * @returns {*}
 */
function findPosts(items, key) {
    return _.find(items, {
        key: utils.makeShortKey(key)
    });
}

/**
 * @param arr
 * @param item
 * @returns {*|Array|string|Buffer}
 */
function arrayPush(arr, item) {

    Array.isArray(item)
        ? arr = arr.concat(item)
        : arr.push(item);

    return arr;
}

module.exports.Cache = Cache;