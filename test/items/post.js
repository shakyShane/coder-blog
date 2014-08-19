var _             = require("lodash");
var assert        = require("chai").assert;
var multiline     = require("multiline");

var Post = require("../../lib/post").Post;

var post1 = multiline.stripIndent(function(){/*
---
layout: post-test
title: "Homepage"
date: 2013-11-13
categories: javascript, node js
tags: code, jquery-ui, how to guide
---
post1
 */});

describe("Creating a POST with maximum info", function(){

    it("return an instance", function() {
        var postItem = new Post("_posts/post1.md", post1);
        assert.isTrue(postItem instanceof Post);
    });
    it("Has access to front matter", function() {

        var postItem = new Post("_posts/post1.md", post1);

        assert.deepEqual(postItem.front.title,  "Homepage",          "Adds title from front");
        assert.deepEqual(postItem.front.layout, "post-test",         "Adds layout from front");
        assert.deepEqual(postItem.content,      "post1",             "Adds Content");
        assert.deepEqual(postItem.key,          "posts/post1.md",    "Adds Key");
        assert.deepEqual(postItem.url,          "/posts/post1.html", "Adds URL");
        assert.deepEqual(postItem.timestamp,    1384300800000,       "Adds Timestamp");
        assert.deepEqual(postItem.type,         "post",              "Adds Timestamp");

        assert.deepEqual(postItem.categories,   ["javascript", "node js"], "Adds Categories");
        assert.deepEqual(postItem.tags,   ["code", "jquery-ui", "how to guide"], "Adds tags");

        assert.isTrue(postItem.dateObj instanceof Date);
    });
});

describe("Creating a POST with maximum info", function(){

    it("Has access to front matter", function() {

        var page1 = multiline.stripIndent(function(){/*
         ---
         title: "About us"
         ---
         About us page

         */});

        var pageItem = new Post("about-us.html", page1);

        assert.deepEqual(pageItem.front.title,    "About us",        "Adds title from front");
        assert.deepEqual(pageItem.content,        "About us page",   "Adds Content");
        assert.deepEqual(pageItem.key,            "about-us.html",   "Adds Key");
        assert.deepEqual(pageItem.url,            "/about-us.html",  "Adds URL");
        assert.deepEqual(pageItem.type,           "page",            "Adds Type");

        assert.isUndefined(pageItem.front.layout, "Doesn't assign a layout");
    });
});