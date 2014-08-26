var through2  = require("through2");
var gutil     = require("gulp-util");
var path      = require("path");
var File      = gutil.File;
var coderBlog = require("./coder-blog");
var utils     = coderBlog.utils;
var merge     = require("opt-merger").merge;
var Q         = require("q");
var _         = require("lodash");
var tfunk     = require("tfunk");

var PLUGIN_NAME = "gulp-coder-blog";

var defaults = {
    configFile: "./_config.yml",
    transformSiteConfig: transformSiteConfig,
    env: "production",
    logLevel: "warn"
};

coderBlog.log.setName(tfunk("%Cmagenta:CoderBlog"));

/**
 * @returns {Function}
 */
module.exports = function (config) {

    config = merge(defaults, config || {}, true);

    config.siteConfig = config.transformSiteConfig(utils.getYaml(config.configFile), config);

    coderBlog.log.setLogLevel(config.logLevel);

    var files = {};
    var stream;

    return through2.obj(function (file, enc, cb) {
        stream          = this;
        var contents    = file._contents.toString();
        var relFilePath = file.path.replace(file.cwd, "");

        files[relFilePath] = contents;

        cb();

    }, function (cb) {

        var promises = [];
        var queue = [];

        Object.keys(files).forEach(function (key) {
            if (isPartial(key)) {
                coderBlog.populateCache(key, files[key], "");
            } else if (isData(key)) {
                coderBlog.populateCache(key, files[key], "data");
            } else {
                var item;
                if (isPost(key)) {
                    item = coderBlog.addPost(key, files[key], config);
                } else {
                    if (isPage(key)) {
                        item = coderBlog.addPage(key, files[key], config);
                    }
                }
                queue.push(item);
            }
        });

        _.each(queue, function (item) {
            promises.push(buildOne(stream, item, config));
        });
//
        Q.all(promises).then(function (err, out) {
            coderBlog.clearCache();
            cb();
        }).catch(function (err) {
            err = err.toString();
            coderBlog.log("warn", err);
            cb();
        })
    });
};

/**
 *
 */
function buildOne(stream, item, config) {

    var deferred = Q.defer();

    coderBlog.compileOne(item, config, function (err, out) {

        if (err) {
            deferred.reject(err);
        } else {

            if (Array.isArray(out)) {
                out.forEach(function (item) {
                    stream.push(new File({
                        cwd:  "./",
                        base: "./",
                        path: item.filePath,
                        contents: new Buffer(item.compiled)
                    }));
                });
            } else {
                stream.push(new File({
                    cwd:  "./",
                    base: "./",
                    path: out.filePath,
                    contents: new Buffer(out.compiled)
                }));
            }

            deferred.resolve(out);
        }
    });

    return deferred.promise;
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

function isPartial(filePath) {
    return filePath.match(/(_includes|_layouts|_snippets)/);
}

function isPost(filePath) {
  return filePath.match(/_posts/);
}

function isData(filePath) {
  return path.extname(filePath).match(/(json|yml)$/i);
}

function isPage(filePath) {
  return filePath.match(/\.html$/);
}
