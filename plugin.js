var through2  = require("through2");
var gutil     = require("gulp-util");
var File      = gutil.File;
var coderBlog = require("./coder-blog");
var utils     = coderBlog.utils;
var merge     = require("opt-merger").merge;
var Q         = require("q");
var _         = require("lodash");

var PLUGIN_NAME = "gulp-coder-blog";

var defaults = {
    configFile: "./_config.yml",
    transformSiteConfig: transformSiteConfig,
    env: "production"
};

/**
 * @returns {Function}
 */
module.exports = function (config) {

    config = merge(defaults, config || {});

    config.siteConfig = config.transformSiteConfig(utils.getYaml(config.configFile), config);

    var files = {};
    var posts = {};
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
                coderBlog.populateCache(key, files[key]);
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
            gutil.log(coderBlog.logger.compile("%Cwarn:" + err));
            cb(null);
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
//                out.forEach(function (item) {
//                });
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

function isPartial(path) {
    return path.match(/(_includes|_layouts|_snippets)/);
}

function isPost(path) {
  return path.match(/_posts/);
}

function isPage(path) {
  return path.match(/\.html$/);
}
