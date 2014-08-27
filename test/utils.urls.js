var assert      = require("chai").assert;
var _           = require("lodash");
var makePostUrl = require("../lib/utils").makePostUrl;
var tests = [
    {
        item: {},
        key:           "posts/post1.md",
        config: {
            postUrlFormat: "/blog/:pretty"
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
            postUrlFormat: "/blog/:pretty"
        },
        expected: {
            filePath:  "blog/javascript/post1/index.html",
            url:       "/blog/javascript/post1"
        },
        message:       "Respects sub-dirs"
    },
    {
        item: {},
        key:           "posts/post1.md",
        config: {
            postUrlFormat: "/:pretty"
        },
        expected: {
            filePath:  "post1/index.html",
            url:       "/post1"
        },
        message:       "Strips sub-dirs"
    },
    {
        item: {},
        key:           "posts/javascript/post1.md",
        config: {
            postUrlFormat: false
        },
        expected: {
            filePath:  "javascript/post1.html",
            url:       "/javascript/post1.html"
        },
        message:       "Does not create any pretty urls if False"
    },
    {
        item: {},
        key:           "posts/javascript/post1.md",
        config: {
            postUrlFormat: "/:pretty"
        },
        expected: {
            filePath:  "javascript/post1/index.html",
            url:       "/javascript/post1"
        },
        message:       "Allows filename only with paths"
    }
];


describe("Creating urls", function(){
    tests.forEach(function (item) {
        it(item.message, function(){
            var actual   = makePostUrl(item.key, item.config);
            assert.deepEqual(actual, item.expected, item.message);
        });
    });
});

