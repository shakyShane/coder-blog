var _             = require("lodash");
var assert        = require("chai").assert;
var multiline     = require("multiline");

var Post      = require("../../lib/post").Post;
var Page      = require("../../lib/page");
var Cache     = require("../../lib/cache").Cache;
var coderBlog = require("../../coder-blog");

var content1 = multiline.stripIndent(function(){/*
 ---
 layout: post-test
 title: "Blog 1"
 date: 2013-11-13
 categories: javascript, node js
 tags: code, jquery-ui, how to guide
 ---

 post1
 */});

var content2 = multiline.stripIndent(function(){/*
 ---
 layout: featured
 title: "Blog 2"
 date: 2013-11-14
 ---

 post2
 */});

describe("Paginating the posts", function(){
    var _cache, post1, post2, post3, post4, post5, post6;
    beforeEach(function () {
        _cache    = new Cache();
        post1     = new Post("_posts/post1.md", content1);
        post2     = new Post("_posts/post2.md", content2);
        post3     = new Post("_posts/post3.md", content2);
        post4     = new Post("_posts/post4.md", content2);
        post5     = new Post("_posts/post5.md", content2);
        post6     = new Post("_posts/post6.md", content2);
    });
    it("Should split items", function(){
        var cache = _cache.addPosts([post1, post2, post3, post4, post5, post6]);
        assert.equal(cache.posts().length, 6);

        var paginator = _cache.paginate(3);
        assert.equal(paginator.length, 2);
        assert.equal(paginator[0].length, 3);
        assert.equal(paginator[1].length, 3);
    });
    it("Should create pages", function(){

        var cache = _cache.addPosts([post1, post2, post3, post4, post5, post6]);
        assert.equal(cache.posts().length, 6);
        var paginator = _cache.paginate(3, "posts");

        var pages = coderBlog.makePaginationPages(paginator);

        assert.equal(pages.length, 2);
        assert.equal(pages.length, 2);

        assert.equal(pages[0].page.url, "/blog");
        assert.equal(pages[0].page.filePath, "blog/index.html");

        assert.equal(pages[1].page.url, "/blog/page2");
        assert.equal(pages[1].page.filePath, "blog/page2/index.html");
    });
});