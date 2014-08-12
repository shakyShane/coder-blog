var _             = require("lodash");
var multiline     = require("multiline");
var assert        = require("chai").assert;
var coderBlog     = require("../coder-blog");

var layout1 = multiline(function(){/*
<!DOCTYPE html>
<html>
<head>
</head>
<body>
{ yield: content }
</body>
</html>
*/});

describe("All Posts and Pages are aware of each other", function(){

    beforeEach(function () {
        coderBlog.clearCache();
        coderBlog.populateCache("/_layouts/post-test.html", layout1);
    });

    it("can render previously added posts", function(done) {

        var post1 = multiline.stripIndent(function(){/*
            ---
            layout: post-test
            title: "Function Composition in Javascript."
            date: 2013-11-13 20:51:39
            ---

            Post 1 is pretty cool
         */});

        var post2 = multiline.stripIndent(function(){/*
            ---
            layout: post-test
            title: "Node JS"
            date: 2013-11-13 20:51:39
            ---

            Post 2 is pretty cool
         */});

        var page1 = multiline.stripIndent(function(){/*
            ---
            layout: post-test
            title: "Homepage"
            date: 2013-11-13 20:51:39
            ---
            #{page.title}
            <ul>{#posts}
                <li>{title}</li>{/posts}
            </ul>
         */});

        coderBlog.addPost("/_posts/post1.md", post1);
        coderBlog.addPost("/_posts/post2.md", post2);
        coderBlog.compileOne(page1, {}, function (out) {
            assert.isTrue(_.contains(out, '<li>Function Composition in Javascript.</li>'));
            assert.isTrue(_.contains(out, '<li>Node JS</li>'));
            done();
        });
    });
});