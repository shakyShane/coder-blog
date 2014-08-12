var _             = require("lodash");
var multiline     = require("multiline");
var assert        = require("chai").assert;
var coderBlog     = require("../coder-blog");

function getContent(string) {
    return frontMatter + "\n\n" + string;
}

var frontMatter = multiline(function(){/*
---
layout: post-test
title: "Function Composition in Javascript."
date: 2013-11-13 20:51:39
---
*/});

var layout1 = multiline(function(){/*
{ yield: content }
*/});

describe("Using custom site config", function(){

    beforeEach(function () {
        coderBlog.clearCache();
    });

    it("uses custom site-config", function(done) {

        var joined = getContent('<a href="{site.url}">{site.title}</a>');
        var config = {
            siteConfig: {
                url: "http://shakyshane.com",
                title: "shakyshane.com"
            }
        };

        coderBlog.populateCache("/_layouts/post-test.html", layout1);
        coderBlog.compileOne(joined, config, function (out) {
            assert.isTrue(_.contains(out, config.siteConfig.url));
            assert.isTrue(_.contains(out, config.siteConfig.title));
            done();
        });
    });
    it("can use front-matter vars inside post", function(done) {

        var joined = getContent('#{page.title}');
        coderBlog.populateCache("/_layouts/post-test.html", layout1);
        coderBlog.compileOne(joined, {}, function (out) {
            assert.isTrue(_.contains(out, "Function Composition in Javascript.</h1>"));
            done();
        });
    });
});