var utils = require("./utils");
var Page  = require("./page");
var _     = require("lodash");

var Paginator = function (items, item, name) {

    // Front matter/content split
    var type = [name, 2];

    if (name.match(/:/)) {
        type = name.split(":");
    }

    var paged    = this.paginate(type[1], type[0], items);

    this._pages  = this.makePaginationPages(item, paged);

    return this;
};

module.exports = Paginator;

/**
 * @returns {*}
 */
Paginator.prototype.pages = function () {
    return this._pages;
};

/**
 * Get the previous post
 */
Paginator.prototype.paginate = function (count, type, items) {

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

    var pages = [];
    var basename = item.paths.url.replace(/^\//, "");

    collection.forEach(function (arr, i) {

        var name = item.paths.filePath;

        if (i !== 0) {
            name = basename + "/page%s/index.html".replace("%s", i+1);
        }

        var obj = {
            page: new Page(name, item.original, {})
        };

        obj.items = arr;

        pages.push(obj);
    });

    return pages;
};