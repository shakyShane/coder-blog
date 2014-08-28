var path   = require("path");
var fs     = require("fs");
var _      = require("lodash");
var yaml   = require("js-yaml");
var moment = require("moment");


var utils = {
    /**
     * Shortkey for includes
     * @param key
     * @returns {*}
     */
    makeShortKey: function (key) {
        return key.replace(/(.+?)?_((includes|layouts|snippets|posts|pages|data)(.+))/, "$2");
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
        return utils.stripExtension(path.basename(key));
    },
    /**
     * @param key
     * @returns {*}
     */
    stripExtension: function (key) {
        return key.replace(path.extname(key), "");
    },
    /**
     * Create a URL based off a short-key.
     *
     * EG: given: posts/js/post1.md
     *     out:   { fileName: "js/post1.html", url: "/js/post1.md" }
     *
     * @param {String} key - Short-key like `posts/js/post1.md` or `includes/footer.html`
     * @param {Object} [config]
     * @returns {{filePath: string, url: string}}
     */
    makePostUrl: function (key, config) {

        var tempUrl = utils.stripExtension(
            key.replace(/^posts\//, "")
        );

        var split = utils.extractDateFromKey(tempUrl);
        tempUrl = split.url;

        var filePath = tempUrl;
        var url      = tempUrl;

        if (key.match(/(.+)\//)) {

            if (config && config.postUrlFormat) {

                tempUrl = config.postUrlFormat
                    .replace(":pretty", tempUrl);

                filePath = tempUrl + "/index.html";
                url = tempUrl;

            } else {
                filePath = tempUrl + ".html";
                url = tempUrl + ".html";
            }
        }

        return {
            filePath: utils.completePath(filePath),
            url: utils.completeUrl(url)
        }
    },
    /**
     * Remove a date from front of key.
     * Format: YYYY-MM-DD
     * EG:     2014-06-21-post1 -> {date: 2014-06-21, url: post1}
     * @param {String} url
     * @returns {{date: string, url: string}|string}
     */
    extractDateFromKey: function (url) {

        var match = url.match(/^(\d{4}-\d{2}-\d{2})-(.+)/);

        var date;
        var tempUrl = url;

        if (match && match.length) {
            date    = match[1];
            tempUrl = match[2];
        }

        return {
            date: date,
            url: tempUrl
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
     * @param string
     * @returns {*}
     */
    parseYaml: function (string) {
        return yaml.safeLoad(string);
    },
    /**
     * @param key
     */
    isYaml: function (key) {
        return key.match(/yml$/i);
    },
    /**
     *
     */
    makePropertyName: function (key, value, obj) {

        if (!obj) {
            return;
        }

        var stripped = utils.stripExtension(key.replace(/^data\//, ""));
        var basename = utils.getBaseName(key);

        if (!stripped.match(/\//)) {

            return obj[basename] = value;

        } else {

            var propPath = stripped.replace(/\//g, ".");

            return utils.setName(propPath, value, obj);
        }
    },
    /**
     * @param path
     * @param value
     * @param obj
     */
    setName: function (path, value, obj) {

        var schema = obj;  // a moving reference to internal objects within obj
        var segs   = path.split('.');
        var len    = segs.length;

        for(var i = 0; i < len-1; i++) {
            var elem = segs[i];
            if( !schema[elem] ) schema[elem] = {};
            schema = schema[elem];
        }

        schema[segs[len-1]] = value;

        return obj;
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
    },
    /**
     * @param posts
     * @param config
     * @returns {*}
     */
    prepareFrontVars: function (posts, config) {

        return Array.isArray(posts)
            ? _.map(posts, utils.promoteVars.bind(null, config))
            : utils.promoteVars(config, posts);
    },
    /**
     * Promote front-matter vars to top-level (ready for templates)
     * @param post
     * @param config
     * @returns {*}
     */
    promoteVars: function(config, post) {

        _.each(post.front, function (value, key) {
            if (_.isUndefined(post[key])) {
                post[key] = value;
            }
        });

        post.date = moment(post.dateObj).format(config.dateFormat);

        return post;
    },

    /**
     * For every include, we create a special environment.
     * Inline variables always take precendence, and any conflicting
     * names are underscored.
     * @param params
     * @param data
     * @returns {{params: {}}}
     */
    prepareSandbox: function(params, data) {

        var sandBox = {
            params: {}
        };

        // inline params ALWAYS take precedence
        _.each(params, function (value, key) {
            sandBox[key] = value;
            sandBox.params[key] = value;
        });

        // Now add site-vars, with underscores if needed.
        _.each(Object.keys(data), function (key) {

            // if it exists in sandbox, underscore it
            if (!_.isUndefined(sandBox[key])) {
                sandBox["_" + key] = data[key];
            } else {
                sandBox[key] = data[key];
            }
        });

        return sandBox;
    },
    /**
     * @param string
     * @param [delimiter]
     * @returns {*|Array}
     */
    splitMeta: function (string, delimiter) {
        if (string.indexOf(delimiter || ":")) {
            return string.split(delimiter || ":");
        }
        return string;
    }
};

module.exports = utils;