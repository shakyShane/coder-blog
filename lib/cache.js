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
    this._data     = {};
};
/**

 * @param item
 * @returns {Cache}
 */
Cache.prototype.addPost = function (item) {

    this._context = "posts";

    this._posts   = arrayPush(this._posts, item);

    sortItems(this._posts, "timestamp");

    return this;
};

/**
 * Alias
 * @type {Function}
 */
Cache.prototype.addPosts = Cache.prototype.addPost;

/**
 * @param item
 */
Cache.prototype.addPage = function (item) {

    this._context = "pages";

    this._pages   = arrayPush(this._pages, item);

    return this;
};

/**
 * Alias
 * @type {addPage}
 */
Cache.prototype.addPages = Cache.prototype.addPage;

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
 * Alias
 * @type {Function}
 */
Cache.prototype.addPartials = Cache.prototype.addPartial;

/**
 *
 */
Cache.prototype.addData = function (key, value) {

    var key = utils.makeShortKey(key);

    if (utils.isYaml(key)) {
        value = utils.parseYaml(value);
    }

    this._context  = "data";

    this._data[key] = value;

    return this;
};

/**
 * @param type
 * @param [obj]
 * @returns {*}
 */
Cache.prototype.convertKeys = function (type, obj) {

    return _.reduce(this._data, function (all, item, key) {

        var localKey = utils.getBaseName(key);

        if (_.isUndefined(all[localKey])) {
            all[localKey] = item;
        }

        return all;

    }, obj || {});
};

/**
 * @param key
 * @param value
 */
Cache.prototype.data = function (key, value) {
    return this._data;
};

/**
 * @param key
 * @param [context]
 */
Cache.prototype.find = function (key, context) {

    context = context || this._context;

    var items = this["_" + context];

    var method = findPartials;

    switch(context) {
        case "posts"    : method = findPosts; break;
        case "pages"    : method = findPages; break;
    }

    return method(items, key);

};

/**
 * Get the next post
 */
Cache.prototype.nextPost = function (item) {

    return this._posts[this._posts.indexOf(item) - 1];
};

/**
 * Get the previous post
 */
Cache.prototype.prevPost = function (item) {

    return this._posts[this._posts.indexOf(item) + 1];
};

/**
 * Retrieve a random collection
 */
Cache.prototype.getCollection = function (name) {

    return this["_" + name] || null;
};

/**
 * @returns {Cache}
 */
Cache.prototype.reset = function () {

    this._posts    = [];
    this._pages    = [];
    this._partials = [];
    this._data     = {};
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
 * @param items
 * @param property
 */
function sortItems(items, property) {

    items.sort(function (a, b) {
        return b[property] - a[property];
    });
}



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
 * Find a partial by key
 * @param items
 * @param key
 * @returns {*}
 */
function findPages(items, key) {

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