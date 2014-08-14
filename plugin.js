var through2  = require("through2");
var gutil     = require("gulp-util");
var File      = gutil.File;
var coderBlog = require("./coder-blog");
var merge     = require("opt-merger").merge;
var Q         = require("q");

var defaults = {
    configFile: "./_config.yml",
    transformSiteConfig: transformSiteConfig,
    env: "production"
};

/**
 * @returns {Function}
 */
module.exports = function (config) {

    console.time("coderBlog");
    config = merge(defaults, config || {});

    config.siteConfig = config.transformSiteConfig(coderBlog.getYaml(config.configFile), config);

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
            if (isIncludeOrLayout(key)) {
                coderBlog.populateCache(key, files[key]);
            } else {
                if (isPost(key)) {
                    coderBlog.addPost(key, files[key]);
                }
                if (isPage(key)) {
                    coderBlog.addPage(key, files[key]);
                }
                queue.push(key);
            }
        });

        queue.forEach(function (key) {
            var fileName = coderBlog.makeFilename(key);
            promises.push(buildOne(stream, files[key], fileName, config));
        });

        Q.all(promises).then(function () {
            coderBlog.clearCache();
            console.timeEnd("coderBlog");
            cb();
        });
    });
};

/**
 *
 */
function buildOne(stream, contents, fileName, config) {
    var deferred = Q.defer();
    coderBlog.compileOne(contents, config, function (out) {
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

function isIncludeOrLayout(path) {
    return path.match(/(_includes|_layouts)/);
}

function isPost(path) {
  return path.match(/_posts/);
}

function isPage(path) {
  return path.match(/\.html$/);
}
