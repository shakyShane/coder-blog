/**
 * tfunk for terminal colours
 * @type {compile|exports}
 */
var tfunk    = require("tfunk");

var compiler = new tfunk.Compiler({
    prefix: "[%Cmagenta:CoderBlog%R] ",
    custom: {
        "error": "chalk.bgRed.white",
        "warn": "chalk.red"
    }
});

var logLevel = "warn";

var debugPrefix = tfunk("[%Cmagenta:CoderBlog%R:%Ccyan:DEBUG%R] - ");
var infoPrefix  = tfunk("[%Cmagenta:CoderBlog%R] - ");

//
module.exports = function (level, msg, vars) {

    if ((level === "debug" || level === "warn") && (logLevel === "debug")) {
        console.log(debugPrefix + msg);
    }

    if (level === "info") {
        console.log(infoPrefix + msg);
    }
};

/**
 * @param level
 */
module.exports.setLogLevel = function (level) {
    logLevel = level;
};