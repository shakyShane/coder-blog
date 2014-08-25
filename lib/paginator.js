var utils = require("./utils");
var Page  = require("./page");
var _     = require("lodash");

var Paginator = function (items, item, count) {

    // Front matter/content split
    count = count || 2;

    this._paged  = this.paginate(count, items);
    this._pages  = this.makePaginationPages(item, this._paged);

    this._index  = item;

    return this;
};

module.exports = Paginator;

/**
 * @param item
 * @param data
 * @param i
 * @returns {*}
 */
Paginator.prototype.addMetaData = function (item, data, i) {

    var next = this._pages[i+1];
    var prev = this._pages[i-1];

    data.paged = {
        perPage: this.perPage,
        items: utils.prepareFrontVars(item.items, data, data.config),
        next:  next ? utils.prepareFrontVars(next.page, data, data.config) : null,
        prev:  prev ? utils.prepareFrontVars(prev.page, data, data.config) : null
    };

    return data;
};
/**
 * @returns {*}
 */
Paginator.prototype.pages = function () {
    return this._pages;
};

/**
 * Get the previous post
 */
Paginator.prototype.paginate = function (count, items) {

    var arrays      = [];
    var clonedItems = _.cloneDeep(items);

    while (clonedItems.length > 0) {
        arrays.push(clonedItems.splice(0, count));
    }

    return arrays;
};

/**
 * @param item
 * @param collection
 */
Paginator.prototype.makePaginationPages = function(item, collection) {

    return _.map(collection, function (items, i) {

        // Make a key for current page
        var name = getKey(item.paths, i);

        // Make a new page
        var page = new Page(name, item.original, {
            transform: getTransforms(i)
        });

        return {
            page: utils.prepareFrontVars(page, {}, {}),
            items: items
        };
    });
};

/**
 * @param paths
 * @param i
 */
function getKey(paths, i) {

    var name     = paths.filePath;
    var basename = paths.url.replace(/^\//, "");

    if (i !== 0) {
        name = basename + "/page%s/index.html".replace("%s", i + 1);
    }

    return name;
}

/**
 * Paginated pages need transforms, such as title
 * @param i
 * @returns {Function}
 */
function getTransforms(i) {

    return function (item) {
        if (i !== 0) {
            item.front.title = item.front.title + " - Page " + (i+1);
        }
    }
}