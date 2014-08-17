var fs         = require("fs");
var path       = require("path");
var Q          = require("q");
var _          = require("lodash");
var merge      = require("opt-merger").merge;


/**
 * Dust for awesome templates
 * @type {dust|exports}
 */
var dust     = require("dustjs-linkedin");
dust.isDebug = true;

/**
 * Yaml parsing
 * @type {yaml|exports}
 */
var yaml     = require("js-yaml");

/**
 * Markdown parsing
 * @type {marked|exports}
 */
var marked    = require('marked');

/**
 * Highlight.js for default highlighting styles
 */
var highlight  = require('highlight.js');

/**
 * tfunk for terminal colours
 * @type {compile|exports}
 */
var tfunk    = require("tfunk");
var logLevel = "warn"; // debug, error, warn
var compiler = new tfunk.Compiler({
    prefix: "[%Cmagenta:CoderBlog%R] ",
    custom: {
        "error": "chalk.bgRed.white",
        "warn": "chalk.red"
    }
});

var debugPrefix = tfunk("[%Cmagenta:CoderBlog%R:%Ccyan:DEBUG%R] - ");

//
var log = function (level, msg, vars) {

    var prefix = "";
    if ((level === "debug" || level === "warn") && (logLevel === "debug")) {
        console.log(debugPrefix + msg);
    }
};

module.exports.log    = log;
module.exports.logger = compiler;

/**
 * @param level
 */
module.exports.setLogLevel = function (level) {
    logLevel = level;
};

var cache    = {};
var posts    = [];
var pages    = [];

var defaults = {
    configFile: "./_config.yml",
    markdown: true,
    highlight: true
};

module.exports.cache = cache;

/**
 * Make Dust templates retain whitespace
 * @param ctx
 * @param node
 * @returns {*}
 */
dust.optimizers.format = function(ctx, node) { return node; };

/**
 *
 * @param filePath
 * @returns {string}
 */
function makeFsPath(filePath) {
    return process.cwd() + "/_" + filePath;
}

/**
 * @param {} filePath
 * @param {Function} [transform]
 * @param {Boolean} [allowEmpty] - should file lookups be allowed to return an empty strign?
 * @returns {*}
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
        content = fs.readFileSync(makeFsPath(filePath), "utf-8");
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
 * Include path has a special case for html files, they can be provided
 * without the extension
 * @param arguments
 * @param name
 */
function getIncludePath(name) {

    if (name.match(/html$/)) {
        return "includes/" + name;
    }
    return "includes/" + name + ".html";
}

/**
 * @param arguments
 * @param name
 */
function getSnippetPath(name) {
    return "snippets/" + name;
}

/**
 * @param arguments
 * @param name
 */
function getLayoutPath(name) {
    return "layouts/" + (name || "default") + ".html";
}

/**
 * @param config
 * @param data
 */
