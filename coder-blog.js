var dust     = require("dustjs-linkedin");
var fs       = require("fs");
var path     = require("path");
var Q        = require("q");
var _        = require("lodash");
var yaml     = require("js-yaml");
var marked   = require('marked');

var compiler = require("tfunk").Compiler({
    prefix: "[%Cmagenta:CoderBlog%R] ",
    custom: {
        "error": "chalk.bgRed.white",
        "warn": "chalk.red"
    }
});

var log = compiler.compile;

var cache    = {};

/**
 * Make Dust templates retain whitespace
 * @param ctx
 * @param node
 * @returns {*}
 */
dust.optimizers.format = function(ctx, node) { return node; };

/**
 * @param path
 * @returns {*}
 */
function getFile(path) {

    var content;

    path = path.replace(/^\./, "");

    if (cache[path]) {
        return cache[path];
    }

    try {
        console.log("Filesytem: %s", path);
        content = fs.readFileSync(path, "utf-8");
        cache[path] = content;
        return content;
    } catch (e) {
        return "";
    }
}

/**
 *
 */
module.exports.populateCache = function (key, value) {
    cache[key] = value;
};

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
        return getFile(getIncludePath(arguments[1]));
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

    var current = getFile(getLayoutPath(data.page.layout));
    current     = addIncludes(current);
    current     = yeildContent(current, data.content);

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
function processPost(string) {
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
 * @param string
 */
function getData(string, data) {

    var parsedContents = readFrontMatter(string);
    data.page    = parsedContents.front;
    data.content = processPost(parsedContents.main);

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
    cache = {};
};

/**
 * Compile a single file
 * @param string
 * @param config
 * @param cb
 */
module.exports.compileOne = function (string, config, cb) {

    var data = {
        site: config.siteConfig || getYaml("./_config.yml")
    };

    if (hasFrontMatter(string)) {

        data = getData(string, data);

        compile(config, data, function (out) {
            cb(out);
        });
    }
};