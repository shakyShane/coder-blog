var through2  = require("through2");
var gutil     = require("gulp-util");
var File      = gutil.File;
var coderBlog = require("./coder-blog");
var merge     = require("opt-merger").merge;

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

    config.siteConfig = config.transformSiteConfig(coderBlog.getYaml(config.configFile), config);

    return through2.obj(function (file, enc, cb) {

        var stream         = this;
        var contents       = file._contents.toString();
        var fileName       = coderBlog.makeFilename(file.path);

        coderBlog.compileOne(contents, config, function (out) {
            stream.push(new File({
                cwd:  "./",
                base: "./",
                path: fileName,
                contents: new Buffer(out)
            }));
            cb();
        });

    }, function (cb) {
        coderBlog.clearCache();
        cb(null);
    });
};

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
