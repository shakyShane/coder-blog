var _             = require("lodash");
var assert        = require("chai").assert;
var multiline     = require("multiline");

var Page = require("../../lib/page");

var page1 = multiline.stripIndent(function(){/*
---
layout: default
title: "Homepage"
---

Page 1
 */});

describe("Creating a PAGE with maximum info", function(){

    it("return an instance", function() {
        var page = new Page("projects/about-us.html", page1);
        assert.isTrue(page instanceof Page);
    });
    it.skip("Has access to front matter", function() {

        var page = new Page("projects/about-us.html", page1);

        assert.deepEqual(page.front.title,  "Homepage",                "Adds title from front");
        assert.deepEqual(page.front.layout, "default",                 "Adds layout from front");
        assert.deepEqual(page.content,      "\nPage 1",                "Page 1");
        assert.deepEqual(page.key,          "projects/about-us.html",  "Adds Key");
        assert.deepEqual(page.url,          "/projects/about-us.html", "Adds URL");
        assert.deepEqual(page.filePath,     "projects/about-us.html",  "Adds filename");
        assert.deepEqual(page.type,         "page",                    "Adds Adds type");
    });
});

//describe("Creating a POST with maximum info", function(){
//
//    it("Has access to front matter", function() {
//
//        var page1 = multiline.stripIndent(function(){/*
//         ---
//         title: "About us"
//         ---
//         About us page
//
//         */});
//
//        var pageItem = new Post("about-us.html", page1);
//
//        assert.deepEqual(pageItem.front.title,    "About us",        "Adds title from front");
//        assert.deepEqual(pageItem.content,        "About us page",   "Adds Content");
//        assert.deepEqual(pageItem.key,            "about-us.html",   "Adds Key");
//        assert.deepEqual(pageItem.url,            "/about-us.html",  "Adds URL");
//        assert.deepEqual(pageItem.type,           "page",            "Adds Type");
//
//        assert.isUndefined(pageItem.front.layout, "Doesn't assign a layout");
//    });
//});