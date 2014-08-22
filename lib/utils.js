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
     * @param content
     * @param lang
     * @returns {string}
     */
    wrapCode: function (content, lang) {
        content = content.replace(/^\n/, "");
        return "<pre><code%c>%s</code></pre>"
            .replace("%c", lang ? ' class="lang-' + lang + '"' : "")
            .replace("%s", content);
    },
    /**
     * Wrap a snippet include
     * @param content
     * @param lang
     */
    wrapSnippet: function (content, lang) {
        var string = "```%lang%\n" + content + "\n```";
        return string.replace("%lang%", lang);
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

        var prefix = "includes/";

        if (name.match(/^includes/)) {
            prefix = "";
        }

        if (name.match(/html$/)) {
            return prefix + name;
        }

        return prefix + name + ".html";
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
     * @returns {*|XML|string|void}
     */
    getBaseName: function (key) {
        return path.basename(key).replace(path.extname(key), "");
    },
    /**
     * @param key
     * @param config
     * @returns {{filePath: *, url: *}}
     */
    makePostUrl: function (key, config) {

        // Default is just to rename md/markdown to html
        var basename = utils.getBaseName(key);
        var url      = key.replace(/(md|markdown)$/, "html");

        if (key.match(/(.+)\//)){

            if (config && config.urlFormat) {

                url = config.urlFormat
                    .replace(":filename", basename);

                var filePath = url + "/index.html";

                return {
                    filePath: utils.completePath(filePath),
                    url: utils.completeUrl(url)
                }
            }
        }

        return {
            filePath: utils.completePath(url),
            url: utils.completeUrl(url)
        }
    },
    /**
     * @param key
     * @param [config]
     * @returns {*}
     */
    makePageUrl: function (key, config) {

        var basename = utils.getBaseName(key);
        var filePath = "";
        var url      = key;
        var finalFilePath;
        var finalUrl;

        if (key.match(/^\/?index\.html/)) {
            return {
                "filePath": "index.html",
                "url": "/index.html"
            }
        }

        if (key.match(/(.+)\//)){ // sub dirs

            url = key.replace(/\.html$/, "");

            // check if it's an index file.
            var isIndex = url.match(/(.+?)\/index$/);

            if (isIndex) {
                finalFilePath = key;
                finalUrl = isIndex[1];
            } else {
                finalFilePath = url + "/index.html";
                finalUrl = url;
            }
        } else {

            finalFilePath = basename + "/index.html";
            finalUrl      = basename;
        }

        return {
            filePath: utils.completePath(finalFilePath),
            url: utils.completeUrl(finalUrl)
        }
    },
    /**
     * Add forward slash if it doesn't yet exist.
     * @param current
     * @returns {*}
     */
    completeUrl: function (current) {
        return current.match(/^\//)
            ? current
            : "/" + current;
    },
    /**
     * Remove any forward slashes from file-paths
     * @param current
     * @returns {*}
     */
    completePath: function (current) {
        return current.replace(/^\//, "");
    },
    /**
     * Check if file has front matter
     * @param file
     * @returns {boolean}
     */
    hasFrontMatter: function (file) {
        return file.match(/^---\n/);
    },
    /**
     * @param file
     * @returns {*}
     */
    readFrontMatter: function (file) {
        if (/^---\n/.test(file)) {
            var end = file.search(/\n---\n/);
            if (end != -1) {
                return {
                    front: yaml.load(file.slice(4, end + 1)) || {},
                    content: file.slice(end + 5)
                };
            }
        }
        return {
            front: {},
            content: file
        };
    },
    /**
     * @param {String} string
     * @param {Object} [config]
     * @returns {Array}
     */
    getCategories: function (string, config) {
        if (!string || !string.length) {
            return [];
        }
        return string.split(",")
            .map(function (item) {
                return item.trim();
            }).filter(function (item) {
                return item.length;
            });
    },
    /**
     * @param {String} key
     * @returns {String}
     */
    getType: function (key) {
        return key.match(/^posts/)
            ? "post"
            : "page";
    }
};

module.exports = utils;