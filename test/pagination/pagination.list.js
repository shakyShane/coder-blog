var _             = require("lodash");
var multiline     = require("multiline");
var sinon         = require("sinon");
var fs            = require("fs");
var assert        = require("chai").assert;
var dust          = require("dustjs-linkedin");
dust.cache        = {};
dust.isDebug = true;
dust.optimizers.format = function(ctx, node) { return node; };

var coderBlog = require("../../coder-blog");
//coderBlog.setLogLevel("debug");

var defaultLayout = multiline.stripIndent(function(){/*
<!DOCTYPE html>
<html>
{>head /}
<body>
{#content /}
</body>
</html>
*/});

var postLayout = multiline.stripIndent(function(){/*
<!DOCTYPE html>
<html>
{>head /}
<body class="post">
{#content /}
</body>
</html>
*/});

describe("Creating a pagination index", function(){

    var fsStub;

    before(function () {
        fsStub = sinon.stub(fs, "readFileSync");
    });
    after(function () {
        fsStub.restore();
    });
    afterEach(function () {
        fsStub.reset();
    });

    beforeEach(function () {

        coderBlog.clearCache();

        // Add layouts to cache
        coderBlog.populateCache("_layouts/post-test.html", postLayout);
        coderBlog.populateCache("_layouts/default.html", defaultLayout);

        // Add HEAD section to cache
        coderBlog.populateCache("_includes/head.html", "<head><title>{page.title} {site.sitename}</title></head>");
    });

    it.only("Can use site variables", function(done) {

        var post1 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Post 1"
         date: 2013-11-13
         ---

         Post 1

         */});
        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Post 2"
         date: 2013-11-14
         ---

         Post 2

         */});
        var post3 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Post 3"
         date: 2013-11-15
         ---

         Post 3

         */});
        var post4 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Post 4"
         date: 2013-11-16
         ---

         Post 4

         */});
        var post5 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Post 5"
         date: 2013-11-17
         ---

         Post 5

         */});
        var post6 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Post 6"
         date: 2013-11-18
         ---

         Post 6

         */});

        var page1 = multiline.stripIndent(function(){/*
         ---
         layout: default
         title: "About us"
         paginate: posts
         ---

         {#paged}
         {title}{~n}
         {/paged}

         */});

        coderBlog.addPost("_posts/post1.md", post1, {});
        coderBlog.addPost("_posts/post2.md", post2, {});
        coderBlog.addPost("_posts/post3.md", post3, {});
        coderBlog.addPost("_posts/post4.md", post4, {});
        coderBlog.addPost("_posts/post5.md", post5, {});
        coderBlog.addPost("_posts/post6.md", post6, {});

        coderBlog.addPage("blog/index.html", page1, {});

        coderBlog.compileOne("blog/index.html", {}, function (err, out) {

            assert.equal(_.contains(out[0].compiled, "<p>Post 6</p>"), true);
            assert.equal(_.contains(out[0].compiled, "<p>Post 5</p>"), true);
            assert.equal(_.contains(out[0].compiled, "<p>Post 4</p>"), true);

            assert.equal(_.contains(out[1].compiled, "<p>Post 3</p>"), true);
            assert.equal(_.contains(out[1].compiled, "<p>Post 2</p>"), true);
            assert.equal(_.contains(out[1].compiled, "<p>Post 1</p>"), true);

            done();
        });
    });
});