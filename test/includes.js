var _             = require("lodash");
var multiline     = require("multiline");
var assert        = require("chai").assert;
var dust          = require("dustjs-linkedin");
dust.cache        = {};
dust.isDebug = true;
dust.optimizers.format = function(ctx, node) { return node; };

var coderBlog = require("../coder-blog");
//coderBlog.setLogLevel("debug");

var postLayout = multiline.stripIndent(function(){/*
<!DOCTYPE html>
<html>
{>head /}
<body class="post">
{#content /}
</body>
</html>
*/});

var pageLayout = multiline.stripIndent(function(){/*
<!DOCTYPE html>
<html>
{#inc src="head.html" /}
<body class="page">
{#content /}
</body>
</html>
*/});

var post1 = multiline.stripIndent(function(){/*
---
layout: post-test
title: "Function Composition in Javascript."
date: 2013-11-13 20:51:39
---

Hi there {page.title}

*/});

describe("Processing a file", function(){

    beforeEach(function () {
        coderBlog.clearCache();

        // Add layouts to cache
        coderBlog.populateCache("_layouts/post-test.html", postLayout);
        coderBlog.populateCache("_layouts/page-test.html", pageLayout);

        // Add HEAD section to cache
        coderBlog.populateCache("_includes/head.html", "<head><title>{page.title} {site.sitename}</title></head>");
    });

    it("Uses layout", function(done) {

        var post = coderBlog.addPost("_posts/post2.md", post1, {});
        coderBlog.compileOne(post, {siteConfig: {sitename: "({shakyShane})"}}, function (err, out) {
            assert.isTrue(_.contains(out, 'Function Composition in Javascript'));
            assert.isTrue(_.contains(out, '({shakyShane})'));
            done();
        });
    });

    it("Knows about posts", function(done) {

        var index = multiline.stripIndent(function(){/*
         ---
         layout: page-test
         title: "Homepage"
         markdown: "false"
         ---

         #Welcome to my blog. {?posts}I have written before..{/posts}
         */});

        var page = coderBlog.addPage("index.html", index, {});
        coderBlog.compileOne(page, {}, function (err, out) {
            assert.isTrue(_.contains(out, '#Welcome to my blog.'));
            assert.isFalse(_.contains(out, 'I have written before..'));
            done();
        });
    });

    it("Knows about posts and pages (when they are added)", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blogging is coolio"
         date: 2013-11-13 20:51:39
         ---

         #{page.title}
         */});

        var index = multiline.stripIndent(function(){/*
         ---
         layout: page-test
         title: "Homepage"
         ---

         #Welcome to my blog
         {#posts}
         [{title}](#)
         {/posts}
         */});


        // NO POSTS ADDED
        coderBlog.addPost("_posts/post1.html", post1, {});
        coderBlog.addPost("_posts/post2.html", post2, {});
        var page = coderBlog.addPage("index.html", index, {});
        coderBlog.compileOne(page, {}, function (err, out) {

            assert.isTrue(_.contains(out, '<h1 id="welcome-to-my-blog">Welcome to my blog</h1>'));
            assert.isTrue(_.contains(out, '<p><a href="#">Function Composition in Javascript.</a></p>'));
            assert.isTrue(_.contains(out, '<p><a href="#">Blogging is coolio</a></p>'));

            done();
        });
    });

    it("Setting short keys for includes in cache", function(done) {

        var index = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blogging is coolio"
         date: 2013-11-13 20:51:39
         ---

         {>"includes/button.tmpl.html" text="Sign Up" /}
         */});

        // NO POSTS ADDED
        coderBlog.populateCache("/_includes/button.tmpl.html", "<button>{text}</button>");
        var page = coderBlog.addPage("index.html", index, {});
        coderBlog.compileOne(page, {}, function (err, out) {
            assert.isTrue(_.contains(out, '<button>Sign Up</button>'));
            done();
        });
    });

    it("Setting PARTIAL short keys for includes in cache", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blogging is coolio"
         date: 2013-11-13 20:51:39
         ---

         {>button /}

         */});

        // NO POSTS ADDED
        coderBlog.populateCache("user/whatever/_includes/button.html", "<button>Sign up</button>");
        coderBlog.addPage("werg/wergwerg/wergwergw/werg/_posts/post1.md", post2, {});
        coderBlog.compileOne("posts/post1.md", {}, function (err, out) {
            assert.isTrue(_.contains(out, '<button>Sign up</button>'));
            done();
        });
    });

    it("Setting short keys, but still allow paths for includes in cache", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blog Title"
         date: 2013-11-13 20:51:39
         ---

         {#inc src="button" text="Sign up"/}

         */});

        // NO POSTS ADDED
        var post = coderBlog.addPage("wef/_posts/post2.md", post2, {});
        coderBlog.populateCache("some/Random/path/_includes/button.html", "<button>{params.text}</button>");
        coderBlog.compileOne(post, {}, function (err, out) {
            assert.isTrue(_.contains(out, '<button>Sign up</button>'));
            done();
        });
    });

    it("Allows access to include params via 'params' namespace to deal with any conflicts", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blogging is coolio"
         date: 2013-11-13 20:51:39
         markdown: "false"
         ---

         {#inc src="button.tmpl" text="Sign Up" /}

         {site.title}

         */});

        // NO POSTS ADDED
        coderBlog.populateCache("_includes/button.tmpl.html", "<button>{params.text}</button>");
        coderBlog.addPage("_posts/post2.md", post2, {});
        coderBlog.compileOne("posts/post2.md", {siteConfig: {title: "Blog Name"}}, function (err, out) {
            assert.isTrue(_.contains(out, '<button>Sign Up</button>'));
            assert.isTrue(_.contains(out, 'Blog Name'));
            done();
        });
    });


    it("Allows includes that are not in the cache", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blogging is coolio"
         date: 2013-11-13 20:51:39
         markdown: "false"
         ---

         {#inc src="snippet" name="Title: " /}

         */});

        // NO POSTS ADDED
        coderBlog.addPost("_posts/post2.md", post2, {});
        coderBlog.compileOne("_posts/post2.md", {siteConfig: {sitename: "(shakyShane)"}}, function (err, out) {
            assert.isTrue(_.contains(out, 'var shane = "hi";'));
            done();
        });
    });

    it("Allows highlighting", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blogging is coolio"
         date: 2013-11-13 20:51:39

         ---

         ```js
         var shane;
         ```

         */});

        // NO POSTS ADDED
        coderBlog.addPost("_posts/post2.md", post2, {});
        coderBlog.compileOne("_posts/post2.md", {siteConfig: {sitename: "(shakyShane)"}}, function (err, out) {
            assert.isTrue(_.contains(out, '<span class="hljs-keyword">var</span>'));
            done();
        });
    });

    it("Allows highlighting via a helper", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Highlight Helper"
         date: 2013-11-13 20:51:39
         ---

         {page.title}

         {#inc src="button" type="primary" text="Sign up"/}

         {#snippet src="function2.js" name="shane"/}

         */});

        coderBlog.populateCache("_snippets/function2.js", 'var name = "shane"');
        var post = coderBlog.addPost("_posts/post2.md", post2, {});
        coderBlog.compileOne(post, {siteConfig: {sitename: "(shakyShane)"}}, function (err, out) {
            assert.isTrue(_.contains(out, '<button class="button button--primary">Sign up</button>'));
            assert.isTrue(_.contains(out, '<code class="lang-js"><span class="hljs-keyword">var</span> name = <span class="hljs-string">"shane"</span>'));
            done();
        });
    });
});