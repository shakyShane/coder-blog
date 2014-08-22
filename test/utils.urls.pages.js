var assert      = require("chai").assert;
var _           = require("lodash");
var makePageUrl = require("../lib/utils").makePageUrl;
var tests = [
    {
        key:           "index.html",
        config: {
            urlFormat: "pretty"
        },
        expected: {
            filePath:  "index.html",
            url:       "/index.html"
        },
        message:       "Homepage"
    },
    {
        item: {},
        key:           "about.html",
        config: {
            urlFormat: "pretty"
        },
        expected: {
            filePath:  "about/index.html",
            url:       "/about"
        },
        message:       "any html files in root"
    },
    {
        item: {},
        key:           "projects/page1.html",
        config: {
            urlFormat: "pretty"
        },
        expected: {
            filePath:  "projects/page1/index.html",
            url:       "/projects/page1"
        },
        message:       "any html files in sub-dir"
    }
];


describe.only("Creating urls for pages", function(){
    tests.forEach(function (item) {
        it(item.message, function(){
            var actual   = makePageUrl(item.key, item.config);
            assert.deepEqual(actual, item.expected, item.message);
        });
    });
});

