var _             = require("lodash");
var multiline     = require("multiline");
var assert        = require("chai").assert;
var dust          = require("dustjs-linkedin");
dust.cache        = {};
dust.isDebug = true;
dust.optimizers.format = function(ctx, node) { return node; };

var coderBlog = require("../coder-blog");
coderBlog.setLogLevel("debug");

var postLayout = multiline.stripIndent(function(){/*
 <!DOCTYPE html>
 <html>
 {>head /}
 <body class="post">
 {>content /}
 </body>
 </html>
 */});

var pageLayout = multiline.stripIndent(function(){/*
<!DOCTYPE html>
<html>
{>head /}
<body class="page">
{>content /}
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
        coderBlog.populateCache("/_layouts/post-test.html", postLayout);
        coderBlog.populateCache("/_layouts/page-test.html", pageLayout);

        // Add HEAD section to cache
        coderBlog.populateCache("head", "<head><title>{page.title} {site.sitename}</title></head>");
    });

    it("Uses layout", function(done) {

        coderBlog.compileOne(post1, {siteConfig: {sitename: "({shakyShane})"}}, function (out) {
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


        // NO POSTS ADDED
        coderBlog.addPage("index.html", index);
        coderBlog.compileOne(index, {}, function (out) {
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
        coderBlog.addPost("post1.html", post1);
        coderBlog.addPost("post2.html", post2);
        coderBlog.addPage("index.html", index);
        coderBlog.compileOne(index, {}, function (out) {

            assert.isTrue(_.contains(out, '<h1 id="welcome-to-my-blog">Welcome to my blog</h1>'));
            assert.isTrue(_.contains(out, '<p><a href="#">Function Composition in Javascript.</a></p>'));
            assert.isTrue(_.contains(out, '<p><a href="#">Blogging is coolio</a></p>'));

            done();
        });
    });

    it("Setting short keys for includes in cache", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blogging is coolio"
         date: 2013-11-13 20:51:39
         ---

         {>button text="Sign Up" /}
         */});

        // NO POSTS ADDED
        coderBlog.populateCache("/_includes/button.tmpl.html", "<button>{text}</button>");
        coderBlog.compileOne(post2, {}, function (out) {
            assert.isTrue(_.contains(out, '<button>Sign Up</button>'));
            done();
        });
    });

    it.only("Setting short keys, but still allow paths for includes in cache", function(done) {

        var post2 = multiline.stripIndent(function(){/*
         ---
         layout: post-test
         title: "Blogging is coolio"
         date: 2013-11-13 20:51:39
         ---

         {#inc tmpl="button" text="Sign up"/}

         */});

        // NO POSTS ADDED
        coderBlog.populateCache("/_includes/button.tmpl.html", "<button>{text}</button>");
        coderBlog.compileOne(post2, {}, function (out) {
            console.log(out);
            assert.isTrue(_.contains(out, '<button>Sign up</button>'));
            done();
        });
    });
});