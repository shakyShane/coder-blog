/**
 * Core modules
 */
var fs    = require("fs");
var path  = require("path");

/**
 * Lib
 */
var utils     = require("./lib/utils");
var log       = require("./lib/logger");
var Post      = require("./lib/post").Post;
var Page      = require("./lib/page");
var Paginator = require("./lib/paginator");
var Partial   = require("./lib/partial").Partial;
var Cache     = require("./lib/cache").Cache;
var _cache    = new Cache();

module.exports.utils       = utils;
module.exports.setLogLevel = log.setLogLevel;

/**
 * 3rd Party libs
 */
var _         = require("lodash");
var multiline = require("multiline");

/**
 * Dust for awesome templates
 */
//var dust     = require("dustjs-linkedin");
var dust = require('dustjs-helpers');

/**
 * Make Dust templates retain whitespace
 */
dust.optimizers.format = function(ctx, node) { return node; };
dust.isDebug = true;

/**
 * Markdown parsing
 */
var marked    = require('marked');

/**
 * Highlight.js for default highlighting styles
 */
var highlight  = require('highlight.js');

/**
 * tfunk for terminal colours
 */
var tfunk    = require("tfunk");

/**
 * Caches
 */
var cache    = {};
var posts    = [];
var pages    = [];

/**
 * Default configuration
 */
var defaults = {
    configFile: "./_config.yml",
    markdown: true,
    highlight: true,
    dateFormat: "LL" // http://momentjs.com/docs/#/utilities/
};

module.exports.cache = _cache;


/**
 * Get a file from the cache, or alternative look it up on FS from CWD as base
 * @param {String} filePath - {short-key from cache}
 * @param {Function} [transform]
 * @param {Boolean} [allowEmpty] - should file look ups be allowed to return an empty string?
 */
function getFile(filePath, transform, allowEmpty) {

    log("debug", "Getting file: " + filePath);

    if (_.isUndefined(allowEmpty)) {
        allowEmpty = true;
    }

    var content;

    if (content = _cache.find(filePath, "partials")) {
        log("debug", tfunk("%Cgreen:Cache access%R for: " + filePath));
        return content.content;
    } else {
        log("debug", "Not found in cache: " + filePath);
    }

    try {
        log("debug", tfunk("%Cyellow:File System access%R for: " + filePath));
        content = fs.readFileSync(utils.makeFsPath(filePath), "utf-8");
        exports.populateCache(filePath,
            _.isFunction(transform)
                ? transform(content)
                : content
        );
        return content;
    } catch (e) {
        log("warn",
            tfunk("%Cred:[warn]%R could not access - %s"
                .replace("%s", e.path)
            )
        );
        return allowEmpty
            ? ""
            : false
    }
}

/**
 * @param data
 * @param cb
 */
function compile(data, cb) {

    var current = getFile(utils.getLayoutPath(data.page.layout));

    if (!current) {
        return cb("file not found");
    }

    return makeFile(current, data, cb);
}

/**
 * @param template
 * @param data
 * @param cb
 */
function makeFile(template, data, cb) {

    var id = _.uniqueId();

    dust.compileFn(template, id, false);

    dust.render(id, data, function (err, out) {
        if (err) {
            cb(err);
        } else {
            cb(null, out);
        }
    });
}

/**
 * @param string
 * @param config
 * @returns {*|exports}
 */
function processMardownContent(string, config) {

    if (!config.highlight) {
        return marked(string);
    }

    marked.setOptions({
        highlight: (function () {
            return config.markdown && config.markdown.highlight
                ? config.markdown.highlight
                : highlightSnippet
        })()
    });

    return marked(string);
}

/**
 * @param code
 * @param [lang]
 * @param [callback]
 * @returns {*}
 */
function highlightSnippet(code, lang, callback) {
    return highlight.highlight(lang || "js", code).value;
}

/**
 * @param data
 * @param item
 */
function addPostMeta(data, item) {
    data.next = _cache.nextPost(item);
    data.prev = _cache.prevPost(item);
}

/**
 * This set's up the 'data' object with all the info any templates/includes might need.
 * @param {Object} item
 * @param {Object} config - Site config
 * @param {Object} data - Any initial data
 */
function getData(item, data, config) {

    var includeResolver = getCacheResolver(data, "include");
    var snippetResolver = getCacheResolver(data, "snippet");

//    console.log(moment(item.front.date).format(config.dateFormat));
    data.page           = item;
    data.post           = item;
    data.posts          = utils.prepareFrontVars(_cache.posts(), data, config);
    data.pages          = _cache.pages();


    if (item.type === "post") {
        addPostMeta(data.post, item);
    }

    // Helper functions
    data.inc            = includeResolver;
    data.include        = includeResolver;
    data.snippet        = snippetResolver;

    data.highlight      = snippetHelper;
    data.hl             = snippetHelper;

    return data;
}

/**
 * Snippet helper
 * @param chunk
 * @param context
 * @param bodies
 * @param params
 * @returns {*}
 */
function snippetHelper(chunk, context, bodies, params) {
    if (bodies.block) {
        return chunk.capture(bodies.block, context, function(string, chunk) {
            chunk.end(
                utils.wrapCode(
                    highlightSnippet(string, params.lang), params.lang
                )
            );
        });
    }
    // If there's no block, just return the chunk
    return chunk;
}

module.exports.clearCache = function () {
    log("debug", "Clearing all caches, (posts, pages, includes, partials)");
    _cache.reset();
};

/**
 *
 * @param out
 * @param config
 * @param data
 */
function prepareContent(out, data, config) {
    if (_.isUndefined(data.page.markdown) || data.page.markdown === false) {
        return processMardownContent(out, config);
    } else {
        return out;
    }
}

