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

    it("Can use site variables", function(done) {

        var index = multiline.stripIndent(function(){/*
         ---
         layout: page-test
         title: "Homepage"
         markdown: "false"
         ---

         #Welcome to my blog. {?posts}I have written before..{/posts}
         */});


        // NO POSTS ADDED
        coderBlog.addPage("index.html", index);
        coderBlog.compileOne(index, {}, function (err, out) {
            assert.isTrue(_.contains(out, '#Welcome to my blog.'));
            assert.isFalse(_.contains(out, 'I have written before..'));
            done();
        });
    });

    it("Can use site variables + Inline code snippets that have braces", function(done) {

        var index = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Homepage"
         randomVar: "Kittenz"
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
        coderBlog.addPage("index.html", index);
        coderBlog.compileOne(index, {}, function (err, out) {
            assert.isTrue(_.contains(out, '<h1 id="homepage">Homepage</h1>'));
            assert.isTrue(_.contains(out, '<p>Kittenz</p>'));
            done();
        });
    });
    it("Can use site variables + Inline code snippets that have braces (2)", function(done) {

        var index = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Homepage"
         randomVar: "Kittenz"
         ---

         `var shane = function(){ return; } `

         */});


        // NO POSTS ADDED
        coderBlog.addPage("index.html", index);
        coderBlog.compileOne(index, {}, function (err, out) {
            assert.isTrue(_.contains(out, '<p><code>var shane = function(){ return; }</code></p>'));
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
         ---

         {#hl src="function.js" lang=page.lang/}

         */});


        // NO POSTS ADDED
        coderBlog.addPage("index.html", index);
        coderBlog.compileOne(index, {}, function (err, out) {
            assert.isTrue(_.contains(out, '<code class="lang-js">'));
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
        coderBlog.compileOne(index, {}, done); // Good if no error thrown
    });
});