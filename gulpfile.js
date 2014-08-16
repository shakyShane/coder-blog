var gulp         = require("gulp");
var browserSync  = require("browser-sync");
var reload       = browserSync.reload;
var htmlInjector = require("bs-html-injector");

var coderBlog    = require("./plugin");

var fs           = require("fs");
var sass         = require("gulp-sass");
var minifyCSS    = require("gulp-minify-css");
var rename       = require("gulp-rename");
var prefix       = require("gulp-autoprefixer");
var through2     = require("through2");
var cp           = require("child_process");
var rev          = require("gulp-rev");
var awspublish   = require('gulp-awspublish');
var yaml         = require('js-yaml');
var path         = require("path");

var configPath   = "./_config.yml";
var config       = yaml.safeLoad(fs.readFileSync(configPath, "utf-8"));

/**
 * Start BrowserSync
 */
gulp.task("browser-sync", function () {
    browserSync.use(htmlInjector, {});
    browserSync({
        server: {
            baseDir: "_site",
            routes: {
                "/img": "./img",
                "/js": "./js"

            }
        },
        open: false
    });
});

/**
 * Default task
 */
gulp.task("default", ["build-blog", "sass", "browser-sync"], function () {
    gulp.watch([
        "_layouts/**/*.html",
        "_includes/**/*.html",
        "_posts/*.md",
        "_snippets/**/*",
        "*.yml",
        "index.html"
    ],  ["build-blog", htmlInjector]);

    gulp.watch(["_scss/**/*.scss"], ["sass"]);
});

/**
 * Compile files from _scss into both _site/css (for live injecting) and site (for future jekyll builds)
 */
gulp.task("sass", function () {
    browserSync.notify("Compiling SASS...");
    return gulp.src(["_scss/**/*.scss"])
        .pipe(sass())
        .pipe(prefix(["last 5 versions", "> 1%", "ie 8"], { cascade: true }))
        .pipe(gulp.dest("_site/css"))
        .pipe(browserSync.reload({stream:true}));
//        .pipe(minifyCSS({keepBreaks:false}))
//        .pipe(rename("main.min.css"))
//        .pipe(gulp.dest("_site/css"));
});

/**
 * REV css file
 */
gulp.task("rev:css", ['sass'], function () {

    var publisher = awspublish.create(require("./.aws.json"));

    var headers = {
        'Cache-Control': 'max-age=315360000, no-transform, public',
        'Expires': new Date(Date.now() + 63072000000).toUTCString()
    };

    function updateYaml(file, cb) {
        try {
            console.log(config.css.production);
            console.log(file.s3.path);
            config.css.production = file.s3.path;
            fs.writeFileSync(configPath, yaml.safeDump(config));
        } catch (e) {
            console.log(e);
        }
        cb(null);
    }

    return gulp.src("_site/css/main.min.css")

        .pipe(rev())
        // gzip, Set Content-Encoding headers and add .gz extension
        .pipe(awspublish.gzip())

        // publisher will add Content-Length, Content-Type and  headers specified above
        // If not specified it will set x-amz-acl to public-read by default
        .pipe(publisher.publish(headers))

        // create a cache file to speed up consecutive uploads
        .pipe(publisher.cache())

        // print upload updates to console
        .pipe(through2.obj(function (file, enc, cb) {
            updateYaml(file, cb);
        }));
});

/**
 * Default task
 */
gulp.task("build", ['rev:css'], function () {

    return gulp.src(["_posts/*.md", "index.html"])
        .pipe(coderBlog())
        .pipe(gulp.dest("_site"));
});

/**
 * Default task
 */
gulp.task("build-blog", function () {

//    return gulp.src(["_posts/*.md", "_includes/**/*.html", "_layouts/*.html", "index.html"])
    return gulp.src([
        "_posts/blog1.md",
        "_includes/**/*.html",
        "_layouts/*.html",
        "*.html"
    ])
    .pipe(coderBlog({env: "dev", logLevel: "debug"}))
    .pipe(gulp.dest("_site"));
});

/**
* Default task
*/
gulp.task("high", function () {

    return gulp.src(["_scss/highlighting/*.css"])
        .pipe(through2.obj(function (file, enc, cb) {

            var filename = path.basename(file.path);
            var prefix   = file.path.replace(filename, "");
            file.path = prefix + "_" + filename.replace(/css$/, "scss");
            this.push(file);
            cb();
        }))
        .pipe(gulp.dest("_scss/highlighting"));
});