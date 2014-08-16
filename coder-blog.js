var fs       = require("fs");
var path     = require("path");
var Q        = require("q");
var _        = require("lodash");

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
 *
 */
marked.setOptions({
    highlight: function (code, lang, callback) {
        return require('highlight.js').highlightAuto(code).value;
    }
});

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
    markdown: true
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
 * @param filePath
 * @param [transform]
 * @returns {*}
 */
function getFile(filePath, transform) {

    log("debug", "Getting file: " + filePath);

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
            typeof transform === "function"
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
        return "";
    }
}

/**
 *
 */
function isInclude(path) {
    return path.match(/([./])?_includes/);
}
/**
 *
 */
function isLayout(path) {
    return path.match(/([./])?_layouts/);
}
/**
 *
 */
function isSnippet(path) {
    return path.match(/([./])?_snippets/);
}

/**
 * @param arguments
 * @param name
 */
function getIncludePath(name) {
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
 * @param cb
 */
function compile(config, data, cb) {

    var current     = getFile(getLayoutPath(data.page.layout));
    data.config = config;

    makeFile(current, data).then(cb);
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
        deferred.resolve(out);
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
 * @returns {*|exports}
 */
function processMardownFile(string) {
    return marked(string);
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
 * @param string
 */
function getData(string, data) {

    var parsedContents  = readFrontMatter(string);
    data.page           = parsedContents.front;
    data.content        = parsedContents.main;
    data.parsedContent  = parsedContents;
    data.markdown       = processMardownFile(data.content);
    data.posts          = preparePosts(posts);
    data.pages          = pages;

    var includeResolver = getCacheResolver(data, "include");
    var snippetResolver = getCacheResolver(data, "snippet");

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
        return processMardownFile(out);
    } else {
        return out;
    }
}

/**
 * @param content
 */
function wrapSnippet(content) {
    return "```\n" + content + "\n```";
}

/**
 * @returns {Function}
 */
function getCacheResolver(data, type) {

    return function (chunk, context, bodies, params) {

        log("debug", "Looking for '" + params.src + "' in the cache.");

        var match;
        var cachePath;

        match = _.filter(cache, function (value, item) {
            return item === params.src;
        });

        if (!match.length) {
            log("debug", "'" + params.src + "' not found in any caches");
        }

        var incPath;


        data.params = {};

        _.each(params, function (value, key) {
            if (_.isUndefined(data[key])) {
                data[key] = value;
            }

            data.params[key] = value;
        });

        if (type === "include") {

            incPath = getIncludePath(params.src);

            getFile(incPath);

            return chunk.partial(
                incPath,
                dust.makeBase(data)
            );

        } else {

            incPath = getSnippetPath(params.src);

            return chunk.map(function(chunk) {

                makeFile(wrapSnippet(getFile(incPath)), data)
                    .then(function (out) {
                        chunk.end(out);
                    });
            });
        }
    }
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

    if (hasFrontMatter(string)) {

        data     = getData(string, data);

        makeFile(data.content, data).then(render);

        function render(out) {

            exports.populateCache("content", prepareContent(out, data, config));

            compile(config, data, function (out) {
                cb(out);
            });
        }

    } else {
        cb(string);
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
 * Populate the cache
 */
module.exports.populateCache = function (key, value) {

    var shortKey;

    if (shortKey = makeShortKey(key)) {
        log("debug", "Adding to cache: " + shortKey);
        dust.loadSource(dust.compile(value, shortKey));
        cache[shortKey] = value;
    } else {
        log("debug", "Adding to cache: " + key);
        dust.loadSource(dust.compile(value, key));
        cache[key]      = value;
    }

    return cache;
};

/**
 * Try to retrieve an item from the cache
 */
module.exports.checkCache = function (key) {
    return cache[key]
        ? cache[key]
        : (function () {
            return _.find(cache, function (value, cacheKey) {
                return _.contains(cacheKey, key);
            });
        })();
};

/**
 * @param key
 * @param string
 */
module.exports.addPost = function (key, string) {
    posts.push(readFrontMatter(string));
};

/**
 * @param key
 * @param string
 */
module.exports.addPage = function (key, string) {
    pages.push(readFrontMatter(string));
};