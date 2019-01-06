
const colors = require("colors")
const gulp = require("gulp")
const $ = require("gulp-load-plugins")()


const srcPaths = {
	scripts : ["./src/js/*.js", "!./src/js/*.min.js", "./src/js/jupyter.js"],
	styles : ["./src/css/**/*.less", "./src/css/jupyter.less"]
}

const destPaths = {
	script: "./dest/",
	styles: "./dest/"
}

const includeOptions = {
	prefix: "@@",
	basepath: "@file"
}



function scripts() {
	return gulp.src(srcPaths.scripts[2])
		.pipe($.fileInclude(includeOptions))
		.pipe($.uglify())
		.pipe($.rename({suffix: ".min"}))
		.pipe(gulp.dest(destPaths.script))
		.pipe($.size({title: "scripts"}))
}

function styles() {
	return gulp.src(srcPaths.styles[1])
		.pipe($.less())
		.on("error", (err) => {
			$.util.beep()
			console.log(err.toString())
			this.emit("end")
		})
		.pipe($.cleanCss({compatibility: "ie8"}))
		.pipe($.rename({suffix: ".min"}))
		.pipe(gulp.dest(destPaths.styles))
		.pipe($.size({title: "styles"}))
}

function watch() {
	gulp.watch(srcPaths.scripts.slice(0,2), scripts)
	gulp.watch(srcPaths.styles[0], styles)
}

var build = gulp.series(gulp.parallel(scripts, styles))

gulp.task("scripts", scripts)
gulp.task("styles", styles)
gulp.task("watch", watch)
gulp.task("build", build)

