var fs       = require("fs");
var path     = require("path");
var Q        = require("q");
var _        = require("lodash");

/**
 * Dust for awesome templates
 * @type {dust|exports}
 */
var dust     = require("dustjs-linkedin");

/**
 * Yaml parsing
 * @type {yaml|exports}
 */
var yaml     = require("js-yaml");

/**
 * Markdown parsing
 * @type {marked|exports}
 */
var marked   = require('marked');

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

//
var log = function (level, msg, vars) {

    var prefix = "";
    if (level === "debug" && logLevel === "debug") {
        prefix = tfunk("[%Cmagenta:CoderBlog%R:%Ccyan:DEBUG%R] - ");
    }
    console.log(prefix + msg);
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
 * @param filePath
 * @returns {*}
 */
function getFile(filePath) {

    var content;

    filePath = path.resolve(filePath.replace(/^\./, ""));

    if (cache[filePath]) {
        log("debug", "Cache access for: " + filePath);
        return cache[filePath];
    }

    try {
        log("debug", "File System access for: " + filePath);
        content = fs.readFileSync(filePath, "utf-8");
        cache[filePath] = content;
        return content;
    } catch (e) {
        console.log(log("%Cred:[warn] %R%s not found - %s"), filePath, e);
        return "";
    }
}

/**
 * @param arguments
 * @param name
 */
function getIncludePath(name) {
    return "./_includes/" + name;
}

/**
 * @param arguments
 * @param name
 */
function getLayoutPath(name) {
    return "./_layouts/" + (name || "default") + ".html";
}

/**
 * @param current
 * @param arguments
 * @returns {*|XML|string|void}
 */
function addIncludes(current) {
    return current.replace(/{ include: (.+?) }/g, function () {
        return addIncludes(getFile(getIncludePath(arguments[1])));
    });
}

/**
 * @param current
 * @param content
 * @returns {*|XML|string|void}
 */
function yeildContent(current, content) {
    return current.replace(/{ yield: (.+?) }/, function () {
        return content;
    });
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

    var parsedContents = readFrontMatter(string);
    data.page          = parsedContents.front;
    data.content       = parsedContents.main;
    data.parsedContent = parsedContents;
    data.markdown      = processMardownFile(data.content);
    data.posts         = preparePosts(posts);
    data.pages         = pages;

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

        data = getData(string, data);

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
 *
 */
module.exports.populateCache = function (key, value) {
    log("debug", "Adding to cache: " + key);
    dust.loadSource(dust.compile(value, key));
    cache[key] = value;
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