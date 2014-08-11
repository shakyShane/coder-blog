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
 * Default templates, can be overridden by supplying the same keys in the
 * templates: { } option
 */
var templatePaths = {
    "default": "/_layouts/default.html",
    "post":    "/_layouts/post.html"
};

/**
 * Use user-provided templates first, defaults as fallback
 * @param {Object} config
 * @returns {Object}
 */
function getTemplates(config) {

    var templates = {};

    Object.keys(templatePaths).forEach(function (key) {
        if (config.templates && config.templates[key]) {
            templates[key] = config.templates[key];
        } else {
            templates[key] = fs.readFileSync(__dirname + templatePaths[key], "utf-8");
        }
    });

    return templates;
}

/**
 * @param stream
 * @param config
 * @param data
 * @param cb
 */
function compile(stream, config, data, filePath, cb) {

    var temps = getTemplates(config);

    data.config = config;

    var promises = [];

    promises.push(makeFile(temps[data.page.layout], filePath, stream, data));

    Q.all(promises).then(function () {
        cb();
    });
}

/**
 * @param template
 * @param fileName
 * @param stream
 * @param data
 * @returns {Promise.promise|*}
 */
function makeFile(template, fileName, stream, data) {

    var deferred = Q.defer();
    var id = _.uniqueId();

    dust.compileFn(template, id, false);

    dust.render(id, data, function (err, out) {

        stream.push(new File({
            cwd:  "./",
            base: "./",
            path: fileName,
            contents: new Buffer(out)
        }));

        deferred.resolve(out);
    });

    return deferred.promise;
}

/**
 * @param path
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
 * @returns {Function}
 */
module.exports = function (config) {

    config = merge(defaults, config || {});

    var siteConfig = config.transformSiteConfig(getYaml(config.configFile), config);

    return through2.obj(function (file, enc, cb) {

        var stream      = this;
        var contents    = file._contents.toString();
        var parsedContents = {};

        if (hasFrontMatter(contents)) {
            parsedContents = readFrontMatter(contents);
        }

        var data = {
            page: parsedContents.front,
            content: processPost(parsedContents.main),
            site: siteConfig
        };

        compile(stream, config, data, makeFilename(file.path), cb);

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