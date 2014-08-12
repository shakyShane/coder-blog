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

describe("Processing a file", function(){

    beforeEach(function () {
        coderBlog.clearCache();
    });

    it("Uses layout", function(done) {

        var joined = getContent("#shane");

        coderBlog.populateCache("/_layouts/post-test.html", layout1);
        coderBlog.compileOne(joined, {}, function (out) {
            assert.isTrue(_.contains(out, '<h1 id="shane">shane</h1>'));
            done();
        });
    });

    it("does includes", function(done) {

        var joined = getContent("{ include: shane.html }");

        var layout = multiline.stripIndent(function(){/*
         { yield: content }
         */});

        coderBlog.clearCache();
        coderBlog.populateCache("/_includes/shane.html", "some content from include");
        coderBlog.populateCache("/_layouts/post-test.html", layout);
        coderBlog.compileOne(joined, {}, function (out) {
            assert.isTrue(_.contains(out, 'some content from include'));
            done();
        });
    });
    it("does recursive includes", function(done) {

        var joined  = getContent("{ include: shane.html }");
        var innerInclude = "Katz are koolz";

        var layout = multiline.stripIndent(function(){/*
         { yield: content }
         */});

        coderBlog.clearCache();
        coderBlog.populateCache("/_includes/shane.html", "{ include: katz.html } - true");
        coderBlog.populateCache("/_includes/katz.html", innerInclude);
        coderBlog.populateCache("/_layouts/post-test.html", layout);
        coderBlog.compileOne(joined, {}, function (out) {
            assert.isTrue(_.contains(out, '<p>Katz are koolz - true</p>'));
            done();
        });
    });
});