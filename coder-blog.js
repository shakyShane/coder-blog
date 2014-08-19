/**
 * Core modules
 */
var fs    = require("fs");
var path  = require("path");

/**
 * Lib
 */
var utils    = require("./lib/utils");
var log      = require("./lib/logger");
var Post     = require("./lib/post").Post;
var Partial  = require("./lib/partial").Partial;
var Cache    = require("./lib/cache").Cache;

module.exports.utils = utils;

/**
 * 3rd Party libs
 */
var Q      = require("q");
var _      = require("lodash");
var moment = require("moment");

/**
 * Dust for awesome templates
 */
var dust  = require("dustjs-linkedin");
/**
 * Make Dust templates retain whitespace
 */
dust.optimizers.format = function(ctx, node) { return node; };
dust.isDebug = true;

/**
 * Yaml parsing
 */
var yaml     = require("js-yaml");

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

module.exports.cache = cache;


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

    if (filePath && cache[filePath]) {
        log("debug", tfunk("%Cgreen:Cache access%R for: " + filePath));
        return cache[filePath];
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
 */
function compile(data) {

    var current     = getFile(utils.getLayoutPath(data.page.layout));

    return makeFile(current, data);
}

/**
 * @param template
 * @param data
 * @returns {Promise.promise|*}
 */
function makeFile(template, data) {

    var deferred = Q.defer();
    var id = _.uniqueId();

    dust.compileFn(template, id, false);

    dust.render(id, data, function (err, out) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(out);
        }
    });

    return deferred.promise;
}

/**
 * @param filePath
 */
function makeFilename(filePath) {
    return filePath.replace(/^\//, "");
//    return path.basename(filePath).split(".")[0] + ".html";
}
module.exports.makeFilename = makeFilename;

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
 * @param posts
 * @returns {*}
 */
function preparePosts(posts) {

    return posts.map(function (post) {
        _.each(post.front, function (value, key) {
            post[key] = value;
        });
        return post;
    });
}

/**
 * This set's up the 'data' object with all the info any templates/includes might need.
 * @param {Object} front
 * @param {Object} config - Site config
 * @param {Object} data - Any initial data
 */
function getData(front, data, config) {

    var includeResolver = getCacheResolver(data, "include");
    var snippetResolver = getCacheResolver(data, "snippet");

    data.page           = front;
    data.post           = front;
    data.post.date      = moment(front.date).format(config.dateFormat);
    data.posts          = preparePosts(posts, data, config);
    data.pages          = pages;

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
    cache = {};
    posts = [];
    pages = [];
};

/**
 *
 * @param out
 * @param config
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
            return makeFile(utils.wrapSnippet(file, lang), data)
                .then(function (out) {
                    chunk.end(out);
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

        log("debug", "Looking for '" + params.src + "' in the cache.");

        // params always reset for every include/snippet
        data.params = {};

        _.each(params, function (value, key) {
            if (_.isUndefined(data[key])) {
                data[key] = value;
            }
            data.params[key] = value;
        });

        return type === "include"
            ? getInclude(utils.getIncludePath(params.src), data, chunk)
            : getSnippetInclude(utils.getSnippetPath(params.src), data, chunk, params);
    }
}

/**
 * Compile a single file
 * @param item
 * @param config
 * @param cb
 */
module.exports.compileOne = function (item, config, cb) {

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
        item = getFromCache(item);
    }

    if (item && item.front) {

        data = getData(item.front, data, config);
        data.content = item.content;

        var escapedContent = utils.escapeCodeFences(item.content);
            escapedContent = utils.escapeInlineCode(escapedContent);

        makeFile(escapedContent, data)
            .then(render)
            .catch(cb);

        function render(out) {

            var fullContent = prepareContent(out, data, config);

            // Just write the cody content without parsing (already done);
            data.content = function (chunk) {
                return chunk.write(fullContent);
            };

            compile(data)
                .then(function (out) {
                    cb(null, out);
                })
                .catch(cb);
        }
    } else {
        cb(null, string);
    }
};

/**
 * Populate the cache
 */
module.exports.populateCache = function (key, value) {

    var shortKey   = utils.makeShortKey(key);
    var partialKey = utils.makePartialKey(shortKey);

    if (shortKey) {
        log("debug", "Adding to cache: " + shortKey);
        dust.loadSource(dust.compile(value, shortKey));
        cache[shortKey] = value;

        if (isInclude(shortKey) && partialKey && _.isUndefined(cache[partialKey])) {
            cache[partialKey] = value;
            dust.loadSource(dust.compile(value, partialKey));
        }
    } else {
        log("debug", "Adding to cache: " + key);
        dust.loadSource(dust.compile(value, key));
        cache[key]      = value;
    }

    return cache;
};

/**
 * Check the cache for existing matches
 * @param key
 * @param [partial]
 * @returns {*}
 */
function getFromCache(key, partial) {

    var shortKey = utils.makeShortKey(key);
    var pluck    = {key: shortKey};

    if (!partial) {
        return _.find(pages, pluck)
            || _.find(posts, pluck);
    }

    return cache[key]
        ? cache[key]
        : (function () {
            return _.find(cache, function (value, cacheKey) {
                return _.contains(cacheKey, key);
            });
    })();


}

/**
 * Try to retrieve an item from the cache
 */
module.exports.getFromCache = getFromCache;

/**
 * Allow api users to retrieve the cache.
 * @returns {{partials: {}, posts: Array, pages: Array}}
 */
module.exports.getCache = function () {
    return {
        partials: cache,
        posts: posts,
        pages: pages
    };
};

/**
 *
 */
function isInclude(path) {
    return path.match(/^includes/);
}

/**
 *
 */
function isLayout(path) {
    return path.match(/^layouts/);
}

/**
 *
 */
function isSnippet(path) {
    return path.match(/^snippets/);
}

/**
 * @param key
 * @param string
 * @param [config]
 */
module.exports.addPost = function (key, string, config) {
    return addItem(posts, key, string, config);
};

/**
 * @param key
 * @param string
 * @param [config]
 */
module.exports.addPage = function (key, string, config) {
    return addItem(pages, key, string, config);
};

/**
 * @param cache
 * @param key
 * @param string
 * @param config
 * @returns {*}
 */
function addItem(cache, key, string, config) {

    var post;

    if (post = getFromCache(key)) {
        return post;
    }

    post = new Post(key, string, config);

    cache.push(post);

    cache.sort(function (a, b) {
        return b.timestamp - a.timestamp;
    });

    return post;
}