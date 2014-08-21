//var _             = require("lodash");
//var assert        = require("chai").assert;
//
//var coderBlog = require("../coder-blog");
//
//describe("Cache management", function(){
//    beforeEach(function () {
//        coderBlog.clearCache();
//    });
//    it("Adds items", function() {
//
//        var cache = coderBlog.populateCache("/user/erfqe/_snippets/function.js", "1");
//
//        var expected = {
//            "snippets/function.js": "1"
//        };
//
//        assert.deepEqual(cache, expected);
//    });
//    it("Adds items", function(){
//
//        var cache = coderBlog.populateCache("_snippets/function.js", "1");
//
//        var expected = {
//            "snippets/function.js": "1"
//        };
//
//        assert.deepEqual(cache, expected);
//    });
//    it("Adds items", function(){
//
//        var cache = coderBlog.populateCache("_layouts/head.html", "1");
//
//        var expected = {
//            "layouts/head.html": "1"
//        };
//
//        assert.deepEqual(cache, expected);
//    });
//    it("Adds items with paths", function(){
//
//        var cache = coderBlog.populateCache("_layouts/blog/head.html", "1");
//
//        var expected = {
//            "layouts/blog/head.html": "1"
//        };
//
//        assert.deepEqual(cache, expected);
//    });
//
//    it("Adds items with partial key", function(){
//
//        var cache = coderBlog.populateCache("_includes/blog/head.html", "1");
//
//        var expected = {
//            "includes/blog/head.html": "1",
//            "head": "1"
//        };
//
//        assert.deepEqual(cache, expected);
//    });
//
//    it("does not overide existing partial keys", function(){
//
//        var cache = coderBlog.populateCache("_includes/blog/head.html", "1");
//            cache = coderBlog.populateCache("_includes/news/head.html", "20");
//
//        var expected = {
//            "includes/news/head.html": "20",
//            "includes/blog/head.html": "1",
//            "head": "1"
//        };
//
//        assert.deepEqual(cache, expected);
//    });
//
//    describe("Retreiving items", function () {
//
//        it("Retrieves Items", function(){
//
//            coderBlog.populateCache("_layouts/head.html", "1");
//            var actual = coderBlog.getFromCache("layouts/head.html", true);
//            var expected = "1";
//
//            assert.deepEqual(actual, expected);
//        });
//        it("Retrieves Items", function(){
//
//            coderBlog.populateCache("/user/shakyshane/_layouts/head.html", "1");
//            var actual = coderBlog.getFromCache("layouts/head.html", true);
//            var expected = "1";
//
//            assert.deepEqual(actual, expected);
//        });
//        it("Retrieves Items", function(){
//
//            coderBlog.populateCache("_layouts/head.html", "1");
//            var actual = coderBlog.getFromCache("layouts/head", true);
//            var expected = "1";
//
//            assert.deepEqual(actual, expected);
//        });
//        it("Retrieves Items using single key", function(){
//
//            coderBlog.populateCache("_layouts/head.html", "1");
//            var actual = coderBlog.getFromCache("head", true);
//            var expected = "1";
//
//            assert.deepEqual(actual, expected);
//        });
//    });
//});