function compile(config, data) {

    var current     = getFile(getLayoutPath(data.page.layout));
    data.config = config;

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
    return path.basename(filePath).split(".")[0] + ".html";
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
 * @param lang
 * @param callback
 * @returns {*}
 */
function highlightSnippet(code, lang, callback) {
    return highlight.highlightAuto(code).value;
}

/**
 * Check if file has front matter
 * @param file
 * @returns {boolean}
 */
function hasFrontMatter(file) {
    return file.match(/^---\n/);
}

/**
 * @param file
 * @returns {*}
 */
function readFrontMatter(file) {
    if (/^---\n/.test(file)) {
        var end = file.search(/\n---\n/);
        if (end != -1) return {front: yaml.load(file.slice(4, end + 1)) || {}, main: file.slice(end + 5)};
    }
    return {front: {}, main: file};
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
 * @param {String} content
 * @param {Object} config - Site config
 * @param {Object} data - Any initial data
 */
function getData(content, data, config) {

    var parsedContents  = readFrontMatter(content);
    var includeResolver = getCacheResolver(data, "include");
    var snippetResolver = getCacheResolver(data, "snippet");

    data.page           = parsedContents.front;
    data.post           = parsedContents.front;
    data.content        = parsedContents.main;
    data.parsedContent  = parsedContents;
//    data.markdown       = processMardownContent(data.content, config);
    data.posts          = preparePosts(posts, data, config);
    data.pages          = pages;

    // Helper functions
    data.inc            = includeResolver;
    data.include        = includeResolver;
    data.highlight      = snippetResolver;
    data.hl             = snippetResolver;

    return data;
}

/**
 * @param file
 * @returns {*}
 */
function getYaml(file) {
    try {
        return yaml.safeLoad(fs.readFileSync(file, "utf-8"));
    } catch (e) {
        console.log(e);
    }
}
module.exports.getYaml = getYaml;

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
 * @param content
 */
function wrapSnippet(content) {
    return "```{params.lang}\n" + content + "\n```";
}

/**
 * @param path
 * @param data
 * @param chunk
 * @returns {*}
 */
function getSnippetInclude(path, data, chunk) {

    var file = getFile(path, null, false);

    if (!file) {
        return chunk.partial( // hack to force template error
            path,
            dust.makeBase(data)
        );
    } else {
        return chunk.map(function(chunk) {
            return makeFile(wrapSnippet(file), data)
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
            ? getInclude(getIncludePath(params.src), data, chunk)
            : getSnippetInclude(getSnippetPath(params.src), data, chunk);
    }
}

/**
 * Allow highlighting within code fences, requiring NO additional syntax
 * @param content
 * @returns {*|XML|string|void}
 */
function escapeCodeFences(content) {
    return content.replace(/```([a-z-]+)\n([\s\S]+?)```/gi, function () {
        return "{`\n```" + arguments[1] + "\n" + arguments[2] + "\n```\n`}";
    });
}

/**
 * Ensure that any inline code snippets are escaped
 * @param content
 * @returns {*|XML|string|void}
 */
function escapeInlineCode(content) {
    return content.replace(/`(?!`)(.+?)`/, function () {
        return "{``" + arguments[1] + "``}";
    })
}

/**
 * Compile a single file
 * @param string
 * @param config
 * @param cb
 */
module.exports.compileOne = function (string, config, cb) {

    var data = {
        site: config.siteConfig || getYaml(defaults.configFile)
    };

    config = _.merge(_.cloneDeep(defaults), config);

    if (!_.isUndefined(config.logLevel)) {
        exports.setLogLevel(config.logLevel);
    }

    if (hasFrontMatter(string)) {

        data = getData(string, data, config);

        var escapedContent = escapeCodeFences(data.content);
            escapedContent = escapeInlineCode(escapedContent);

        makeFile(escapedContent, data)
            .then(render)
            .catch(cb);

        function render(out) {

            var fullContent = prepareContent(out, data, config);

            // Just write the cody content without parsing (already done);
            data.content = function (chunk) {
                return chunk.write(fullContent);
            };

            compile(config, data)
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
 * Shortkey for includes
 * @param key
 * @returns {*}
 */
function makeShortKey(key) {
    return key.replace(/(.+?)?_((includes|layouts|snippets|posts|pages)(.+))/, "$2");
}
module.exports.makeShortKey = makeShortKey;

/**
 * Partial key for includes (firstcome, first serve)
 * @param {String} key - eg: includes/blog/head.html
 * @returns {*}
 */
function makePartialKey(key) {

    if (!key) {
        return;
    }

    return path.basename(key)
        .replace(
            path.extname(key), ""
        );
}
module.exports.makePartialKey = makePartialKey;

/**
 * Populate the cache
 */
module.exports.populateCache = function (key, value) {

    var shortKey   = makeShortKey(key);
    var partialKey = makePartialKey(shortKey);

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
 * @returns {*}
 */
function checkCache(key) {
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
module.exports.checkCache = checkCache;

module.exports.getCache = function () {
    return {
        partials: cache,
        posts: posts,
        pages: pages
    };
};

/**
 * @param key
 * @param front
 * @param config
 * @returns {*}
 */
function makePostUrl(key, front, config) {

    if (config && config.permalink) {
        return config.permalink;
    }

    var shortKey = makeShortKey(key);

    return shortKey.replace(/(md|markdown)$/i, "html");
}

/**
 * @param key
 * @param front
 * @param config
 * @returns {*}
 */
function makePageUrl(key, front, config) {

    if (config && config.permalink) {
        return config.permalink;
    }

    var shortKey = makeShortKey(key);

    return shortKey.replace(/(md|markdown)$/i, "html").replace(/^\//, "");
}
/**
 * @param key
 * @param string
 * @param [config]
 */
module.exports.addPost = function (key, string, config) {

    var front    = readFrontMatter(string);
    front.url    = makePostUrl(key, front, config);
    front.content = string;
    posts.push(front);

    return front;
};

/**
 * @param key
 * @param string
 * @param [config]
 */
module.exports.addPage = function (key, string, config) {

    var front     = readFrontMatter(string);
    front.url     = makePageUrl(key, front, config);
    front.content = string;
    pages.push(front);

    return front;
};