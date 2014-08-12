var _             = require("lodash");
var multiline     = require("multiline");
var assert        = require("chai").assert;
var coderBlog     = require("../coder-blog");

var layout1 = multiline(function(){/*
<!DOCTYPE html>
<html>
<head></head>
<body>
{ yield: content }
</body>
</html>
 */});

describe("Processing a file", function(){

    beforeEach(function () {
        coderBlog.clearCache();
        coderBlog.populateCache("/_layouts/post-test.html", layout1);
    });

    it("Uses layout", function(done) {

        var post1 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Function Composition in Javascript."
         date: 2013-11-13 20:51:39
         ---

         #shane
         */});

        coderBlog.compileOne(post1, {}, function (out) {
            assert.isTrue(_.contains(out, '<h1 id="shane">shane</h1>'));
            done();
        });
    });

    it("does includes", function(done) {

        var post1 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Function Composition in Javascript."
         date: 2013-11-13 20:51:39
         ---

         { include: shane.html }
         */});

        coderBlog.populateCache("/_includes/shane.html", "some content from include");
        coderBlog.compileOne(post1, {}, function (out) {
            assert.isTrue(_.contains(out, 'some content from include'));
            done();
        });
    });
    it("does recursive includes", function(done) {

        var innerInclude = "Katz are koolz";
        var include      = "{ include: katz.html } - true";

        var post1 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Function Composition in Javascript."
         date: 2013-11-13 20:51:39
         ---

         { include: shane.html }
         */});

        coderBlog.populateCache("/_includes/shane.html", include);
        coderBlog.populateCache("/_includes/katz.html", innerInclude);
        coderBlog.compileOne(post1, {}, function (out) {
            assert.isTrue(_.contains(out, '<p>Katz are koolz - true</p>'));
            done();
        });
    });
});