var path = require("path");
var fs   = require("fs");
var _    = require("lodash");
var yaml = require("js-yaml");


var utils = {
    /**
     * Shortkey for includes
     * @param key
     * @returns {*}
     */
    makeShortKey: function (key) {
        return key.replace(/(.+?)?_((includes|layouts|snippets|posts|pages)(.+))/, "$2");
    },
    /**
     * Partial key for includes (first come, first serve)
     * @param {String} key - eg: includes/blog/head.html
     * @returns {*}
     */
    makePartialKey: function (key) {
        if (!key) {
            return;
        }

        return path.basename(key)
            .replace(
            path.extname(key), ""
        );
    },
    /**
     * Allow highlighting within code fences, requiring NO additional syntax
     * @param content
     * @returns {*|XML|string|void}
     */
    escapeCodeFences: function (content) {
        return content.replace(/```([a-z-]+)\n([\s\S]+?)```/gi, function () {
            return "{`\n```" + arguments[1] + "\n" + arguments[2] + "\n```\n`}";
        });
    },
    /**
     * Ensure that any inline code snippets are escaped
     * @param content
     * @returns {*|XML|string|void}
     */
    escapeInlineCode: function (content) {
        return content.replace(/`(?!`)(.+?)`/, function () {
            return "{``" + arguments[1] + "``}";
        })
    },
    /**
     * Wrap a snippet include
     * @param content
     */
    wrapSnippet: function (content) {
        return "```{params.lang}\n" + content + "\n```";
    },

    /**
     * @param file
     * @returns {*}
     */
    getYaml: function (file) {
        try {
            return yaml.safeLoad(fs.readFileSync(file, "utf-8"));
        } catch (e) {
            console.log(e);
        }
    },
    /**
     *
     * @param filePath
     * @returns {string}
     */
    makeFsPath: function (filePath) {
        return process.cwd() + "/_" + filePath;
    },
    /**
     * Include path has a special case for html files, they can be provided
     * without the extension
     * @param arguments
     * @param name
     */
    getIncludePath: function (name) {

        if (name.match(/html$/)) {
            return "includes/" + name;
        }

        return "includes/" + name + ".html";
    },

    /**
     * @param arguments
     * @param name
     */
    getSnippetPath: function (name) {
        return "snippets/" + name;
    },

    /**
     * @param arguments
     * @param name
     */
    getLayoutPath: function (name) {
        return "layouts/" + (name || "default") + ".html";
    },
    /**
     * @param key
     * @param front
     * @param config
     * @returns {*}
     */
    makePostUrl: function (key, front, config) {

        if (config && config.permalink) {
            return config.permalink;
        }

        var shortKey = utils.makeShortKey(key);

        return shortKey.replace(/(md|markdown)$/i, "html");
    },
    /**
     * @param key
     * @param front
     * @param config
     * @returns {*}
     */
    makePageUrl: function (key, front, config) {

        if (config && config.permalink) {
            return config.permalink;
        }

        var shortKey = utils.makeShortKey(key);

        return shortKey.replace(/(md|markdown)$/i, "html").replace(/^\//, "");
    }
};

module.exports = utils;