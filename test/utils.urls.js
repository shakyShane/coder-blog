var assert      = require("chai").assert;
var _           = require("lodash");
var makePostUrl = require("../utils").makePostUrl;
var tests = [
    {
        item: {},
        key:           "posts/post1.md",
        config: {
            urlFormat: "/blog/:filename"
        },
        expected: {
            filePath:  "blog/post1/index.html",
            url:       "/blog/post1"
        },
        message:       "Replaces filename"
    },
    {
        item: {},
        key:           "posts/javascript/post1.md",
        config: {
            urlFormat: "/blog/:filename"
        },
        expected: {
            filePath:  "blog/post1/index.html",
            url:       "/blog/post1"
        },
        message:       "Strips sub-dirs"
    },
    {
        item: {},
        key:           "posts/javascript/post1.md",
        config: {
            urlFormat: false
        },
        expected: {
            filePath:  "posts/javascript/post1.html",
            url:       "/posts/javascript/post1.html"
        },
        message:       "Respects sub directories"
    },
    {
        item: {},
        key:           "posts/javascript/post1.md",
        config: {
            urlFormat: "/:filename"
        },
        expected: {
            filePath:  "post1/index.html",
            url:       "/post1"
        },
        message:       "Allows filename only with paths"
    },
    {
        item: {},
        key:           "/index.html",
        config: {
            urlFormat: "/:filename"
        },
        expected: {
            filePath:  "index.html",
            url:       "/index.html"
        },
        message:       "Allows filename only"
    }
];


describe("Creating urls", function(){
    tests.forEach(function (item) {
        it(item.message, function(){
            var actual   = makePostUrl(item.key, item.item, item.config);
            assert.deepEqual(actual, item.expected, item.message);
        });
    });
});

