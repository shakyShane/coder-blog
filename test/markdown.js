var _             = require("lodash");
var multiline     = require("multiline");
var sinon         = require("sinon");
var fs            = require("fs");
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

describe("Processing a Markdown file", function(){

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
        coderBlog.populateCache("_layouts/page-test.html", pageLayout);

        // Add HEAD section to cache
        coderBlog.populateCache("_includes/head.html", "<head><title>{page.title} {site.sitename}</title></head>");
    });

    it("Does not use markdown + still have vars", function(done) {

        var index = multiline.stripIndent(function(){/*
         ---
         layout: page-test
         title: "Homepage"
         date: 2014-04-10
         ---

         #Welcome to my blog. {?posts}I have written before..{/posts}
         */});


        // NO POSTS ADDED
        coderBlog.addPage("index.html", index);
        coderBlog.compileOne("index.html", {}, function (err, out) {
            console.log(out.compiled);
            var compiled = out.compiled;
            assert.isTrue(_.contains(compiled, '#Welcome to my blog.'));
            assert.isFalse(_.contains(compiled, 'I have written before..'));
            done();
        });
    });

    it("Can use site variables + Inline code snippets that have braces", function(done) {

        var index = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Homepage"
         randomVar: "Kittenz"
         date: 2014-04-10
         ---

         #{page.title} {?posts}I have written before..{/posts}

         ```css
         @mixin inline-block(){
         display: inline-block;
         zoom: 1;
          *display: inline;
         }
         ```

         {post.randomVar}

         */});


        // NO POSTS ADDED
        coderBlog.addPost("_posts/post1.md", index);
        coderBlog.compileOne("_posts/post1.md", {}, function (err, out) {
            assert.isTrue(_.contains(out.compiled, '<p>Kittenz</p>'));
            done();
        });
    });
    it("Can use site variables + Inline code snippets that have braces (2)", function(done) {

        var index = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Homepage"
         randomVar: "Kittenz"
         date: 2014-04-10
         ---

         `var shane = function(){ return; } `

         */});


        // NO POSTS ADDED
        var page = coderBlog.addPage("index.html", index);
        coderBlog.compileOne(page, {}, function (err, out) {
            var compiled = out.compiled;
            assert.isTrue(_.contains(compiled, 'var shane = function(){ return; }'));
            done();
        });
    });
    it("Can use site variables + external snippets", function(done) {

        fsStub.returns("var shane = function(){};");

        var index = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Homepage"
         randomVar: "Kittenz"
         lang: "js"
         date: 2014-04-10
         ---

         {#snippet src="function.js" lang=page.lang/}

         */});


        // NO POSTS ADDED
        coderBlog.addPost("_posts/index.markdown", index);
        coderBlog.compileOne("_posts/index.markdown", {}, function (err, out) {
            var compiled = out.compiled;
            assert.isTrue(_.contains(compiled, '<code class="lang-js">'));
            done();
        });
    });
    it("Can use site variables + external snippets", function(done) {

        var index = multiline.stripIndent(function(){/*
---
layout: post-test
title: "Homepage"
randomVar: "Kittenz"
lang: "js"
date: 2014-04-10
---

{post.title}

```css
.box {
display: inline-block;
zoom: 1;
*display: inline;
}
```

`.box { @include inline-block(); }`

```js
@mixin inline-block() {

display: inline-block;
zoom: 1;
    *display: inline;
}

.box {
    @include inline-block();
}
.box2 {
    @include inline-block();
}
```
         */});


        // NO POSTS ADDED
        coderBlog.addPage("index.html", index);
        coderBlog.compileOne("index.html", {}, done); // Good if no error thrown
    });
});