/**
 * @param filePath
 * @param data
 * @param chunk
 * @param params
 * @returns {*}
 */
function getSnippetInclude(filePath, data, chunk, params) {

    var file = getFile(filePath, null, false);
    var lang = params.lang
        ? params.lang
        : path.extname(filePath).replace(".", "");

    if (!file) {
        return chunk.partial( // hack to force a template error
            filePath,
            dust.makeBase(data)
        );
    } else {
        return chunk.map(function(chunk) {
            return makeFile(utils.wrapSnippet(file, lang), data, function (err, out) {
                if (err) {
                    chunk.end("");
                } else {
                    chunk.end(out);
                }
            });
        });
    }
}

/**
 * @param path
 * @param data
 * @param chunk
 * @returns {*}
 */
function getInclude(path, data, chunk) {

    getFile(path);

    return chunk.partial(
        path,
        dust.makeBase(data)
    );
}

/**
 * @returns {Function}
 */
function getCacheResolver(data, type) {

    return function (chunk, context, bodies, params) {

        params = params || {};

        log("debug", "Looking for '" + params.src + "' in the cache.");

        var sandBox = utils.prepareSandbox(params, data);

        return type === "include"
            ? getInclude(utils.getIncludePath(params.src), sandBox, chunk)
            : getSnippetInclude(utils.getSnippetPath(params.src), sandBox, chunk, params);
    }
}

/**
 * Compile a single file
 * @param item
 * @param config
 * @param cb
 */
module.exports.compileOne = function (item, config, cb) {

    var match;

    config = _.merge(_.cloneDeep(defaults), config);

    var data = {
        site: config.siteConfig || utils.getYaml(defaults.configFile),
        config: config
    };

    if (!_.isUndefined(config.logLevel)) {
        log.setLogLevel(config.logLevel);
    }

    // Try to find an item from the cache
    if (_.isString(item)) {

        match = _cache.find(item, "posts");

        if (!match) {
            match = _cache.find(item, "pages");
        }
    } else {
        match = item;
    }

    if (match && match.front) {

        if (!match.front.paginate) {

            construct(match, data, config, function (err, item) {
                if (err) {
                    return cb(err);
                } else {
                    cb(null, item);
                }
            });

        } else {

            var paginator      = new Paginator(_cache.posts(), match, match.front.paginate);
            var paginatorPages = paginator.pages();

            var compiledItems  = [];

            paginatorPages.forEach(function (item, i) {

                var next = paginatorPages[i+1];
                var prev = paginatorPages[i-1];

                if (next) {
                    next.page.front.title = " Page " + (i+2);
                }
                if (prev) {
                    prev.page.front.title = " Page " + (i);
                }

                data.paged = {
                    perPage: paginator.perPage,
                    items: utils.prepareFrontVars(item.items, data, config),
                    next: next ? utils.prepareFrontVars(next.page, data, config) : null,
                    prev: prev ? utils.prepareFrontVars(prev.page, data, config) : null
                };

                construct(utils.prepareFrontVars(item.page, data, {}), data, config, function (err, item) {
                    if (err) {
                        return cb(err);
                    } else {
                        compiledItems.push(item);
                        if (compiledItems.length === paginatorPages.length) {
                            cb(null, compiledItems);
                        }
                    }
                });
            });

            return false;
        }

    } else {
        cb(null, item);
    }
};

/**
 * @param item
 * @param data
 * @param config
 * @param cb
 */
function construct(item, data, config, cb) {

    data = getData(item, data, config);
    data.content = item.content;

    var escapedContent = utils.escapeCodeFences(item.content);
    escapedContent     = utils.escapeInlineCode(escapedContent);

    makeFile(escapedContent, data, render);

    function render(err, out) {

        if (err) {
            return cb(err);
        }

        var fullContent = prepareContent(out, data, config);

        // Just write the cody content without parsing (already done);
        data.content = function (chunk) {
            return chunk.write(fullContent);
        };

        compile(data, function (err, out) {
            if (err) {
                cb(err);
            } else {
                item.compiled = out;
                cb(null, item);
            }
        })
    }
}

/**
 * Populate the cache
 */
module.exports.populateCache = function (key, value) {

    var partial = new Partial(key, value);
    _cache.addPartial(partial);

    var shortKey   = partial.shortKey;
    var partialKey = partial.partialKey;

    if (shortKey) {

        log("debug", "Adding to cache: " + shortKey);

        dust.loadSource(dust.compile(value, shortKey));

        if (isInclude(shortKey) && partialKey) {
            dust.loadSource(dust.compile(value, partialKey));
        }

    } else {
        log("debug", "Adding to cache: " + key);
        dust.loadSource(dust.compile(value, key));
    }

    return _cache;
};

/**
 * Allow api users to retrieve the cache.
 * @returns {{partials: {}, posts: Array, pages: Array}}
 */
module.exports.getCache = function () {
    return _cache;
};

/**
 *
 */
function isInclude(path) {
    return path.match(/^includes/);
}

/**
 * @param key
 * @param string
 * @param [config]
 */
module.exports.addPost = function (key, string, config) {
    return addItem(_cache, key, string, config);
};

/**
 * @param key
 * @param string
 * @param [config]
 */
module.exports.addPage = function (key, string, config) {

    var page;

    if (page = _cache.find(key, "pages")) {
        return page;
    }

    page = new Page(key, string, config);

    _cache.addPage(page);

    return page;
};

/**
 * @param _cache
 * @param key
 * @param string
 * @param config
 * @returns {*}
 */
function addItem(_cache, key, string, config) {

    var post;

    if (post = _cache.find(key, "posts")) {
        return post;
    }

    post = new Post(key, string, config);

    _cache.addPost(post);

    return post;
}