var dust     = require("dustjs-linkedin");
var fs       = require("fs");
var path     = require("path");
var Q        = require("q");
var merge    = require("opt-merger").merge;
var _        = require("lodash");
var through2 = require("through2");
var gutil    = require("gulp-util");
var yaml     = require("js-yaml");
var marked   = require('marked');

var File     = gutil.File;

/**
 * Make Dust templates retain whitespace
 * @param ctx
 * @param node
 * @returns {*}
 */
dust.optimizers.format = function(ctx, node) { return node; };

var defaults = {
    configFile: "./_config.yml",
    transformSiteConfig: transformSiteConfig,
    env: "production"
};

/**
 * @param path
 * @returns {*}
 */
function getFile(path) {
    try {
        return fs.readFileSync(path, "utf-8");
    } catch (e) {
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
        return getFile(getIncludePath(arguments[1]));
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
 * @param yaml
 * @param config
 */
function transformSiteConfig(yaml, config) {

    if (config.env === "dev") {
        yaml.cssFile = yaml.css.dev;
    } else {
        yaml.cssFile = yaml.s3prefix + yaml.css.production;
    }

    return yaml;
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
 * @returns {Function}
 */
module.exports = function (config) {

    config = merge(defaults, config || {});

    var siteConfig = config.transformSiteConfig(getYaml(config.configFile), config);

    var data  = {
        site: siteConfig
    };

    return through2.obj(function (file, enc, cb) {

        var stream         = this;
        var contents       = file._contents.toString();

        if (hasFrontMatter(contents)) {

            data = getData(contents, data);

            var fileName = makeFilename(file.path);

            compile(config, data, function (out) {
                stream.push(new File({
                    cwd:  "./",
                    base: "./",
                    path: fileName,
                    contents: new Buffer(out)
                }));
                cb();
            });
        }

    }, function (cb) {

        cb(null);
    });
};

function getYaml(file) {
    try {
        return yaml.safeLoad(fs.readFileSync(file, "utf-8"));
    } catch (e) {
        console.log(e);
    }
}